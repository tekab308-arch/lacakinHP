package com.lacakhp.app

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import java.util.Locale

/**
 * Detects aggressive OEM battery/memory managers (Xiaomi MIUI/HyperOS, Samsung One UI,
 * Oppo/Realme/Vivo) and builds safe deep-link intents with fallback to App Info.
 */
object OemPowerHelper {

    fun isXiaomiDevice(
        manufacturer: String = Build.MANUFACTURER,
        brand: String = Build.BRAND
    ): Boolean {
        val combined = "$manufacturer $brand".lowercase(Locale.ROOT)
        return combined.contains("xiaomi") ||
            combined.contains("redmi") ||
            combined.contains("poco")
    }

    fun isSamsungDevice(
        manufacturer: String = Build.MANUFACTURER,
        brand: String = Build.BRAND
    ): Boolean {
        val combined = "$manufacturer $brand".lowercase(Locale.ROOT)
        return combined.contains("samsung")
    }

    fun isColorOsOrFuntouchDevice(
        manufacturer: String = Build.MANUFACTURER,
        brand: String = Build.BRAND
    ): Boolean {
        val combined = "$manufacturer $brand".lowercase(Locale.ROOT)
        return combined.contains("oppo") ||
            combined.contains("realme") ||
            combined.contains("oneplus") ||
            combined.contains("vivo") ||
            combined.contains("iqoo")
    }

    fun openAppDetailsSettings(context: Context): Boolean {
        return try {
            val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.parse("package:${context.packageName}")
            }
            context.startActivity(intent)
            true
        } catch (_: Exception) {
            false
        }
    }

    fun openXiaomiAutostartSettings(context: Context): Boolean {
        val candidates = listOf(
            ComponentName(
                "com.miui.securitycenter",
                "com.miui.permcenter.autostart.AutoStartManagementActivity"
            ),
            ComponentName(
                "com.miui.securitycenter",
                "com.miui.permcenter.MainAcitivty"
            )
        )
        for (component in candidates) {
            try {
                val intent = Intent().apply {
                    this.component = component
                    putExtra("extra_pkgname", context.packageName)
                }
                context.startActivity(intent)
                return true
            } catch (_: Exception) {}
        }
        return openAppDetailsSettings(context)
    }

    fun openXiaomiBatterySaverSettings(context: Context): Boolean {
        val candidates = listOf(
            ComponentName(
                "com.miui.powerkeeper",
                "com.miui.powerkeeper.ui.HiddenAppsConfigActivity"
            ),
            ComponentName(
                "com.miui.powerkeeper",
                "com.miui.powerkeeper.ui.HiddenAppsContainerManagementActivity"
            )
        )
        val appLabel = try {
            context.getString(R.string.app_name)
        } catch (_: Exception) {
            "LacakHP"
        }
        for (component in candidates) {
            try {
                val intent = Intent().apply {
                    this.component = component
                    putExtra("package_name", context.packageName)
                    putExtra("package_label", appLabel)
                }
                context.startActivity(intent)
                return true
            } catch (_: Exception) {}
        }
        return openAppDetailsSettings(context)
    }
}
