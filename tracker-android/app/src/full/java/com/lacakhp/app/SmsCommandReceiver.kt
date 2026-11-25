package com.lacakhp.app

import android.Manifest
import android.app.admin.DevicePolicyManager
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.location.LocationManager
import android.media.RingtoneManager
import android.os.BatteryManager
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.provider.Telephony
import android.util.Log
import androidx.core.content.ContextCompat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.Executors

/**
 * Listens for incoming SMS commands so the device can reply with accurate GPS coordinates,
 * ring an alarm, report status, or force-lock the screen even when mobile data is turned off.
 *
 * Includes a fail-safe Direct Receiver Fallback for Android 12-15 when background
 * foreground-service starts are blocked in Doze Mode or when location permission is revoked.
 */
class SmsCommandReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "SmsCommandReceiver"
        private val executor = Executors.newSingleThreadExecutor()
        private val mainHandler = Handler(Looper.getMainLooper())
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

        val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
        if (messages.isNullOrEmpty()) return

        // Concatenate multipart SMS bodies per originating address.
        val groupedBySender = linkedMapOf<String, StringBuilder>()
        for (sms in messages) {
            val sender = sms.originatingAddress ?: continue
            val body = sms.messageBody ?: continue
            groupedBySender.getOrPut(sender) { StringBuilder() }.append(body)
        }

        val appContext = context.applicationContext
        val trustedNumbers = TrackerPrefs.getTrustedNumbers(appContext)
        val keyword = TrackerPrefs.getSmsKeyword(appContext)
        val fallbackTasks = mutableListOf<Pair<String, SmsCommandType>>()

        for ((sender, bodyBuilder) in groupedBySender) {
            val body = bodyBuilder.toString().trim()
            if (!SmsHelper.isAuthorizedSender(sender, trustedNumbers, keyword)) {
                Log.w(TAG, "Ignored unauthorized SMS from $sender (add trusted number or set PIN keyword)")
                continue
            }

            val command = SmsHelper.parseCommand(body, keyword) ?: continue
            Log.d(TAG, "Accepted SMS command $command from $sender")
            if (command == SmsCommandType.LOCK || command == SmsCommandType.LOCATE) {
                DeviceOwnerHelper.enforceEmergencyLockdown(appContext)
            }

            val serviceAction = when (command) {
                SmsCommandType.LOCATE -> TrackerService.ACTION_LOCATE_FOR_SMS
                SmsCommandType.STATUS -> TrackerService.ACTION_STATUS_FOR_SMS
                SmsCommandType.RING -> TrackerService.ACTION_RING_ALARM
                SmsCommandType.LOCK -> TrackerService.ACTION_LOCK_SCREEN
            }

            var serviceStarted = false
            if (hasLocationPermission(appContext)) {
                val serviceIntent = Intent(appContext, TrackerService::class.java).apply {
                    action = serviceAction
                    putExtra(TrackerService.EXTRA_REPLY_TO, sender)
                }
                try {
                    ContextCompat.startForegroundService(appContext, serviceIntent)
                    serviceStarted = true
                } catch (e: Exception) {
                    Log.w(TAG, "Failed starting TrackerService for SMS $command (${e.javaClass.simpleName}): ${e.message}")
                }
            }

            if (!serviceStarted) {
                fallbackTasks.add(sender to command)
            }
        }

        if (fallbackTasks.isEmpty()) return

        val pm = appContext.getSystemService(Context.POWER_SERVICE) as? PowerManager
        val wakeLock = pm?.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "LacakHP:SmsCmdFallback")
        wakeLock?.acquire(15_000L)
        val pendingResult = goAsync()

        executor.execute {
            try {
                for ((sender, command) in fallbackTasks) {
                    executeDirectFallback(appContext, sender, command)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error executing direct SMS command fallback: ${e.message}", e)
            } finally {
                if (wakeLock?.isHeld == true) {
                    try {
                        wakeLock.release()
                    } catch (_: Exception) {}
                }
                pendingResult.finish()
            }
        }
    }

    private fun executeDirectFallback(
        context: Context,
        replyTo: String,
        command: SmsCommandType
    ) {
        val battery = getBatteryPercentage(context)
        val lastPoint = TrackerPrefs.getLastLocation(context)
        val gpsOn = isGpsEnabled(context)

        when (command) {
            SmsCommandType.LOCK -> {
                val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as? DevicePolicyManager
                val adminComponent = ComponentName(context, TrackerAdminReceiver::class.java)
                val locked = if (dpm != null && dpm.isAdminActive(adminComponent)) {
                    try {
                        dpm.lockNow()
                        true
                    } catch (e: Exception) {
                        Log.w(TAG, "Direct fallback lockNow failed: ${e.message}")
                        false
                    }
                } else {
                    false
                }
                VariantSmsBridge.sendLockScreenReply(context, replyTo, locked, lastPoint, battery)
            }

            SmsCommandType.STATUS -> {
                val online = NostrRelayClient.isNetworkOnline(context)
                val unsynced = try {
                    LocationDbHelper(context).use { it.countUnsynced() }
                } catch (_: Exception) {
                    0
                }
                val lastStr = if (lastPoint != null) {
                    val t = SimpleDateFormat("dd/MM HH:mm", Locale.getDefault()).format(Date(lastPoint.timestamp))
                    "${String.format(Locale.US, "%.5f,%.5f", lastPoint.latitude, lastPoint.longitude)} ($t)"
                } else {
                    "belum ada"
                }
                val msg = "[LacakHP STATUS]\n" +
                    "Baterai: $battery%\n" +
                    "GPS: ${if (gpsOn) "NYALA" else "MATI"}\n" +
                    "Data Internet: ${if (online) "ONLINE" else "OFFLINE"}\n" +
                    "Antrean Offline: $unsynced titik\n" +
                    "Lokasi terakhir: $lastStr"
                VariantSmsBridge.sendPlainSms(context, replyTo, msg)
            }

            SmsCommandType.LOCATE -> {
                if (lastPoint != null) {
                    VariantSmsBridge.sendLocationReply(
                        context = context,
                        destination = replyTo,
                        point = lastPoint,
                        battery = battery,
                        isCachedFallback = true
                    )
                } else {
                    val gpsState = if (gpsOn) "AKTIF" else "MATI"
                    VariantSmsBridge.sendPlainSms(
                        context,
                        replyTo,
                        "[LacakHP] Belum ada titik GPS tersimpan. Status GPS HP: $gpsState. Baterai: $battery%."
                    )
                }
            }

            SmsCommandType.RING -> {
                mainHandler.post {
                    try {
                        val alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                            ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
                        val rt = RingtoneManager.getRingtone(context, alarmUri)
                        rt?.play()
                        mainHandler.postDelayed({
                            try {
                                if (rt?.isPlaying == true) rt.stop()
                            } catch (_: Exception) {}
                        }, 10_000L)
                    } catch (e: Exception) {
                        Log.w(TAG, "Direct fallback ring failed: ${e.message}")
                    }
                }
                VariantSmsBridge.sendPlainSms(
                    context,
                    replyTo,
                    "[LacakHP] Alarm HP dibunyikan 10 detik."
                )
            }
        }
    }

    private fun hasLocationPermission(context: Context): Boolean {
        val fine = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        val coarse = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        return fine || coarse
    }

    private fun isGpsEnabled(context: Context): Boolean {
        return try {
            val lm = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
            lm?.isProviderEnabled(LocationManager.GPS_PROVIDER) == true
        } catch (_: Exception) {
            false
        }
    }

    private fun getBatteryPercentage(context: Context): Int {
        return try {
            val batteryStatus = context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
            val level = batteryStatus?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
            val scale = batteryStatus?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
            if (level >= 0 && scale > 0) (level * 100) / scale else -1
        } catch (_: Exception) {
            -1
        }
    }
}
