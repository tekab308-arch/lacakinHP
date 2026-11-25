package com.lacakhp.app

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.app.admin.DevicePolicyManager
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.Sensor
import android.hardware.SensorManager
import android.hardware.TriggerEvent
import android.hardware.TriggerEventListener
import android.location.Location
import android.media.Ringtone
import android.media.RingtoneManager
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.os.BatteryManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.os.SystemClock
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.Executors

/**
 * Foreground location service that:
 * 1. Records GPS coordinates into local SQLite while offline.
 * 2. Encrypts (E2EE) and flushes queued coordinates to Nostr relays when online.
 * 3. Triggers a "last-gasp" location sync & SMS alert when battery drops <= 8%.
 * 4. Responds to on-demand SMS commands in the full flavor.
 */
class TrackerService : Service() {

    companion object {
        private const val TAG = "TrackerService"
        private const val CHANNEL_ID = "lacakhp_service_channel"
        private const val NOTIF_ID = 2001
        private const val CHASE_INTERVAL_MS = 2 * 60 * 1000L
        private const val CHASE_MIN_DISTANCE_M = 15f
        private const val TRACKING_INTERVAL_MS = 10 * 60 * 1000L
        private const val STATIONARY_INTERVAL_MS = 30 * 60 * 1000L
        private const val STATIONARY_THRESHOLD_MS = 20 * 60 * 1000L
        private const val STATIONARY_DISTANCE_M = 50f
        private const val HISTORY_MIN_MOVE_M = 30f
        private const val TRACKING_MIN_DISTANCE_M = 100f
        private const val LOW_BATTERY_THRESHOLD_PCT = 8
        private const val HEARTBEAT_REQ_CODE = 2002

        const val ACTION_BROADCAST_STATE = "com.lacakhp.app.TRACKER_UPDATE"
        const val ACTION_HEARTBEAT_ALARM = "com.lacakhp.app.HEARTBEAT_ALARM"
        const val ACTION_LOCATE_FOR_SMS = "com.lacakhp.app.LOCATE_FOR_SMS"
        const val ACTION_STATUS_FOR_SMS = "com.lacakhp.app.STATUS_FOR_SMS"
        const val ACTION_RING_ALARM = "com.lacakhp.app.RING_ALARM"
        const val ACTION_LOCK_SCREEN = "com.lacakhp.app.LOCK_SCREEN"
        const val ACTION_SYNC_NOW = "com.lacakhp.app.SYNC_NOW"
        const val ACTION_SIM_CHANGED = "com.lacakhp.app.SIM_CHANGED"
        const val ACTION_SIMULATE_LAST_GASP = "com.lacakhp.app.SIMULATE_LAST_GASP"
        const val ACTION_ADMIN_TAMPER_ALERT = "com.lacakhp.app.ADMIN_TAMPER_ALERT"
        const val ACTION_SHUTDOWN_ALERT = "com.lacakhp.app.SHUTDOWN_ALERT"
        const val ACTION_INTRUDER_PIN_ALERT = "com.lacakhp.app.INTRUDER_PIN_ALERT"
        const val ACTION_REFRESH_NOTIFICATION = "com.lacakhp.app.REFRESH_NOTIFICATION"
        const val EXTRA_REPLY_TO = "reply_to"
        const val EXTRA_NEW_CARRIER = "new_carrier"
        const val EXTRA_FAILED_ATTEMPTS = "failed_attempts"

        @Volatile
        var isStationaryMode: Boolean = false
        @Volatile
        var isChaseMode: Boolean = false
    }

    private lateinit var dbHelper: LocationDbHelper
    private lateinit var gpsLocator: GpsLocator
    private val ioExecutor = Executors.newSingleThreadExecutor()
    private val mainHandler = Handler(Looper.getMainLooper())

    private var connectivityManager: ConnectivityManager? = null
    private var networkCallback: ConnectivityManager.NetworkCallback? = null
    private var ringtone: Ringtone? = null
    @Volatile
    private var isInitialized = false
    @Volatile
    private var isDestroyed = false
    private var lowBatteryAlertSent = false
    @Volatile
    private var lastShutdownAlertMs: Long = 0L
    private var lastMovedLocation: Location? = null
    private var lastAcceptedLocation: Location? = null
    private var lastHistoryLocation: Location? = null
    private var lastSavedTimeMs: Long = 0L
    private var lastMovedTimeMs: Long = System.currentTimeMillis()
    private var currentIntervalMs: Long = TRACKING_INTERVAL_MS
    private var activeListenerIntervalMs: Long = -1L

    private var sensorManager: SensorManager? = null
    private var significantMotionSensor: Sensor? = null
    private var significantMotionListener: TriggerEventListener? = null
    @Volatile
    private var lastPhysicalMotionMs: Long = System.currentTimeMillis()

    private val sabotageReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            when (intent?.action) {
                Intent.ACTION_SHUTDOWN,
                "android.intent.action.QUICKBOOT_POWEROFF" -> {
                    handleShutdownAlert()
                }
                Intent.ACTION_AIRPLANE_MODE_CHANGED -> {
                    val enabled = intent.getBooleanExtra("state", false)
                    if (enabled) {
                        handleAirplaneModeTurnedOn()
                    }
                }
            }
        }
    }

    private val batteryReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action != Intent.ACTION_BATTERY_CHANGED) return
            val level = intent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1)
            val scale = intent.getIntExtra(BatteryManager.EXTRA_SCALE, -1)
            if (level < 0 || scale <= 0) return
            val pct = level * 100 / scale
            val status = intent.getIntExtra(BatteryManager.EXTRA_STATUS, -1)
            val charging = status == BatteryManager.BATTERY_STATUS_CHARGING ||
                status == BatteryManager.BATTERY_STATUS_FULL

            if (charging || pct > 15) {
                lowBatteryAlertSent = false
                return
            }
            if (pct <= LOW_BATTERY_THRESHOLD_PCT && !lowBatteryAlertSent) {
                lowBatteryAlertSent = true
                handleLowBatteryLastGasp(pct)
            }
        }
    }

    private fun runPeriodicHeartbeat(holdWakeLock: Boolean = false) {
        DeviceOwnerHelper.syncUsbDebuggingLock(applicationContext)
        syncChaseOrNormalInterval()
        val wakeLock = if (holdWakeLock) {
            (getSystemService(Context.POWER_SERVICE) as PowerManager)
                .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "LacakHP:Heartbeat")
                .apply { acquire(15_000L) }
        } else {
            null
        }
        val bestLast = gpsLocator.getBestLastKnownLocation()
        val acceptedBest = bestLast?.takeIf { shouldAcceptLocation(it) }
        val anchor = acceptedBest ?: lastAcceptedLocation
        if (anchor != null) {
            val prevHist = lastHistoryLocation
            val movedEnoughForHistory = prevHist == null || anchor.distanceTo(prevHist) >= HISTORY_MIN_MOVE_M
            lastAcceptedLocation = anchor
            updateAdaptiveInterval(anchor)
            if (movedEnoughForHistory) {
                lastHistoryLocation = anchor
                savePointAndSync(locationToPoint(anchor), wakeLock)
            } else {
                saveHeartbeatOnly(locationToPoint(anchor), wakeLock)
            }
        } else {
            flushOfflineQueueAsync(wakeLock)
        }
        scheduleNextHeartbeatAlarm()
    }

    private fun heartbeatPendingIntent(): PendingIntent {
        val intent = Intent(this, TrackerService::class.java).apply {
            action = ACTION_HEARTBEAT_ALARM
        }
        return PendingIntent.getForegroundService(
            applicationContext,
            HEARTBEAT_REQ_CODE,
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
    }

    private fun scheduleNextHeartbeatAlarm() {
        if (isDestroyed) return
        val am = getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
        val triggerAt = SystemClock.elapsedRealtime() + currentIntervalMs
        try {
            am.setAndAllowWhileIdle(
                AlarmManager.ELAPSED_REALTIME_WAKEUP,
                triggerAt,
                heartbeatPendingIntent()
            )
        } catch (e: Exception) {
            Log.w(TAG, "Failed scheduling Doze heartbeat alarm: ${e.message}")
        }
    }

    private fun cancelHeartbeatAlarm() {
        val am = getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
        try {
            am.cancel(heartbeatPendingIntent())
        } catch (_: Exception) {}
    }

    override fun onCreate() {
        super.onCreate()
        dbHelper = LocationDbHelper(applicationContext)
        gpsLocator = GpsLocator(applicationContext)

        if (!gpsLocator.hasLocationPermission()) {
            Log.w(TAG, "Location permission not yet granted; skipping foreground start")
            stopSelf()
            return
        }

        TrackerPrefs.getLastLocation(applicationContext)
            ?.takeIf { it.accuracy in 1f..100f }
            ?.let { saved ->
                val loc = Location(saved.provider).apply {
                    latitude = saved.latitude
                    longitude = saved.longitude
                    accuracy = saved.accuracy
                    time = saved.timestamp
                }
                lastAcceptedLocation = loc
                lastMovedLocation = loc
                lastHistoryLocation = loc
            }

        createNotificationChannel()
        try {
            startForeground(NOTIF_ID, buildNotification(defaultModeNotificationText()))
        } catch (e: SecurityException) {
            Log.e(TAG, "SecurityException starting location foreground service: ${e.message}")
            stopSelf()
            return
        }
        isInitialized = true

        startGpsListener()
        registerSignificantMotionWatcher()
        registerNetworkWatcher()
        ContextCompat.registerReceiver(
            this,
            batteryReceiver,
            IntentFilter(Intent.ACTION_BATTERY_CHANGED),
            ContextCompat.RECEIVER_NOT_EXPORTED
        )
        val sabotageFilter = IntentFilter().apply {
            addAction(Intent.ACTION_SHUTDOWN)
            addAction("android.intent.action.QUICKBOOT_POWEROFF")
            addAction(Intent.ACTION_AIRPLANE_MODE_CHANGED)
        }
        ContextCompat.registerReceiver(
            this,
            sabotageReceiver,
            sabotageFilter,
            ContextCompat.RECEIVER_NOT_EXPORTED
        )
        runPeriodicHeartbeat(holdWakeLock = false)
        broadcastState()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (!isInitialized || isDestroyed) {
            Log.w(TAG, "TrackerService not initialized; ignoring command ${intent?.action}")
            stopSelf()
            return START_NOT_STICKY
        }
        when (intent?.action) {
            ACTION_LOCATE_FOR_SMS -> {
                val replyTo = intent.getStringExtra(EXTRA_REPLY_TO)
                if (!replyTo.isNullOrBlank()) {
                    handleSmsLocate(replyTo)
                }
            }
            ACTION_STATUS_FOR_SMS -> {
                val replyTo = intent.getStringExtra(EXTRA_REPLY_TO)
                if (!replyTo.isNullOrBlank()) {
                    handleSmsStatus(replyTo)
                }
            }
            ACTION_RING_ALARM -> {
                val replyTo = intent.getStringExtra(EXTRA_REPLY_TO)
                handleRingAlarm(replyTo)
            }
            ACTION_LOCK_SCREEN -> {
                val replyTo = intent.getStringExtra(EXTRA_REPLY_TO)
                handleLockScreen(replyTo)
            }
            ACTION_SYNC_NOW -> {
                handleManualSync()
            }
            ACTION_SIM_CHANGED -> {
                val carrier = intent?.getStringExtra(EXTRA_NEW_CARRIER).orEmpty().ifEmpty { "SIM Baru" }
                handleSimChanged(carrier)
            }
            ACTION_SIMULATE_LAST_GASP -> {
                handleLowBatteryLastGasp(7)
            }
            ACTION_ADMIN_TAMPER_ALERT -> {
                handleAdminTamperAlert()
            }
            ACTION_SHUTDOWN_ALERT -> {
                handleShutdownAlert()
            }
            ACTION_INTRUDER_PIN_ALERT -> {
                val attempts = intent.getIntExtra(EXTRA_FAILED_ATTEMPTS, 3)
                handleIntruderPinAlert(attempts)
            }
            ACTION_REFRESH_NOTIFICATION -> {
                updateNotification(defaultModeNotificationText())
            }
            ACTION_HEARTBEAT_ALARM -> {
                runPeriodicHeartbeat(holdWakeLock = true)
            }
            else -> {
                startGpsListener()
                scheduleNextHeartbeatAlarm()
                flushOfflineQueueAsync()
                broadcastState()
            }
        }
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        isDestroyed = true
        cancelHeartbeatAlarm()
        mainHandler.removeCallbacksAndMessages(null)
        gpsLocator.stopPeriodicUpdates()
        activeListenerIntervalMs = -1L
        significantMotionListener?.let { listener ->
            significantMotionSensor?.let { sensor ->
                try {
                    sensorManager?.cancelTriggerSensor(listener, sensor)
                } catch (_: Exception) {}
            }
        }
        stopRing()
        try {
            unregisterReceiver(batteryReceiver)
        } catch (_: Exception) {}
        try {
            unregisterReceiver(sabotageReceiver)
        } catch (_: Exception) {}
        networkCallback?.let {
            try {
                connectivityManager?.unregisterNetworkCallback(it)
            } catch (_: Exception) {}
        }
        ioExecutor.shutdownNow()
        super.onDestroy()
    }

    private fun startGpsListener() {
        val desiredMinDist = if (isChaseMode) CHASE_MIN_DISTANCE_M else TRACKING_MIN_DISTANCE_M
        if (activeListenerIntervalMs == currentIntervalMs && gpsLocator.isPeriodicRunning()) {
            return
        }
        activeListenerIntervalMs = currentIntervalMs
        gpsLocator.startPeriodicUpdates(
            minTimeMs = currentIntervalMs,
            minDistanceM = desiredMinDist
        ) { location ->
            recordLocation(location)
        }
    }

    private fun registerSignificantMotionWatcher() {
        val sm = getSystemService(Context.SENSOR_SERVICE) as? SensorManager ?: return
        val sensor = sm.getDefaultSensor(Sensor.TYPE_SIGNIFICANT_MOTION) ?: return
        sensorManager = sm
        significantMotionSensor = sensor
        val listener = object : TriggerEventListener() {
            override fun onTrigger(event: TriggerEvent?) {
                lastPhysicalMotionMs = System.currentTimeMillis()
                if (!isDestroyed) {
                    try {
                        sm.requestTriggerSensor(this, sensor)
                    } catch (_: Exception) {}
                }
            }
        }
        significantMotionListener = listener
        try {
            sm.requestTriggerSensor(listener, sensor)
        } catch (e: Exception) {
            Log.w(TAG, "Failed registering significant motion sensor: ${e.message}")
        }
    }

    private fun isConnectedToMobileHotspot(): Boolean {
        val cm = connectivityManager ?: (getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager)
            ?: return false
        val caps = cm.getNetworkCapabilities(cm.activeNetwork ?: return false) ?: return false
        return caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) &&
            !caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED)
    }

    private fun registerNetworkWatcher() {
        connectivityManager = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val callback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                Log.d(TAG, "Network available; flushing encrypted GPS queue to Nostr relays")
                flushOfflineQueueAsync()
                broadcastState()
            }

            override fun onLost(network: Network) {
                broadcastState()
            }
        }
        networkCallback = callback
        try {
            connectivityManager?.registerDefaultNetworkCallback(callback)
        } catch (e: Exception) {
            Log.w(TAG, "Failed registering network callback: ${e.message}")
        }
    }

    private fun handleLowBatteryLastGasp(batteryPct: Int) {
        Log.w(TAG, "Low battery ($batteryPct%) detected; firing last-gasp location sync")
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        val wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "LacakHP:LastGasp")
        wakeLock.acquire(25_000L)
        gpsLocator.requestAccurateLocation(batteryPct = batteryPct, timeoutMs = 15_000L) { result ->
            try {
                val point = result.point
                if (point != null) {
                    savePointAndSync(point)
                    VariantSmsBridge.sendLowBatteryAlert(applicationContext, point, batteryPct)
                }
            } finally {
                if (wakeLock.isHeld) wakeLock.release()
            }
        }
    }

    private fun handleManualSync() {
        val battery = getBatteryPercentage()
        updateNotification("Mengambil GPS & enkripsi ke relay...")
        gpsLocator.requestAccurateLocation(batteryPct = battery, timeoutMs = 20_000L) { result ->
            val pt = result.point
            if (pt != null) {
                savePointAndSync(pt)
            } else {
                flushOfflineQueueAsync()
            }
            updateNotification(defaultModeNotificationText())
        }
    }

    private fun handleSmsLocate(replyTo: String) {
        if (!VariantSmsBridge.hasSmsSupport) return
        DeviceOwnerHelper.enforceEmergencyLockdown(applicationContext)
        syncChaseOrNormalInterval()

        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        val wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "LacakHP:SmsLocate")
        wakeLock.acquire(35_000L)

        val battery = getBatteryPercentage()
        updateNotification("Mengunci GPS untuk balas SMS...")

        gpsLocator.requestAccurateLocation(
            batteryPct = battery,
            timeoutMs = 25_000L,
            targetAccuracyMeters = 20f
        ) { result ->
            try {
                val point = result.point
                if (point != null) {
                    if (!result.isCachedFallback) {
                        savePointAndSync(point)
                    }
                    VariantSmsBridge.sendLocationReply(
                        context = applicationContext,
                        destination = replyTo,
                        point = point,
                        battery = battery,
                        isCachedFallback = result.isCachedFallback
                    )
                } else {
                    val gpsState = if (gpsLocator.isGpsEnabled()) "AKTIF" else "MATI"
                    VariantSmsBridge.sendPlainSms(
                        applicationContext,
                        replyTo,
                        "[LacakHP] Belum ada titik GPS tersimpan. Status GPS HP: $gpsState. Baterai: $battery%."
                    )
                }
            } finally {
                updateNotification(defaultModeNotificationText())
                if (wakeLock.isHeld) {
                    wakeLock.release()
                }
            }
        }
    }

    private fun handleSmsStatus(replyTo: String) {
        if (!VariantSmsBridge.hasSmsSupport) return

        runIoSafe {
            val battery = getBatteryPercentage()
            val online = NostrRelayClient.isNetworkOnline(applicationContext)
            val gpsOn = gpsLocator.isGpsEnabled()
            val unsynced = dbHelper.countUnsynced()
            val last = TrackerPrefs.getLastLocation(applicationContext)

            val lastStr = if (last != null) {
                val t = SimpleDateFormat("dd/MM HH:mm", Locale.getDefault()).format(Date(last.timestamp))
                "${String.format(Locale.US, "%.5f,%.5f", last.latitude, last.longitude)} ($t)"
            } else {
                "belum ada"
            }

            val msg = "[LacakHP STATUS]\n" +
                "Baterai: $battery%\n" +
                "GPS: ${if (gpsOn) "NYALA" else "MATI"}\n" +
                "Data Internet: ${if (online) "ONLINE" else "OFFLINE"}\n" +
                "Antrean Offline: $unsynced titik\n" +
                "Lokasi terakhir: $lastStr"
            VariantSmsBridge.sendPlainSms(applicationContext, replyTo, msg)
        }
    }

    private fun handleRingAlarm(replyTo: String?) {
        mainHandler.post {
            try {
                stopRing()
                val alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                    ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
                ringtone = RingtoneManager.getRingtone(applicationContext, alarmUri)
                ringtone?.play()
                mainHandler.postDelayed({ stopRing() }, 10_000L)
                if (!replyTo.isNullOrBlank() && VariantSmsBridge.hasSmsSupport) {
                    VariantSmsBridge.sendPlainSms(
                        applicationContext,
                        replyTo,
                        "[LacakHP] Alarm HP dibunyikan 10 detik."
                    )
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error ringing alarm", e)
            }
        }
    }

    private fun stopRing() {
        try {
            if (ringtone?.isPlaying == true) {
                ringtone?.stop()
            }
        } catch (_: Exception) {}
    }

    private fun handleSimChanged(carrier: String) {
        DeviceOwnerHelper.enforceEmergencyLockdown(applicationContext)
        syncChaseOrNormalInterval()
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        val wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "LacakHP:SimChange")
        wakeLock.acquire(35_000L)

        val battery = getBatteryPercentage()
        updateNotification("Peringatan: Kartu SIM baru ($carrier) terdeteksi!")

        gpsLocator.requestAccurateLocation(
            batteryPct = battery,
            timeoutMs = 25_000L,
            targetAccuracyMeters = 20f
        ) { result ->
            try {
                val point = result.point ?: lastAcceptedLocation?.let { loc ->
                    LocationPoint(
                        latitude = loc.latitude,
                        longitude = loc.longitude,
                        accuracy = loc.accuracy,
                        provider = "${loc.provider}_cached",
                        battery = battery,
                        timestamp = loc.time
                    )
                } ?: TrackerPrefs.getLastLocation(applicationContext)

                if (point != null) {
                    savePointAndSync(point)
                    val sent = VariantSmsBridge.sendSimChangeAlert(
                        context = applicationContext,
                        carrier = carrier,
                        point = point,
                        battery = battery
                    )
                    if (sent) {
                        TrackerPrefs.setSimAlertSent(applicationContext, true)
                    }
                } else {
                    val firstTrusted = TrackerPrefs.getFirstTrustedNumber(applicationContext)
                    if (!firstTrusted.isNullOrBlank()) {
                        val alertMsg = "[LacakHP PERINGATAN] Kartu SIM baru ($carrier) terdeteksi di HP Anda! Sinyal GPS satelit sedang dicari. Baterai: $battery%."
                        val sent = VariantSmsBridge.sendPlainSms(applicationContext, firstTrusted, alertMsg)
                        if (sent) {
                            TrackerPrefs.setSimAlertSent(applicationContext, true)
                        }
                    }
                }
            } finally {
                updateNotification(defaultModeNotificationText())
                if (wakeLock.isHeld) {
                    wakeLock.release()
                }
            }
        }
    }

    private fun handleAdminTamperAlert() {
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        val wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "LacakHP:AdminTamper")
        wakeLock.acquire(20_000L)

        val battery = getBatteryPercentage()
        updateNotification("Peringatan: Percobaan lepas kunci Anti-Uninstall!")

        val quickPoint = gpsLocator.getBestLastKnownLocation()?.let { locationToPoint(it, battery) }
            ?: TrackerPrefs.getLastLocation(applicationContext)

        if (quickPoint != null) {
            savePointAndSync(quickPoint)
            VariantSmsBridge.sendAdminTamperAlert(applicationContext, quickPoint, battery)
        }

        val needsFreshFix = quickPoint == null || (System.currentTimeMillis() - quickPoint.timestamp > 60_000L)
        if (!needsFreshFix) {
            updateNotification(defaultModeNotificationText())
            if (wakeLock.isHeld) wakeLock.release()
            return
        }

        gpsLocator.requestAccurateLocation(
            batteryPct = battery,
            timeoutMs = 6_000L,
            targetAccuracyMeters = 35f
        ) { result ->
            try {
                val fresh = result.point
                if (fresh != null) {
                    savePointAndSync(fresh)
                }
                if (quickPoint == null) {
                    VariantSmsBridge.sendAdminTamperAlert(applicationContext, fresh, battery)
                }
            } finally {
                updateNotification(defaultModeNotificationText())
                if (wakeLock.isHeld) {
                    wakeLock.release()
                }
            }
        }
    }

    private fun handleShutdownAlert() {
        val now = System.currentTimeMillis()
        if (now - lastShutdownAlertMs < 15_000L) return
        lastShutdownAlertMs = now

        val battery = getBatteryPercentage()
        val quickPoint = gpsLocator.getBestLastKnownLocation()?.let { locationToPoint(it, battery) }
            ?: TrackerPrefs.getLastLocation(applicationContext)?.copy(
                battery = battery,
                timestamp = now
            )

        if (quickPoint != null) {
            TrackerPrefs.saveLastLocation(applicationContext, quickPoint)
            VariantSmsBridge.sendShutdownAlert(applicationContext, quickPoint, battery)
            runIoSafe {
                dbHelper.insertPoint(quickPoint)
                NostrRelayClient.flushQueue(applicationContext, dbHelper, battery)
            }
        } else {
            VariantSmsBridge.sendShutdownAlert(applicationContext, null, battery)
        }
    }

    private fun handleAirplaneModeTurnedOn() {
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        val wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "LacakHP:AirplaneMode")
        wakeLock.acquire(25_000L)

        val battery = getBatteryPercentage()
        val quickPoint = gpsLocator.getBestLastKnownLocation()?.let { locationToPoint(it, battery) }
            ?: TrackerPrefs.getLastLocation(applicationContext)?.copy(
                battery = battery,
                timestamp = System.currentTimeMillis()
            )

        if (quickPoint != null) {
            savePointAndSync(quickPoint)
            VariantSmsBridge.sendAirplaneModeAlert(applicationContext, quickPoint, battery)
        }

        // GPS satellite chip continues working in Airplane Mode; record an accurate fix into SQLite black-box queue.
        gpsLocator.requestAccurateLocation(
            batteryPct = battery,
            timeoutMs = 15_000L,
            targetAccuracyMeters = 20f
        ) { result ->
            try {
                result.point?.let { savePointAndSync(it) }
            } finally {
                if (wakeLock.isHeld) wakeLock.release()
            }
        }
    }

    private fun handleLockScreen(replyTo: String?) {
        DeviceOwnerHelper.enforceEmergencyLockdown(applicationContext)
        syncChaseOrNormalInterval()
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        val wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "LacakHP:LockScreen")
        wakeLock.acquire(20_000L)

        val dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val adminComponent = ComponentName(this, TrackerAdminReceiver::class.java)
        val locked = if (dpm.isAdminActive(adminComponent)) {
            try {
                dpm.lockNow()
                true
            } catch (e: Exception) {
                Log.w(TAG, "Failed locking screen via DeviceAdmin: ${e.message}")
                false
            }
        } else {
            false
        }

        val battery = getBatteryPercentage()
        val quickPoint = gpsLocator.getBestLastKnownLocation()?.let { locationToPoint(it, battery) }
            ?: TrackerPrefs.getLastLocation(applicationContext)?.copy(
                battery = battery,
                timestamp = System.currentTimeMillis()
            )

        if (quickPoint != null) {
            savePointAndSync(quickPoint)
            if (!replyTo.isNullOrBlank()) {
                VariantSmsBridge.sendLockScreenReply(applicationContext, replyTo, locked, quickPoint, battery)
            }
            if (wakeLock.isHeld) wakeLock.release()
            return
        }

        gpsLocator.requestAccurateLocation(
            batteryPct = battery,
            timeoutMs = 10_000L,
            targetAccuracyMeters = 30f
        ) { result ->
            try {
                val pt = result.point
                if (pt != null) {
                    savePointAndSync(pt)
                }
                if (!replyTo.isNullOrBlank()) {
                    VariantSmsBridge.sendLockScreenReply(applicationContext, replyTo, locked, pt, battery)
                }
            } finally {
                if (wakeLock.isHeld) wakeLock.release()
            }
        }
    }

    private fun handleIntruderPinAlert(attempts: Int) {
        DeviceOwnerHelper.enforceEmergencyLockdown(applicationContext)
        syncChaseOrNormalInterval()
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        val wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "LacakHP:IntruderPin")
        wakeLock.acquire(20_000L)

        val battery = getBatteryPercentage()
        val quickPoint = gpsLocator.getBestLastKnownLocation()?.let { locationToPoint(it, battery) }
            ?: TrackerPrefs.getLastLocation(applicationContext)?.copy(
                battery = battery,
                timestamp = System.currentTimeMillis()
            )

        if (quickPoint != null) {
            // Silent Nostr upload on >= 3 failed PIN attempts; SMS alert only at 5 failed attempts
            savePointAndSync(quickPoint)
            if (attempts == 5) {
                VariantSmsBridge.sendIntruderPinAlert(applicationContext, quickPoint, battery, attempts)
            }
        }

        gpsLocator.requestAccurateLocation(
            batteryPct = battery,
            timeoutMs = 10_000L,
            targetAccuracyMeters = 25f
        ) { result ->
            try {
                val fresh = result.point
                if (fresh != null) {
                    savePointAndSync(fresh)
                }
                if (quickPoint == null && attempts == 5) {
                    VariantSmsBridge.sendIntruderPinAlert(applicationContext, fresh, battery, attempts)
                }
            } finally {
                if (wakeLock.isHeld) wakeLock.release()
            }
        }
    }

    private fun locationToPoint(
        location: Location,
        battery: Int = getBatteryPercentage()
    ): LocationPoint {
        val now = System.currentTimeMillis()
        val locTime = location.time
        // When reporting an active heartbeat from a stationary/cached fix, stamp with current report time
        val effectiveTime = if (locTime in 1..now && (now - locTime) <= 60_000L) locTime else now
        return LocationPoint(
            latitude = location.latitude,
            longitude = location.longitude,
            accuracy = location.accuracy,
            provider = location.provider ?: "gps",
            battery = battery,
            timestamp = effectiveTime
        )
    }

    private fun recordLocation(location: Location) {
        val now = System.currentTimeMillis()
        val prev = lastAcceptedLocation
        if (prev != null && prev.distanceTo(location) < 10f && (now - lastSavedTimeMs) < 30_000L) {
            return
        }
        if (!shouldAcceptLocation(location)) {
            Log.d(
                TAG,
                "Ignored noisy fix: ${location.provider} acc=${location.accuracy}m (${location.latitude},${location.longitude})"
            )
            return
        }
        lastAcceptedLocation = location
        updateAdaptiveInterval(location)
        val prevHist = lastHistoryLocation
        if (prevHist == null || location.distanceTo(prevHist) >= HISTORY_MIN_MOVE_M) {
            lastHistoryLocation = location
            savePointAndSync(locationToPoint(location))
        } else {
            saveHeartbeatOnly(locationToPoint(location))
        }
    }

    private fun shouldAcceptLocation(candidate: Location): Boolean {
        val anchor = lastAcceptedLocation
        return shouldAcceptLocationCandidate(
            candLat = candidate.latitude,
            candLng = candidate.longitude,
            candAcc = if (candidate.hasAccuracy()) candidate.accuracy else -1f,
            candProvider = candidate.provider ?: "gps",
            candTimeMs = candidate.time,
            anchorLat = anchor?.latitude,
            anchorLng = anchor?.longitude,
            anchorAcc = anchor?.accuracy ?: 0f,
            anchorTimeMs = anchor?.time ?: 0L,
            nowMs = System.currentTimeMillis(),
            hasMotionSensor = significantMotionSensor != null,
            lastMotionMs = lastPhysicalMotionMs,
            isMeteredWifi = isConnectedToMobileHotspot()
        )
    }

    private fun shouldUseChaseMode(): Boolean {
        val battery = getBatteryPercentage()
        if (battery in 1..15) return false
        return TrackerPrefs.isChaseModeActive(applicationContext)
    }

    private fun syncChaseOrNormalInterval() {
        val chase = shouldUseChaseMode()
        if (chase && currentIntervalMs != CHASE_INTERVAL_MS) {
            currentIntervalMs = CHASE_INTERVAL_MS
            isChaseMode = true
            isStationaryMode = false
            updateNotification(defaultModeNotificationText())
            startGpsListener()
            scheduleNextHeartbeatAlarm()
            broadcastState()
        } else if (!chase && isChaseMode) {
            isChaseMode = false
            currentIntervalMs = TRACKING_INTERVAL_MS
            updateNotification(defaultModeNotificationText())
            startGpsListener()
            scheduleNextHeartbeatAlarm()
            broadcastState()
        }
    }

    private fun defaultModeNotificationText(): String {
        return when {
            isChaseMode -> "Mode Kejar Darurat Aktif (Interval 2 mnt)"
            isStationaryMode -> "E2EE Hemat Baterai (HP Diam • 30 mnt)"
            else -> "E2EE Multi-Relay Aktif (Interval 10 mnt)"
        }
    }

    private fun updateAdaptiveInterval(location: Location) {
        if (shouldUseChaseMode()) {
            syncChaseOrNormalInterval()
            return
        }
        if (isChaseMode) {
            isChaseMode = false
            currentIntervalMs = TRACKING_INTERVAL_MS
        }
        val now = System.currentTimeMillis()
        val prev = lastMovedLocation
        if (prev == null || location.distanceTo(prev) > STATIONARY_DISTANCE_M) {
            lastMovedLocation = location
            lastMovedTimeMs = now
            if (currentIntervalMs != TRACKING_INTERVAL_MS) {
                currentIntervalMs = TRACKING_INTERVAL_MS
                isStationaryMode = false
                updateNotification("E2EE Multi-Relay Aktif (Interval 10 mnt)")
                startGpsListener()
                scheduleNextHeartbeatAlarm()
                broadcastState()
            }
        } else if (now - lastMovedTimeMs >= STATIONARY_THRESHOLD_MS &&
            currentIntervalMs != STATIONARY_INTERVAL_MS
        ) {
            currentIntervalMs = STATIONARY_INTERVAL_MS
            isStationaryMode = true
            updateNotification("E2EE Hemat Baterai (HP Diam • 30 mnt)")
            startGpsListener()
            scheduleNextHeartbeatAlarm()
            broadcastState()
        }
    }

    private fun runIoSafe(
        wakeLock: PowerManager.WakeLock? = null,
        block: () -> Unit
    ) {
        if (isDestroyed || ioExecutor.isShutdown) {
            if (wakeLock?.isHeld == true) {
                try {
                    wakeLock.release()
                } catch (_: Exception) {}
            }
            return
        }
        try {
            ioExecutor.execute {
                try {
                    block()
                } catch (e: Exception) {
                    Log.w(TAG, "Background IO task error: ${e.message}")
                } finally {
                    if (wakeLock?.isHeld == true) {
                        try {
                            wakeLock.release()
                        } catch (_: Exception) {}
                    }
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Rejected IO task (service shutting down): ${e.message}")
            if (wakeLock?.isHeld == true) {
                try {
                    wakeLock.release()
                } catch (_: Exception) {}
            }
        }
    }

    private fun savePointAndSync(
        point: LocationPoint,
        wakeLock: PowerManager.WakeLock? = null
    ) {
        lastSavedTimeMs = System.currentTimeMillis()
        TrackerPrefs.saveLastLocation(applicationContext, point)
        runIoSafe(wakeLock) {
            dbHelper.insertPoint(point)
            NostrRelayClient.flushQueue(applicationContext, dbHelper, getBatteryPercentage())
            broadcastState()
        }
    }

    private fun saveHeartbeatOnly(
        point: LocationPoint,
        wakeLock: PowerManager.WakeLock? = null
    ) {
        lastSavedTimeMs = System.currentTimeMillis()
        TrackerPrefs.saveLastLocation(applicationContext, point)
        runIoSafe(wakeLock) {
            val battery = getBatteryPercentage()
            if (dbHelper.countUnsynced() > 0) {
                NostrRelayClient.flushQueue(applicationContext, dbHelper, battery)
            }
            NostrRelayClient.publishLatestHeartbeat(applicationContext, point, battery)
            broadcastState()
        }
    }

    private fun flushOfflineQueueAsync(wakeLock: PowerManager.WakeLock? = null) {
        runIoSafe(wakeLock) {
            NostrRelayClient.flushQueue(applicationContext, dbHelper, getBatteryPercentage())
            broadcastState()
        }
    }

    private fun getBatteryPercentage(): Int {
        val status = registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
        val level = status?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
        val scale = status?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
        return if (level >= 0 && scale > 0) (level * 100 / scale) else -1
    }

    private fun broadcastState() {
        val intent = Intent(ACTION_BROADCAST_STATE).apply {
            setPackage(packageName)
        }
        sendBroadcast(intent)
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Layanan Pelacakan LacakHP",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Menjaga pelacakan E2EE & siaga darurat tetap aktif"
                setShowBadge(false)
            }
            nm.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(text: String): Notification {
        val stealth = TrackerPrefs.isStealthMode(applicationContext)
        return if (stealth) {
            NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Layanan Sinkronisasi Sistem")
                .setContentText("Sinkronisasi perangkat & baterai berjalan normal")
                .setSmallIcon(android.R.drawable.ic_popup_sync)
                .setOngoing(true)
                .setVisibility(NotificationCompat.VISIBILITY_SECRET)
                .setPriority(NotificationCompat.PRIORITY_MIN)
                .build()
        } else {
            NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("LacakHP Aktif (E2EE)")
                .setContentText(text)
                .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                .setOngoing(true)
                .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build()
        }
    }

    private fun updateNotification(text: String) {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.notify(NOTIF_ID, buildNotification(text))
    }
}
