package com.lacakhp.app

import android.app.admin.DeviceAdminReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import android.os.PowerManager
import android.util.Log
import android.widget.Toast
import androidx.core.content.ContextCompat
import java.util.concurrent.Executors

/**
 * Handles Device Admin & Device Owner callbacks:
 * - Applies Smart MDM protections on enable / QR provisioning complete.
 * - Enforces zero-latency Emergency Lockdown + 2-minute Chase Mode on >= 3 failed unlock attempts,
 *   with a Direct Receiver SMS Fallback when Android 12-15 blocks background service starts in Doze.
 */
class TrackerAdminReceiver : DeviceAdminReceiver() {

    companion object {
        private const val TAG = "TrackerAdminReceiver"
        private val fallbackExecutor = Executors.newSingleThreadExecutor()
    }

    override fun onEnabled(context: Context, intent: Intent) {
        super.onEnabled(context, intent)
        DeviceOwnerHelper.applySmartOwnerPolicies(context.applicationContext)
        val msg = if (DeviceOwnerHelper.isDeviceOwner(context)) {
            "Benteng Device Owner Aktif: Aplikasi & sistem dikunci permanen"
        } else {
            "Anti-Uninstall Aktif: Aplikasi dikunci sebagai Admin Perangkat"
        }
        Toast.makeText(context, msg, Toast.LENGTH_LONG).show()
    }

    override fun onProfileProvisioningComplete(context: Context, intent: Intent) {
        super.onProfileProvisioningComplete(context, intent)
        DeviceOwnerHelper.applySmartOwnerPolicies(context.applicationContext)
    }

    override fun onDisableRequested(context: Context, intent: Intent): CharSequence {
        try {
            val serviceIntent = Intent(context, TrackerService::class.java).apply {
                action = TrackerService.ACTION_ADMIN_TAMPER_ALERT
            }
            ContextCompat.startForegroundService(context, serviceIntent)
        } catch (e: Exception) {
            Log.w(TAG, "Failed triggering tamper alert: ${e.message}")
        }
        return "PERINGATAN KEAMANAN: Menonaktifkan Admin akan melepas kunci Anti-Uninstall LacakHP. Lokasi & peringatan sabotase sedang dikirim ke pemilik."
    }

    override fun onDisabled(context: Context, intent: Intent) {
        super.onDisabled(context, intent)
        Toast.makeText(context, "Anti-Uninstall Dinonaktifkan", Toast.LENGTH_SHORT).show()
    }

    @Suppress("DEPRECATION")
    override fun onPasswordFailed(context: Context, intent: Intent) {
        super.onPasswordFailed(context, intent)
        val appContext = context.applicationContext
        val count = TrackerPrefs.incrementFailedUnlockCount(appContext)
        if (count >= 3) {
            // Zero-latency Device Owner lockdown + 2-minute Chase Mode activation
            DeviceOwnerHelper.enforceEmergencyLockdown(appContext)

            var serviceStarted = false
            try {
                val serviceIntent = Intent(appContext, TrackerService::class.java).apply {
                    action = TrackerService.ACTION_INTRUDER_PIN_ALERT
                    putExtra(TrackerService.EXTRA_FAILED_ATTEMPTS, count)
                }
                ContextCompat.startForegroundService(appContext, serviceIntent)
                serviceStarted = true
            } catch (e: Exception) {
                Log.w(TAG, "ForegroundService blocked on PIN fail ($count): ${e.message}")
            }

            if (!serviceStarted && count == 5 && VariantSmsBridge.hasSmsSupport) {
                val pm = appContext.getSystemService(Context.POWER_SERVICE) as? PowerManager
                val wakeLock = pm?.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "LacakHP:PinFailFallback")
                wakeLock?.acquire(15_000L)
                val pendingResult = goAsync()
                fallbackExecutor.execute {
                    try {
                        val battery = getBatteryPercentage(appContext)
                        val lastPoint = TrackerPrefs.getLastLocation(appContext)
                        VariantSmsBridge.sendIntruderPinAlert(appContext, lastPoint, battery, count)
                    } catch (e: Exception) {
                        Log.w(TAG, "Direct SMS intruder fallback error: ${e.message}")
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
        }
    }

    @Suppress("DEPRECATION")
    override fun onPasswordSucceeded(context: Context, intent: Intent) {
        super.onPasswordSucceeded(context, intent)
        // Resets consecutive failed counter ONLY; emergency lockdown requires Dual Owner Auth (PIN + Secret Key)
        TrackerPrefs.resetFailedUnlockCount(context.applicationContext)
    }

    private fun getBatteryPercentage(context: Context): Int {
        return try {
            val status = context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
            val level = status?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
            val scale = status?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
            if (level >= 0 && scale > 0) (level * 100) / scale else 50
        } catch (_: Exception) {
            50
        }
    }
}
