package com.lacakhp.app

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat

/**
 * Full-flavor SMS capability bridge (enabled for F-Droid / sideload builds).
 */
object VariantSmsBridge {
    const val hasSmsSupport = true

    fun requiredPermissions(): Array<String> = arrayOf(
        Manifest.permission.SEND_SMS,
        Manifest.permission.RECEIVE_SMS,
        Manifest.permission.READ_PHONE_STATE
    )

    fun hasPermissions(context: Context): Boolean {
        val send = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.SEND_SMS
        ) == PackageManager.PERMISSION_GRANTED
        val recv = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.RECEIVE_SMS
        ) == PackageManager.PERMISSION_GRANTED
        return send && recv
    }

    fun hasPhoneStatePermission(context: Context): Boolean {
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.READ_PHONE_STATE
        ) == PackageManager.PERMISSION_GRANTED
    }

    fun sendLocationReply(
        context: Context,
        destination: String,
        point: LocationPoint,
        battery: Int,
        isCachedFallback: Boolean
    ): Boolean {
        val text = SmsHelper.formatLocationSms(point, battery, isCachedFallback)
        val plain = SmsHelper.formatPlainLocationSms(point, battery, isCachedFallback)
        return SmsHelper.sendSms(context, destination, text, fallbackPlainText = plain)
    }

    fun sendSimChangeAlert(
        context: Context,
        carrier: String,
        point: LocationPoint,
        battery: Int
    ): Boolean {
        return sendTrustedAlert(
            context = context,
            richPrefix = "[LacakHP PERINGATAN] Kartu SIM baru ($carrier) terdeteksi di HP Anda!",
            plainPrefix = "[LacakHP PERINGATAN] SIM baru ($carrier)!",
            point = point,
            battery = battery
        )
    }

    fun sendLowBatteryAlert(
        context: Context,
        point: LocationPoint,
        battery: Int
    ): Boolean {
        return sendTrustedAlert(
            context = context,
            richPrefix = "[LacakHP DARURAT] Baterai HP sisa $battery%!",
            plainPrefix = "[LacakHP DARURAT] Baterai $battery%!",
            point = point,
            battery = battery
        )
    }

    fun sendAdminTamperAlert(
        context: Context,
        point: LocationPoint?,
        battery: Int
    ): Boolean {
        val firstTrusted = TrackerPrefs.getFirstTrustedNumber(context) ?: return false
        if (point == null) {
            return SmsHelper.sendSms(
                context,
                firstTrusted,
                "[LacakHP SABOTASE] Ada percobaan menonaktifkan Anti-Uninstall Admin Perangkat! Baterai: $battery%."
            )
        }
        return sendTrustedAlert(
            context = context,
            richPrefix = "[LacakHP SABOTASE] Ada percobaan mematikan Anti-Uninstall Admin!",
            plainPrefix = "[LacakHP SABOTASE] Anti-Uninstall dicoba dimatikan!",
            point = point,
            battery = battery
        )
    }

    fun sendShutdownAlert(
        context: Context,
        point: LocationPoint?,
        battery: Int
    ): Boolean {
        val firstTrusted = TrackerPrefs.getFirstTrustedNumber(context) ?: return false
        if (point == null) {
            return SmsHelper.sendSms(
                context,
                firstTrusted,
                "[LacakHP DARURAT] HP sedang dimatikan! Baterai: $battery%."
            )
        }
        return sendTrustedAlert(
            context = context,
            richPrefix = "[LacakHP DARURAT] HP sedang dimatikan! Posisi terakhir sebelum daya mati:",
            plainPrefix = "[LacakHP DARURAT] HP sedang dimatikan!",
            point = point,
            battery = battery
        )
    }

    fun sendAirplaneModeAlert(
        context: Context,
        point: LocationPoint?,
        battery: Int
    ): Boolean {
        val firstTrusted = TrackerPrefs.getFirstTrustedNumber(context) ?: return false
        if (point == null) {
            return SmsHelper.sendSms(
                context,
                firstTrusted,
                "[LacakHP SABOTASE] Mode Pesawat dinyalakan di HP Anda! Baterai: $battery%."
            )
        }
        return sendTrustedAlert(
            context = context,
            richPrefix = "[LacakHP SABOTASE] Mode Pesawat dinyalakan! Posisi terakhir:",
            plainPrefix = "[LacakHP SABOTASE] Mode Pesawat dinyalakan!",
            point = point,
            battery = battery
        )
    }

    fun sendIntruderPinAlert(
        context: Context,
        point: LocationPoint?,
        battery: Int,
        attempts: Int
    ): Boolean {
        val firstTrusted = TrackerPrefs.getFirstTrustedNumber(context) ?: return false
        if (point == null) {
            return SmsHelper.sendSms(
                context,
                firstTrusted,
                "[LacakHP PERINGATAN] Salah PIN/Kunci layar ${attempts}x berturut-turut! Baterai: $battery%."
            )
        }
        return sendTrustedAlert(
            context = context,
            richPrefix = "[LacakHP PERINGATAN] Salah PIN/Kunci layar ${attempts}x berturut-turut!",
            plainPrefix = "[LacakHP PERINGATAN] Salah PIN layar ${attempts}x!",
            point = point,
            battery = battery
        )
    }

    fun sendLockScreenReply(
        context: Context,
        destination: String,
        locked: Boolean,
        point: LocationPoint?,
        battery: Int
    ): Boolean {
        val statusMsg = if (locked) {
            "[LacakHP] LAYAR HP BERHASIL DIKUNCI PAKSA!"
        } else {
            "[LacakHP] Kunci layar gagal (Device Admin belum aktif)."
        }
        if (point == null) {
            return SmsHelper.sendSms(context, destination, "$statusMsg Baterai: $battery%.")
        }
        val text = "$statusMsg\n" + SmsHelper.formatLocationSms(point, battery, isCachedFallback = false)
        val plain = "$statusMsg\n" + SmsHelper.formatPlainLocationSms(point, battery, isCachedFallback = false)
        return SmsHelper.sendSms(context, destination, text, fallbackPlainText = plain)
    }

    private fun sendTrustedAlert(
        context: Context,
        richPrefix: String,
        plainPrefix: String,
        point: LocationPoint,
        battery: Int
    ): Boolean {
        val firstTrusted = TrackerPrefs.getFirstTrustedNumber(context) ?: return false
        val text = "$richPrefix\n" +
            SmsHelper.formatLocationSms(point, battery, isCachedFallback = false)
        val plain = "$plainPrefix\n" +
            SmsHelper.formatPlainLocationSms(point, battery, isCachedFallback = false)
        return SmsHelper.sendSms(context, firstTrusted, text, fallbackPlainText = plain)
    }

    fun hasSmsPinConfigured(context: Context): Boolean {
        val kw = TrackerPrefs.getSmsKeyword(context)
        return SmsHelper.hasPinInKeyword(kw)
    }

    fun sendPlainSms(context: Context, destination: String, message: String): Boolean {
        return SmsHelper.sendSms(context, destination, message)
    }
}
