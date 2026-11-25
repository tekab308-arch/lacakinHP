package com.lacakhp.app

import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import java.security.MessageDigest
import java.util.Locale

data class ApkIntegrityResult(
    val isOfficial: Boolean,
    val sha256Hex: String,
    val colonFormatted: String,
    val shortFingerprint: String
)

/**
 * Verifies at runtime that the installed APK is signed by the official LacakHP maintainer
 * signing key (SHA-256 X.509 certificate digest), detecting any unauthorized GitHub clone
 * or tampered/repackaged APK immediately.
 */
object ApkIntegrityHelper {

    const val OFFICIAL_PRIMARY_SHA256 =
        "e3100d61557b491f65e4b242cc432925273b7c96f55527ca27a9eb48c3a80748"

    private val OFFICIAL_TRUSTED_SHA256 = setOf(
        OFFICIAL_PRIMARY_SHA256
    )

    fun verify(context: Context): ApkIntegrityResult {
        val certBytes = getSigningCertBytes(context)
        if (certBytes == null || certBytes.isEmpty()) {
            return ApkIntegrityResult(
                isOfficial = false,
                sha256Hex = "unknown",
                colonFormatted = "TIDAK TERDETEKSI",
                shortFingerprint = "UNKNOWN"
            )
        }

        val digest = MessageDigest.getInstance("SHA-256").digest(certBytes)
        val hexLower = digest.joinToString("") { "%02x".format(it) }
        val colon = digest.joinToString(":") { "%02X".format(it) }
        val shortFp = if (colon.length >= 23) {
            "${colon.take(11)}...${colon.takeLast(8)}"
        } else {
            colon
        }

        return ApkIntegrityResult(
            isOfficial = OFFICIAL_TRUSTED_SHA256.contains(hexLower.lowercase(Locale.ROOT)),
            sha256Hex = hexLower,
            colonFormatted = colon,
            shortFingerprint = shortFp
        )
    }

    @Suppress("DEPRECATION")
    private fun getSigningCertBytes(context: Context): ByteArray? {
        return try {
            val pm = context.packageManager
            val pkgName = context.packageName
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                val info = pm.getPackageInfo(pkgName, PackageManager.GET_SIGNING_CERTIFICATES)
                val signingInfo = info.signingInfo ?: return null
                val sigs = if (signingInfo.hasMultipleSigners()) {
                    signingInfo.apkContentsSigners
                } else {
                    signingInfo.signingCertificateHistory
                }
                sigs?.firstOrNull()?.toByteArray()
            } else {
                val info = pm.getPackageInfo(pkgName, PackageManager.GET_SIGNATURES)
                info.signatures?.firstOrNull()?.toByteArray()
            }
        } catch (_: Exception) {
            null
        }
    }
}
