package com.lacakhp.app

import android.content.Context
import android.os.Build
import android.os.Handler
import android.os.Looper
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
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
    val notes: String = ""
)

/**
 * Checks https://lacakinhp110.my.id/version.json in the background to notify users
 * when a newer official signed APK is available for in-place upgrade.
 */
object UpdateChecker {

    private val client = OkHttpClient.Builder()
        .connectTimeout(6, TimeUnit.SECONDS)
        .readTimeout(6, TimeUnit.SECONDS)
        .build()

    private val executor = Executors.newSingleThreadExecutor()
    private val mainHandler = Handler(Looper.getMainLooper())

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
        val versionUrl = "${TrackerPrefs.DEFAULT_WEB_URL}/version.json?t=${System.currentTimeMillis()}"

        executor.execute {
            val result = try {
                val req = Request.Builder()
                    .url(versionUrl)
                    .header("Cache-Control", "no-cache")
                    .build()
                client.newCall(req).execute().use { resp ->
                    if (!resp.isSuccessful) {
                        UpdateCheckResult(
                            success = false,
                            hasUpdate = false,
                            localVersionCode = localCode,
                            localVersionName = localName
                        )
                    } else {
                        val bodyStr = resp.body?.string().orEmpty()
                        val json = JSONObject(bodyStr)
                        val remoteCode = json.optInt("versionCode", localCode)
                        val remoteName = json.optString("versionName", localName)
                        val defaultApkUrl = "${TrackerPrefs.DEFAULT_WEB_URL}/lacakhp-resmi.apk"
                        val rawApkUrl = json.optString("apkUrl", defaultApkUrl).trim()
                        val apkUrl = if (rawApkUrl.startsWith("${TrackerPrefs.DEFAULT_WEB_URL}/")) {
                            rawApkUrl
                        } else {
                            defaultApkUrl
                        }
                        val apkSha256 = json.optString("apkSha256", "")
                        val notes = json.optString("notes", "")

                        UpdateCheckResult(
                            success = true,
                            hasUpdate = remoteCode > localCode,
                            localVersionCode = localCode,
                            localVersionName = localName,
                            remoteVersionCode = remoteCode,
                            remoteVersionName = remoteName,
                            apkUrl = apkUrl,
                            apkSha256 = apkSha256,
                            notes = notes
                        )
                    }
                }
            } catch (_: Exception) {
                UpdateCheckResult(
                    success = false,
                    hasUpdate = false,
                    localVersionCode = localCode,
                    localVersionName = localName
                )
            }

            mainHandler.post {
                onResult(result)
            }
        }
    }
}
