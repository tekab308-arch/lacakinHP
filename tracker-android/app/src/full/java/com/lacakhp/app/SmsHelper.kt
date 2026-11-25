package com.lacakhp.app

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.telephony.SmsManager
import android.util.Log
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.atomic.AtomicInteger

enum class SmsCommandType {
    LOCATE,
    STATUS,
    RING,
    LOCK
}

/**
 * Handles strict SMS sender/PIN authorization, multipart dispatch, and
 * plain-text fallback when carrier anti-spam filters reject map URLs.
 */
object SmsHelper {
    private const val TAG = "SmsHelper"
    private val reqCounter = AtomicInteger(100)

    fun normalizePhone(raw: String): String {
        val digits = raw.filter { it.isDigit() }
        return when {
            digits.startsWith("0") && digits.length >= 9 -> "62" + digits.substring(1)
            else -> digits
        }
    }

    fun hasPinInKeyword(configuredKeyword: String): Boolean {
        val clean = configuredKeyword.trim().uppercase(Locale.ROOT)
        if (clean.isEmpty() || clean == TrackerPrefs.DEFAULT_SMS_KEYWORD) return false
        return clean.split(Regex("\\s+")).size >= 2 || clean.any { it.isDigit() }
    }

    fun isAuthorizedSender(
        sender: String,
        trustedCsv: String,
        configuredKeyword: String
    ): Boolean {
        val entries = trustedCsv.split(",")
            .map { normalizePhone(it.trim()) }
            .filter { it.isNotEmpty() }

        val normalizedSender = normalizePhone(sender)
        if (normalizedSender.isEmpty()) return false

        val senderInWhitelist = entries.any { trusted ->
            normalizedSender == trusted ||
                (trusted.length >= 8 && normalizedSender.endsWith(trusted)) ||
                (normalizedSender.length >= 8 && trusted.endsWith(normalizedSender))
        }
        if (senderInWhitelist) return true

        // Allow unknown emergency numbers ONLY if user configured an explicit PIN keyword
        // (e.g., "LACAK 7492"). Never reply to unwhitelisted numbers for plain "LACAK".
        return hasPinInKeyword(configuredKeyword)
    }

    fun parseCommand(body: String, configuredKeyword: String): SmsCommandType? {
        val cleanBody = body.trim().uppercase(Locale.ROOT)
        val cleanKeyword = configuredKeyword.trim().uppercase(Locale.ROOT)
        if (cleanKeyword.isEmpty()) return null

        val tokens = cleanBody.split(Regex("\\s+")).filter { it.isNotEmpty() }
        val kwTokens = cleanKeyword.split(Regex("\\s+")).filter { it.isNotEmpty() }
        if (tokens.size < kwTokens.size) return null

        for (i in kwTokens.indices) {
            if (tokens[i] != kwTokens[i]) return null
        }

        val sub = tokens.getOrNull(kwTokens.size) ?: return SmsCommandType.LOCATE
        return when (sub) {
            "STATUS", "INFO", "CEK" -> SmsCommandType.STATUS
            "BUNYI", "ALARM", "RING" -> SmsCommandType.RING
            "KUNCI", "LOCK" -> SmsCommandType.LOCK
            else -> SmsCommandType.LOCATE
        }
    }

    fun formatLocationSms(
        point: LocationPoint,
        battery: Int,
        isCachedFallback: Boolean
    ): String {
        val latStr = String.format(Locale.US, "%.6f", point.latitude)
        val lngStr = String.format(Locale.US, "%.6f", point.longitude)
        return buildString {
            append(formatPlainLocationSms(point, battery, isCachedFallback))
            append("\nhttps://maps.google.com/?q=$latStr,$lngStr")
        }
    }

    fun formatPlainLocationSms(
        point: LocationPoint,
        battery: Int,
        isCachedFallback: Boolean
    ): String {
        val timeStr = SimpleDateFormat("dd/MM HH:mm:ss", Locale.getDefault())
            .format(Date(point.timestamp))
        val latStr = String.format(Locale.US, "%.6f", point.latitude)
        val lngStr = String.format(Locale.US, "%.6f", point.longitude)
        val sourceLabel = if (isCachedFallback) "cache-${point.provider}" else point.provider
        val accStr = if (point.accuracy >= 0f) "${point.accuracy.toInt()}m" else "-"
        return buildString {
            append("[LacakHP]\n")
            append("Koordinat: $latStr, $lngStr\n")
            append("Akurasi: $accStr ($sourceLabel)\n")
            append("Baterai: $battery%\n")
            append("Waktu: $timeStr")
        }
    }

    fun sendSms(
        context: Context,
        destination: String,
        message: String,
        fallbackPlainText: String? = null,
        isFallback: Boolean = false
    ): Boolean {
        return try {
            val smsManager = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                context.getSystemService(SmsManager::class.java)
            } else {
                @Suppress("DEPRECATION")
                SmsManager.getDefault()
            }
            if (smsManager == null) {
                Log.e(TAG, "SmsManager unavailable")
                return false
            }

            val sentIntents: ArrayList<PendingIntent>? =
                if (!fallbackPlainText.isNullOrBlank() && !isFallback) {
                    val sentIntent = Intent(context, SmsFallbackReceiver::class.java).apply {
                        putExtra(SmsFallbackReceiver.EXTRA_DESTINATION, destination)
                        putExtra(SmsFallbackReceiver.EXTRA_FALLBACK_TEXT, fallbackPlainText)
                        putExtra(SmsFallbackReceiver.EXTRA_IS_FALLBACK, false)
                    }
                    val pi = PendingIntent.getBroadcast(
                        context.applicationContext,
                        reqCounter.incrementAndGet(),
                        sentIntent,
                        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
                    )
                    arrayListOf(pi)
                } else {
                    null
                }

            val parts = smsManager.divideMessage(message)
            if (parts.size > 1) {
                val piList = sentIntents?.let { list ->
                    ArrayList<PendingIntent>(parts.size).apply {
                        add(list[0])
                        repeat(parts.size - 1) {
                            add(
                                PendingIntent.getBroadcast(
                                    context.applicationContext,
                                    reqCounter.incrementAndGet(),
                                    Intent(context, SmsFallbackReceiver::class.java).apply {
                                        putExtra(SmsFallbackReceiver.EXTRA_IS_FALLBACK, true)
                                    },
                                    PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
                                )
                            )
                        }
                    }
                }
                smsManager.sendMultipartTextMessage(destination, null, parts, piList, null)
            } else {
                smsManager.sendTextMessage(destination, null, message, sentIntents?.firstOrNull(), null)
            }
            Log.d(TAG, "SMS queued to $destination (${parts.size} part(s), fallback=$isFallback)")
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed sending SMS to $destination", e)
            false
        }
    }
}
