package com.lacakhp.app

import android.app.admin.DeviceAdminReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import android.widget.Toast
import androidx.core.content.ContextCompat

/**
 * Handles device administration callbacks to prevent unauthorized uninstallation
 * and fire an immediate tamper alert if someone tries disabling Admin from Settings.
 */
class TrackerAdminReceiver : DeviceAdminReceiver() {

    override fun onEnabled(context: Context, intent: Intent) {
        super.onEnabled(context, intent)
        Toast.makeText(context, "Anti-Uninstall Aktif: Aplikasi dikunci sebagai Admin Perangkat", Toast.LENGTH_LONG).show()
    }

    override fun onDisableRequested(context: Context, intent: Intent): CharSequence {
        try {
            val serviceIntent = Intent(context, TrackerService::class.java).apply {
                action = TrackerService.ACTION_ADMIN_TAMPER_ALERT
            }
            ContextCompat.startForegroundService(context, serviceIntent)
        } catch (e: Exception) {
            Log.w("TrackerAdminReceiver", "Failed triggering tamper alert: ${e.message}")
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
        val count = TrackerPrefs.incrementFailedUnlockCount(context)
        if (count >= 3) {
            try {
                val serviceIntent = Intent(context, TrackerService::class.java).apply {
                    action = TrackerService.ACTION_INTRUDER_PIN_ALERT
                    putExtra(TrackerService.EXTRA_FAILED_ATTEMPTS, count)
                }
                ContextCompat.startForegroundService(context, serviceIntent)
            } catch (e: Exception) {
                Log.w("TrackerAdminReceiver", "Failed triggering intruder PIN alert: ${e.message}")
            }
        }
    }

    @Suppress("DEPRECATION")
    override fun onPasswordSucceeded(context: Context, intent: Intent) {
        super.onPasswordSucceeded(context, intent)
        TrackerPrefs.resetFailedUnlockCount(context)
    }
}
