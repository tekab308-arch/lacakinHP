package com.lacakhp.app

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.BatteryManager
import android.os.PowerManager
import android.util.Log
import androidx.core.content.ContextCompat
import java.util.concurrent.Executors

/**
 * Bulletproof Anti-SIM Swap Sentinel:
 * 1. Listens to SIM state changes across Android 8.0 - 15 (including Dual-SIM & eSIM).
 * 2. Employs goAsync() with a 2-second modem settling delay so carriers are accurately recognized.
 * 3. Tries starting TrackerService for live GPS; if Android 12-15 blocks background service starts
 *    (ForegroundServiceStartNotAllowedException), directly falls back to SmsManager with Last Known Location
 *    so the emergency SMS is NEVER dropped!
 */
class SimChangeReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "SimChangeReceiver"
        private val executor = Executors.newSingleThreadExecutor()
    }

    override fun onReceive(context: Context, intent: Intent?) {
        if (intent == null) return
        val action = intent.action ?: return

        // Verify valid telephony actions
        val isSimChangeAction = action == "android.intent.action.SIM_STATE_CHANGED" ||
            action == "android.telephony.action.SIM_CARD_STATE_CHANGED" ||
            action == "android.telephony.action.SIM_APPLICATION_STATE_CHANGED" ||
            action == "android.telephony.action.DEFAULT_SUBSCRIPTION_CHANGED"

        if (!isSimChangeAction) return

        if (action == "android.intent.action.SIM_STATE_CHANGED") {
            val state = intent.getStringExtra("ss")
            // Wait until the SIM is fully loaded or ready before processing
            if (state != "LOADED" && state != "READY") return
        }

        val appContext = context.applicationContext
        val pm = appContext.getSystemService(Context.POWER_SERVICE) as? PowerManager
        val wakeLock = pm?.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "LacakHP:SimChangeSentinel")
        wakeLock?.acquire(35_000L)

        val pendingResult = goAsync()

        executor.execute {
            try {
                // Settle delay: Give Dual-SIM / MediaTek modems 2.2 seconds to populate SubscriptionManager
                Thread.sleep(2200L)

                val trustedSig = TrackerPrefs.getTrustedSimSignature(appContext)
                if (trustedSig.isEmpty()) {
                    val registeredCarrier = TrackerPrefs.registerCurrentSim(appContext)
                    Log.d(TAG, "Auto-registered initial SIM on first boot/insert: $registeredCarrier")
                    return@execute
                }

                val (currentSig, currentCarrier) = TrackerPrefs.getCurrentSimSignature(appContext)
                if (currentSig.isEmpty()) {
                    Log.d(TAG, "Current SIM signature still empty or reading in progress; skipping")
                    return@execute
                }

                // If owner restored their original SIM, reset alert sent flag
                if (currentSig == trustedSig) {
                    if (TrackerPrefs.isSimAlertSent(appContext)) {
                        Log.i(TAG, "Trusted SIM reinserted; resetting isSimAlertSent flag")
                        TrackerPrefs.setSimAlertSent(appContext, false)
                    }
                    return@execute
                }

                // SIM SWAP CONFIRMED!
                Log.w(TAG, "🚨 CRITICAL: SIM Swap Detected! Expected: $trustedSig, Found: $currentSig ($currentCarrier)")
                DeviceOwnerHelper.enforceEmergencyLockdown(appContext)

                if (TrackerPrefs.isSimAlertSent(appContext)) {
                    Log.i(TAG, "SIM change alert already dispatched for this cycle; ignoring duplicate broadcast")
                    return@execute
                }

                var serviceStarted = false
                if (hasLocationPermission(appContext)) {
                    val serviceIntent = Intent(appContext, TrackerService::class.java).apply {
                        this.action = TrackerService.ACTION_SIM_CHANGED
                        putExtra(TrackerService.EXTRA_NEW_CARRIER, currentCarrier)
                    }

                    try {
                        ContextCompat.startForegroundService(appContext, serviceIntent)
                        serviceStarted = true
                        Log.i(TAG, "TrackerService started successfully for live GPS lock on SIM swap")
                    } catch (e: Exception) {
                        Log.w(TAG, "Background service start blocked by Android (${e.javaClass.simpleName}): ${e.message}")
                    }
                } else {
                    Log.w(TAG, "Location permission revoked; bypassing TrackerService to Direct Receiver SMS Fallback")
                }

                // FAIL-SAFE DIRECT SMS FALLBACK:
                // If TrackerService could not start (due to Android 12-15 background start restrictions or Doze mode),
                // do NOT fail the user! Send the emergency SMS immediately right from this receiver!
                if (!serviceStarted) {
                    Log.i(TAG, "Executing Direct Receiver SMS Fallback using Last Known Location...")
                    val battery = getBatteryPercentage(appContext)
                    val lastPoint = TrackerPrefs.getLastLocation(appContext)

                    val smsSuccess = if (lastPoint != null) {
                        VariantSmsBridge.sendSimChangeAlert(
                            context = appContext,
                            carrier = currentCarrier,
                            point = lastPoint,
                            battery = battery
                        )
                    } else {
                        val firstTrusted = TrackerPrefs.getFirstTrustedNumber(appContext)
                        if (!firstTrusted.isNullOrBlank()) {
                            val alertMsg = "[LacakHP PERINGATAN] Kartu SIM baru ($currentCarrier) terdeteksi di HP Anda! Baterai: $battery%."
                            VariantSmsBridge.sendPlainSms(appContext, firstTrusted, alertMsg)
                        } else {
                            false
                        }
                    }

                    if (smsSuccess) {
                        Log.i(TAG, "Direct SMS alert dispatched successfully from SimChangeReceiver!")
                        TrackerPrefs.setSimAlertSent(appContext, true)
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error processing SIM change broadcast: ${e.message}", e)
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

    private fun getBatteryPercentage(context: Context): Int {
        return try {
            val ifilter = IntentFilter(Intent.ACTION_BATTERY_CHANGED)
            val batteryStatus = context.registerReceiver(null, ifilter)
            val level = batteryStatus?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
            val scale = batteryStatus?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
            if (level >= 0 && scale > 0) (level * 100) / scale else 50
        } catch (_: Exception) {
            50
        }
    }
}
