package com.lacakhp.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.core.content.ContextCompat

/**
 * Automatically restarts TrackerService after device reboot (including Direct Boot
 * before lock-screen unlock) or app update.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            Intent.ACTION_LOCKED_BOOT_COMPLETED,
            Intent.ACTION_BOOT_COMPLETED,
            "android.intent.action.QUICKBOOT_POWERON",
            Intent.ACTION_MY_PACKAGE_REPLACED -> {
                DeviceOwnerHelper.onBootOrUpgrade(context.applicationContext)
                try {
                    val serviceIntent = Intent(context, TrackerService::class.java)
                    ContextCompat.startForegroundService(context, serviceIntent)
                } catch (e: Exception) {
                    Log.w("BootReceiver", "Failed starting service on ${intent.action}: ${e.message}")
                }
            }
            Intent.ACTION_SHUTDOWN,
            "android.intent.action.QUICKBOOT_POWEROFF" -> {
                try {
                    val serviceIntent = Intent(context, TrackerService::class.java).apply {
                        action = TrackerService.ACTION_SHUTDOWN_ALERT
                    }
                    ContextCompat.startForegroundService(context, serviceIntent)
                } catch (e: Exception) {
                    Log.w("BootReceiver", "Failed dispatching shutdown alert: ${e.message}")
                }
            }
        }
    }
}
