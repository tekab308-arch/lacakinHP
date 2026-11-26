package com.lacakhp.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.core.content.ContextCompat

/**
 * Automatically restarts TrackerService after device reboot (including Direct Boot
 * before lock-screen unlock), app update, or task/memory cleanup revival alarms.
 */
class BootReceiver : BroadcastReceiver() {

    companion object {
        const val ACTION_REVIVE_TRACKER = "com.lacakhp.app.ACTION_REVIVE_TRACKER"
        private const val TAG = "BootReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val appCtx = context.applicationContext
        when (intent.action) {
            Intent.ACTION_LOCKED_BOOT_COMPLETED,
            Intent.ACTION_BOOT_COMPLETED,
            "android.intent.action.QUICKBOOT_POWERON",
            Intent.ACTION_MY_PACKAGE_REPLACED -> {
                DeviceOwnerHelper.onBootOrUpgrade(appCtx)
                if (intent.action != Intent.ACTION_LOCKED_BOOT_COMPLETED) {
                    TrackerWatchdogJob.schedule(appCtx)
                }
                startTrackerIfPermitted(appCtx, intent.action)
            }
            ACTION_REVIVE_TRACKER -> {
                TrackerWatchdogJob.schedule(appCtx)
                if (!TrackerService.isRunning) {
                    startTrackerIfPermitted(appCtx, ACTION_REVIVE_TRACKER)
                }
            }
            Intent.ACTION_SHUTDOWN,
            "android.intent.action.QUICKBOOT_POWEROFF" -> {
                try {
                    val serviceIntent = Intent(appCtx, TrackerService::class.java).apply {
                        action = TrackerService.ACTION_SHUTDOWN_ALERT
                    }
                    ContextCompat.startForegroundService(appCtx, serviceIntent)
                } catch (e: Exception) {
                    Log.w(TAG, "Failed dispatching shutdown alert: ${e.message}")
                }
            }
        }
    }

    private fun startTrackerIfPermitted(appCtx: Context, trigger: String?) {
        if (!GpsLocator(appCtx).hasLocationPermission()) return
        try {
            val serviceIntent = Intent(appCtx, TrackerService::class.java)
            ContextCompat.startForegroundService(appCtx, serviceIntent)
        } catch (e: Exception) {
            Log.w(TAG, "Failed starting service on $trigger: ${e.message}")
        }
    }
}
