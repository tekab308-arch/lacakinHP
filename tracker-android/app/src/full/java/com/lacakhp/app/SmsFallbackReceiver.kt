package com.lacakhp.app

import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * Monitors SmsManager dispatch status. If a message containing a Google Maps URL fails
 * carrier filters, automatically resends a plain-text coordinate SMS once.
 */
class SmsFallbackReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "SmsFallbackReceiver"
        const val EXTRA_DESTINATION = "extra_dest"
        const val EXTRA_FALLBACK_TEXT = "extra_fallback_text"
        const val EXTRA_IS_FALLBACK = "extra_is_fallback"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val destination = intent.getStringExtra(EXTRA_DESTINATION).orEmpty()
        val fallbackText = intent.getStringExtra(EXTRA_FALLBACK_TEXT).orEmpty()
        val isFallback = intent.getBooleanExtra(EXTRA_IS_FALLBACK, false)

        if (resultCode == Activity.RESULT_OK) {
            Log.d(TAG, "SMS dispatched successfully to $destination (fallback=$isFallback)")
            return
        }

        Log.w(TAG, "SMS send failed (code=$resultCode, fallback=$isFallback) to $destination")
        if (!isFallback && destination.isNotBlank() && fallbackText.isNotBlank()) {
            Log.i(TAG, "Retrying plain-text coordinate SMS fallback to $destination")
            SmsHelper.sendSms(
                context = context.applicationContext,
                destination = destination,
                message = fallbackText,
                fallbackPlainText = null,
                isFallback = true
            )
        }
    }
}
