package com.lacakhp.app

import android.content.Context
import android.content.SharedPreferences
import android.os.Build
import android.os.UserManager

/**
 * Stores tracker configuration, user-owned E2EE secret/seedphrase, Nostr relay URLs,
 * and last known GPS snapshot in Device-Protected storage so Direct Boot works before unlock.
 */
object TrackerPrefs {
    private const val PREF_NAME = "lacakhp_prefs"

    const val DEFAULT_RELAYS = "wss://relay.damus.io,wss://nos.lol,wss://relay.primal.net"
    val FALLBACK_RELAYS = listOf(
        "wss://offchain.pub",
        "wss://nostr.mom",
        "wss://nostr.bitcoiner.social"
    )
    const val DEFAULT_SMS_KEYWORD = "LACAK"
    const val DEFAULT_WEB_URL = "https://lacakinhp110.my.id"

    const val MODE_SIMPLE = "SIMPLE"
    const val MODE_SEEDPHRASE = "SEEDPHRASE"

    private const val KEY_RELAYS = "nostr_relays"
    private const val KEY_DEVICE_ID = "device_id"
    private const val KEY_SEEDPHRASE = "seedphrase"
    private const val KEY_CRYPTO_VERSION = "crypto_version"
    private const val KEY_SMS_KEYWORD = "sms_keyword"
    private const val KEY_TRUSTED_NUMBERS = "trusted_numbers"
    private const val KEY_LAST_LAT = "last_lat"
    private const val KEY_LAST_LNG = "last_lng"
    private const val KEY_LAST_ACC = "last_acc"
    private const val KEY_LAST_PROVIDER = "last_provider"
    private const val KEY_LAST_TIME = "last_time"
    private const val KEY_SETUP_COMPLETED = "setup_completed"
    private const val KEY_SECURITY_MODE = "security_mode"
    private const val KEY_TRUSTED_SIM_SIG = "trusted_sim_sig"
    private const val KEY_TRUSTED_SIM_LABEL = "trusted_sim_label"
    private const val KEY_SIM_ALERT_SENT = "sim_alert_sent"
    private const val KEY_STEALTH_MODE = "stealth_mode"
    private const val KEY_FAILED_UNLOCK_COUNT = "failed_unlock_count"
    private const val KEY_MIGRATED_DE = "migrated_to_de"

    @Volatile
    private var migrationAttempted = false

    private fun prefs(context: Context): SharedPreferences {
        val de = context.createDeviceProtectedStorageContext()
        val dePrefs = de.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        if (!migrationAttempted && !dePrefs.getBoolean(KEY_MIGRATED_DE, false)) {
            migrationAttempted = true
            try {
                val um = context.getSystemService(Context.USER_SERVICE) as? UserManager
                if (um?.isUserUnlocked == true) {
                    if (!dePrefs.contains(KEY_SEEDPHRASE)) {
                        de.moveSharedPreferencesFrom(context, PREF_NAME)
                    }
                    de.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
                        .edit()
                        .putBoolean(KEY_MIGRATED_DE, true)
                        .apply()
                }
            } catch (_: Exception) {}
        }
        return de.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
    }

    fun getCryptoVersion(context: Context): String {
        val p = prefs(context)
        val saved = p.getString(KEY_CRYPTO_VERSION, null)
        if (!saved.isNullOrEmpty()) return saved
        return if (p.contains(KEY_SEEDPHRASE)) {
            CryptoHelper.VERSION_V1
        } else {
            CryptoHelper.VERSION_V2
        }
    }

    fun upgradeCryptoToV2(context: Context) {
        prefs(context).edit()
            .putString(KEY_CRYPTO_VERSION, CryptoHelper.VERSION_V2)
            .apply()
    }

    fun getTrustedSimSignature(context: Context): String {
        return prefs(context).getString(KEY_TRUSTED_SIM_SIG, "").orEmpty()
    }

    fun getLockedSimLabel(context: Context): String {
        val label = prefs(context).getString(KEY_TRUSTED_SIM_LABEL, "").orEmpty()
        return if (label.isNotEmpty()) label else "SIM"
    }

    fun setTrustedSimSignature(context: Context, signature: String) {
        if (getTrustedSimSignature(context).isNotEmpty()) return
        prefs(context).edit().putString(KEY_TRUSTED_SIM_SIG, signature.trim()).apply()
    }

    fun isSimAlertSent(context: Context): Boolean {
        return prefs(context).getBoolean(KEY_SIM_ALERT_SENT, false)
    }

    fun setSimAlertSent(context: Context, sent: Boolean) {
        prefs(context).edit().putBoolean(KEY_SIM_ALERT_SENT, sent).apply()
    }

    fun isStealthMode(context: Context): Boolean {
        return prefs(context).getBoolean(KEY_STEALTH_MODE, false)
    }

    fun setStealthMode(context: Context, enabled: Boolean) {
        prefs(context).edit().putBoolean(KEY_STEALTH_MODE, enabled).apply()
    }

    fun incrementFailedUnlockCount(context: Context): Int {
        val next = prefs(context).getInt(KEY_FAILED_UNLOCK_COUNT, 0) + 1
        prefs(context).edit().putInt(KEY_FAILED_UNLOCK_COUNT, next).apply()
        return next
    }

    fun resetFailedUnlockCount(context: Context) {
        if (prefs(context).getInt(KEY_FAILED_UNLOCK_COUNT, 0) != 0) {
            prefs(context).edit().putInt(KEY_FAILED_UNLOCK_COUNT, 0).apply()
        }
    }

    fun getCurrentSimSignature(context: Context): Pair<String, String> {
        val sm = context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as? android.telephony.SubscriptionManager
        var sig = ""
        var carrier = "SIM"
        try {
            if (androidx.core.content.ContextCompat.checkSelfPermission(
                    context,
                    android.Manifest.permission.READ_PHONE_STATE
                ) == android.content.pm.PackageManager.PERMISSION_GRANTED
            ) {
                val list = sm?.activeSubscriptionInfoList
                if (!list.isNullOrEmpty()) {
                    val sorted = list.sortedBy { it.simSlotIndex }
                    carrier = sorted.joinToString(" + ") { info ->
                        info.carrierName?.toString()?.takeIf { it.isNotBlank() }
                            ?: info.displayName?.toString()?.takeIf { it.isNotBlank() }
                            ?: "SIM ${info.simSlotIndex + 1}"
                    }
                    sig = sorted.joinToString("|") { info ->
                        val c = info.carrierName?.toString() ?: info.displayName?.toString() ?: "SIM"
                        "${info.subscriptionId}_${info.simSlotIndex}_$c"
                    }
                }
            }
        } catch (_: Exception) {}

        if (sig.isEmpty()) {
            val tm = context.getSystemService(Context.TELEPHONY_SERVICE) as? android.telephony.TelephonyManager
            val op = tm?.simOperatorName.orEmpty().ifEmpty { tm?.networkOperatorName.orEmpty() }
            if (op.isNotEmpty()) {
                carrier = op
                sig = "tm_$op"
            }
        }
        return Pair(sig, carrier)
    }

    fun registerCurrentSim(context: Context): String {
        if (getTrustedSimSignature(context).isNotEmpty()) {
            return getLockedSimLabel(context)
        }
        val (sig, carrier) = getCurrentSimSignature(context)
        if (sig.isNotEmpty()) {
            prefs(context).edit()
                .putString(KEY_TRUSTED_SIM_SIG, sig)
                .putString(KEY_TRUSTED_SIM_LABEL, carrier)
                .putBoolean(KEY_SIM_ALERT_SENT, false)
                .apply()
            return carrier
        }
        return ""
    }

    fun isSetupCompleted(context: Context): Boolean {
        return prefs(context).getBoolean(KEY_SETUP_COMPLETED, false)
    }

    fun setSetupCompleted(context: Context, completed: Boolean) {
        prefs(context).edit().putBoolean(KEY_SETUP_COMPLETED, completed).apply()
    }

    fun getSecurityMode(context: Context): String {
        return prefs(context).getString(KEY_SECURITY_MODE, MODE_SEEDPHRASE) ?: MODE_SEEDPHRASE
    }

    fun setSecurityMode(context: Context, mode: String) {
        prefs(context).edit().putString(KEY_SECURITY_MODE, mode).apply()
    }

    fun setCustomPassphrase(context: Context, customPass: String) {
        val norm = customPass.trim()
        prefs(context).edit()
            .putString(KEY_SECURITY_MODE, MODE_SIMPLE)
            .putString(KEY_SEEDPHRASE, norm)
            .putString(KEY_CRYPTO_VERSION, CryptoHelper.VERSION_V2)
            .putBoolean(KEY_SETUP_COMPLETED, true)
            .apply()
    }

    fun setSeedphrase(context: Context, seed: String) {
        val norm = CryptoHelper.normalizeSeedphrase(seed)
        prefs(context).edit()
            .putString(KEY_SECURITY_MODE, MODE_SEEDPHRASE)
            .putString(KEY_SEEDPHRASE, norm)
            .putString(KEY_CRYPTO_VERSION, CryptoHelper.VERSION_V2)
            .putBoolean(KEY_SETUP_COMPLETED, true)
            .apply()
    }

    fun getRelays(context: Context): List<String> {
        val raw = prefs(context).getString(KEY_RELAYS, DEFAULT_RELAYS).orEmpty().trim()
        val parsed = raw.split(",")
            .map { it.trim() }
            .filter { it.startsWith("wss://") || it.startsWith("ws://") }
        return if (parsed.isNotEmpty()) parsed else DEFAULT_RELAYS.split(",")
    }

    fun getRelaysString(context: Context): String {
        val raw = prefs(context).getString(KEY_RELAYS, DEFAULT_RELAYS).orEmpty().trim()
        return raw.ifEmpty { DEFAULT_RELAYS }
    }

    fun getDeviceId(context: Context): String {
        val saved = prefs(context).getString(KEY_DEVICE_ID, null)?.trim()
        if (!saved.isNullOrEmpty()) return sanitizeDeviceId(saved)
        val base = sanitizeDeviceId("${Build.MANUFACTURER}-${Build.MODEL}").ifEmpty { "hp-utama" }
        val resolved = "$base-${CryptoHelper.generateRandomHex(2)}"
        prefs(context).edit().putString(KEY_DEVICE_ID, resolved).apply()
        return resolved
    }

    fun getSeedphrase(context: Context): String {
        val saved = prefs(context).getString(KEY_SEEDPHRASE, null)?.trim()
        if (!saved.isNullOrEmpty()) return CryptoHelper.normalizeSeedphrase(saved)
        val generated = CryptoHelper.generateSeedphrase()
        prefs(context).edit()
            .putString(KEY_SEEDPHRASE, generated)
            .putString(KEY_CRYPTO_VERSION, CryptoHelper.VERSION_V2)
            .apply()
        return generated
    }

    fun regenerateSeedphrase(context: Context): String {
        val generated = CryptoHelper.generateSeedphrase()
        prefs(context).edit()
            .putString(KEY_SECURITY_MODE, MODE_SEEDPHRASE)
            .putString(KEY_SEEDPHRASE, generated)
            .putString(KEY_CRYPTO_VERSION, CryptoHelper.VERSION_V2)
            .putBoolean(KEY_SETUP_COMPLETED, true)
            .apply()
        return generated
    }

    fun getSmsKeyword(context: Context): String {
        val saved = prefs(context).getString(KEY_SMS_KEYWORD, DEFAULT_SMS_KEYWORD).orEmpty().trim()
        return saved.ifEmpty { DEFAULT_SMS_KEYWORD }
    }

    fun getTrustedNumbers(context: Context): String {
        return prefs(context).getString(KEY_TRUSTED_NUMBERS, "").orEmpty().trim()
    }

    fun getFirstTrustedNumber(context: Context): String? {
        return getTrustedNumbers(context)
            .split(",")
            .map { it.trim() }
            .firstOrNull { it.isNotEmpty() }
    }

    fun saveConfig(
        context: Context,
        trustedNumbers: String,
        smsKeyword: String,
        deviceId: String,
        seedphrase: String,
        relaysCsv: String
    ) {
        val cleanRelays = relaysCsv.split(",")
            .map { it.trim() }
            .filter { it.startsWith("wss://") || it.startsWith("ws://") }
            .joinToString(",")
            .ifEmpty { DEFAULT_RELAYS }

        val prevSeed = getSeedphrase(context)
        val prevId = getDeviceId(context)
        val cleanId = sanitizeDeviceId(deviceId).ifEmpty { prevId }
        val cleanSeed = CryptoHelper.normalizeSeedphrase(seedphrase).ifEmpty { prevSeed }
        val words = cleanSeed.split(" ")
        val detectedMode = if (words.size == 12) MODE_SEEDPHRASE else MODE_SIMPLE
        val targetVersion = if (cleanSeed != prevSeed || cleanId != prevId) {
            CryptoHelper.VERSION_V2
        } else {
            getCryptoVersion(context)
        }

        prefs(context).edit()
            .putString(KEY_TRUSTED_NUMBERS, trustedNumbers.trim())
            .putString(KEY_SMS_KEYWORD, smsKeyword.trim().ifEmpty { DEFAULT_SMS_KEYWORD })
            .putString(KEY_DEVICE_ID, cleanId)
            .putString(KEY_SEEDPHRASE, cleanSeed)
            .putString(KEY_CRYPTO_VERSION, targetVersion)
            .putString(KEY_SECURITY_MODE, detectedMode)
            .putString(KEY_RELAYS, cleanRelays)
            .apply()
    }

    private fun encodeUrlPart(raw: String): String {
        return java.net.URLEncoder.encode(raw, "UTF-8").replace("+", "%20")
    }

    fun hasCustomRelays(context: Context): Boolean {
        val current = getRelays(context)
        val defaults = DEFAULT_RELAYS.split(",")
        return current != defaults
    }

    fun getMagicLink(context: Context): String {
        val encId = encodeUrlPart(getDeviceId(context))
        val encKey = encodeUrlPart(getSeedphrase(context))
        val base = "$DEFAULT_WEB_URL/#id=$encId&key=$encKey"
        if (!hasCustomRelays(context)) return base
        val encRelays = encodeUrlPart(getRelays(context).joinToString(","))
        return "$base&relays=$encRelays"
    }

    fun buildEmergencyCardText(context: Context): String {
        val id = getDeviceId(context)
        val seed = getSeedphrase(context)
        val mode = getSecurityMode(context)
        val version = getCryptoVersion(context)
        val keyword = getSmsKeyword(context)
        val magicUrl = getMagicLink(context)
        val customRelays = hasCustomRelays(context)
        val relaysText = getRelays(context).joinToString(",")
        val modeLabel = if (mode == MODE_SIMPLE) "Kata Sandi Pribadi" else "Seedphrase (12 Kata)"
        val verLabel = if (version == CryptoHelper.VERSION_V2) "v2 PBKDF2-100k" else "v1 Legacy"

        return buildString {
            append("=== KARTU DARURAT LACAKHP ===\n")
            append("Simpan pesan ini di WhatsApp keluarga terpercaya (jangan hanya di HP ini).\n\n")
            append("🔗 TAUTAN DARURAT 1-KLIK (Buka peta tanpa perlu ketik sandi):\n")
            append("$magicUrl\n\n")
            append("--- DETAIL MANUAL ($verLabel) ---\n")
            append("• ID Perangkat: $id\n")
            append("• Kunci Rahasia ($modeLabel): $seed\n")
            append("• Web Pelacak: $DEFAULT_WEB_URL\n")
            if (customRelays) {
                append("• Relay Nostr Kustom: $relaysText\n")
            }
            if (VariantSmsBridge.hasSmsSupport) {
                append("\n--- SMS DARURAT (Jika Data Internet Mati) ---\n")
                append("Kirim SMS ke HP ini dengan teks:\n")
                append("$keyword\n")
                append("(atau $keyword KUNCI untuk kunci layar paksa, $keyword BUNYI untuk alarm, $keyword STATUS)")
            }
            append("\n\n⚠️ WASPADA PENIPUAN: LacakHP adalah projek amal open-source 100% GRATIS demi mendukung tugas kepolisian. Kami tidak pernah meminta biaya, transfer uang, PIN, atau kode OTP untuk membuka lokasi.")
        }
    }

    fun saveLastLocation(context: Context, point: LocationPoint) {
        prefs(context).edit()
            .putString(KEY_LAST_LAT, point.latitude.toString())
            .putString(KEY_LAST_LNG, point.longitude.toString())
            .putFloat(KEY_LAST_ACC, point.accuracy)
            .putString(KEY_LAST_PROVIDER, point.provider)
            .putLong(KEY_LAST_TIME, point.timestamp)
            .apply()
    }

    fun getLastLocation(context: Context): LocationPoint? {
        val p = prefs(context)
        val lat = p.getString(KEY_LAST_LAT, null)?.toDoubleOrNull() ?: return null
        val lng = p.getString(KEY_LAST_LNG, null)?.toDoubleOrNull() ?: return null
        val acc = p.getFloat(KEY_LAST_ACC, -1f)
        val provider = p.getString(KEY_LAST_PROVIDER, "cache").orEmpty()
        val time = p.getLong(KEY_LAST_TIME, 0L)
        return LocationPoint(
            id = 0L,
            latitude = lat,
            longitude = lng,
            accuracy = acc,
            provider = provider,
            battery = -1,
            timestamp = time,
            synced = true
        )
    }

    private fun sanitizeDeviceId(raw: String): String {
        return raw.trim()
            .lowercase()
            .replace(Regex("[^a-z0-9_-]"), "-")
            .replace(Regex("-+"), "-")
            .trim('-')
    }
}
