package com.lacakhp.app

import android.content.Context
import android.os.Build
import android.os.Handler
import android.os.Looper
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.util.Locale
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

data class UpdateCheckResult(
    val success: Boolean,
    val hasUpdate: Boolean,
    val localVersionCode: Int,
    val localVersionName: String,
    val remoteVersionCode: Int = localVersionCode,
    val remoteVersionName: String = localVersionName,
    val apkUrl: String = "${TrackerPrefs.DEFAULT_WEB_URL}/lacakhp-resmi.apk",
    val apkSha256: String = "",
    val notes: String = "",
    val sourceOrigin: String = TrackerPrefs.DEFAULT_WEB_URL
)

/**
 * Checks official LacakHP mirrors in sequence (lacakinhp110.my.id -> lacakinhp.pages.dev -> vercel mirror),
 * verifies signing certificate fingerprint continuity, and surfaces the APK SHA-256 hash without
 * requiring REQUEST_INSTALL_PACKAGES permission.
 */
object UpdateChecker {

    val OFFICIAL_UPDATE_ORIGINS = listOf(
        TrackerPrefs.DEFAULT_WEB_URL,
        TrackerPrefs.MIRROR_WEB_URL,
        TrackerPrefs.MIRROR_VERCEL_URL
    )

    private val SHA256_HEX_RE = Regex("^[0-9a-f]{64}$")

    private val client = OkHttpClient.Builder()
        .connectTimeout(5, TimeUnit.SECONDS)
        .readTimeout(5, TimeUnit.SECONDS)
        .build()

    private val executor = Executors.newSingleThreadExecutor()
    private val mainHandler = Handler(Looper.getMainLooper())

    fun isTrustedUpdateUrl(url: String): Boolean {
        val clean = url.trim()
        return OFFICIAL_UPDATE_ORIGINS.any { origin ->
            clean.startsWith("$origin/")
        }
    }

    fun isOfficialCertSha256(certSha256: String): Boolean {
        val normalized = certSha256.trim().replace(":", "").lowercase(Locale.ROOT)
        if (normalized.isEmpty()) return true
        return normalized == ApkIntegrityHelper.OFFICIAL_PRIMARY_SHA256
    }

    fun isValidApkSha256(sha: String): Boolean {
        return SHA256_HEX_RE.matches(sha.trim().lowercase(Locale.ROOT))
    }

    fun resolveMirrorApkUrl(rawApkUrl: String, activeOrigin: String): String {
        val fallbackForOrigin = "$activeOrigin/lacakhp-resmi.apk"
        if (activeOrigin != TrackerPrefs.DEFAULT_WEB_URL) {
            return fallbackForOrigin
        }
        val clean = rawApkUrl.trim()
        return if (isTrustedUpdateUrl(clean)) clean else fallbackForOrigin
    }

    fun getLocalVersion(context: Context): Pair<Int, String> {
        return try {
            val info = context.packageManager.getPackageInfo(context.packageName, 0)
            val code = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                info.longVersionCode.toInt()
            } else {
                @Suppress("DEPRECATION")
                info.versionCode
            }
            val name = info.versionName ?: "2.0"
            code to name
        } catch (_: Exception) {
            2 to "2.0"
        }
    }

    fun checkAsync(
        context: Context,
        onResult: (UpdateCheckResult) -> Unit
    ) {
        val (localCode, localName) = getLocalVersion(context)

        executor.execute {
            var resolvedResult: UpdateCheckResult? = null

            for (origin in OFFICIAL_UPDATE_ORIGINS) {
                val versionUrl = "$origin/version.json?t=${System.currentTimeMillis()}"
                try {
                    val req = Request.Builder()
                        .url(versionUrl)
                        .header("Cache-Control", "no-cache")
                        .build()
                    client.newCall(req).execute().use { resp ->
                        if (resp.isSuccessful) {
                            val bodyStr = resp.body?.string().orEmpty()
                            val json = JSONObject(bodyStr)
                            val remoteCert = json.optString("certSha256", "")
                            if (!isOfficialCertSha256(remoteCert)) {
                                return@use
                            }
                            val remoteCode = json.optInt("versionCode", localCode)
                            val remoteName = json.optString("versionName", localName)
                            val rawApkUrl = json.optString("apkUrl", "$origin/lacakhp-resmi.apk")
                            val apkUrl = resolveMirrorApkUrl(rawApkUrl, origin)
                            val rawSha = json.optString("apkSha256", "").trim().lowercase(Locale.ROOT)
                            val apkSha256 = if (isValidApkSha256(rawSha)) rawSha else ""
                            val notes = json.optString("notes", "")

                            resolvedResult = UpdateCheckResult(
                                success = true,
                                hasUpdate = remoteCode > localCode,
                                localVersionCode = localCode,
                                localVersionName = localName,
                                remoteVersionCode = remoteCode,
                                remoteVersionName = remoteName,
                                apkUrl = apkUrl,
                                apkSha256 = apkSha256,
                                notes = notes,
                                sourceOrigin = origin
                            )
                        }
                    }
                } catch (_: Exception) {
                    // Try next official mirror
                }
                if (resolvedResult != null) break
            }

            val finalResult = resolvedResult ?: UpdateCheckResult(
                success = false,
                hasUpdate = false,
                localVersionCode = localCode,
                localVersionName = localName
            )

            mainHandler.post {
                onResult(finalResult)
            }
        }
    }
}
