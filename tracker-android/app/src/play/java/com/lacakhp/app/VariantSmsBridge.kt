package com.lacakhp.app

import android.content.Context

/**
 * Play-flavor stub: keeps Play Store builds free of SEND_SMS/RECEIVE_SMS permissions.
 */
object VariantSmsBridge {
    const val hasSmsSupport = false

    fun requiredPermissions(): Array<String> = emptyArray()

    fun hasPermissions(context: Context): Boolean = false

    fun hasPhoneStatePermission(context: Context): Boolean = false

    fun sendLocationReply(
        context: Context,
        destination: String,
        point: LocationPoint,
        battery: Int,
        isCachedFallback: Boolean
    ): Boolean = false

    fun sendLowBatteryAlert(
        context: Context,
        point: LocationPoint,
        battery: Int
    ): Boolean = false

    fun sendSimChangeAlert(
        context: Context,
        carrier: String,
        point: LocationPoint,
        battery: Int
    ): Boolean = false

    fun sendAdminTamperAlert(
        context: Context,
        point: LocationPoint?,
        battery: Int
    ): Boolean = false

    fun sendShutdownAlert(
        context: Context,
        point: LocationPoint?,
        battery: Int
    ): Boolean = false

    fun sendAirplaneModeAlert(
        context: Context,
        point: LocationPoint?,
        battery: Int
    ): Boolean = false

    fun sendIntruderPinAlert(
        context: Context,
        point: LocationPoint?,
        battery: Int,
        attempts: Int
    ): Boolean = false

    fun sendLockScreenReply(
        context: Context,
        destination: String,
        locked: Boolean,
        point: LocationPoint?,
        battery: Int
    ): Boolean = false

    fun hasSmsPinConfigured(context: Context): Boolean = false

    fun sendPlainSms(context: Context, destination: String, message: String): Boolean = false
}
