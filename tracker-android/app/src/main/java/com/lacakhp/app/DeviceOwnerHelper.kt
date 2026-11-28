package com.lacakhp.app

import android.Manifest
import android.app.Activity
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.UserManager
import android.telephony.TelephonyManager
import android.util.Log
import androidx.core.content.ContextCompat

/**
 * Pure Android Enterprise Device Owner & Device Admin policy helper.
 * Uses only official BIND_DEVICE_ADMIN APIs (zero AccessibilityService, zero root/shell SDKs)
 * to remain 100% compliant with Google Play Protect whitelist policies.
 */
object DeviceOwnerHelper {

    private const val TAG = "DeviceOwnerHelper"

    internal val PERMANENT_RESTRICTIONS = listOf(
        UserManager.DISALLOW_FACTORY_RESET,
        UserManager.DISALLOW_SAFE_BOOT,
        UserManager.DISALLOW_ADD_USER,
        UserManager.DISALLOW_NETWORK_RESET
    )

    internal fun emergencyRestrictions(sdkInt: Int = Build.VERSION.SDK_INT): List<String> =
        if (sdkInt >= Build.VERSION_CODES.P) {
            listOf(
                UserManager.DISALLOW_AIRPLANE_MODE,
                UserManager.DISALLOW_CONFIG_LOCATION,
                UserManager.DISALLOW_CONFIG_DATE_TIME
            )
        } else {
            emptyList()
        }

    fun adminComponent(context: Context): ComponentName =
        ComponentName(context, TrackerAdminReceiver::class.java)

    private fun dpm(context: Context): DevicePolicyManager? =
        context.getSystemService(Context.DEVICE_POLICY_SERVICE) as? DevicePolicyManager

    fun isDeviceOwner(context: Context): Boolean {
        return try {
            dpm(context)?.isDeviceOwnerApp(context.packageName) == true
        } catch (_: Exception) {
            false
        }
    }

    fun isAdminActive(context: Context): Boolean {
        return try {
            dpm(context)?.isAdminActive(adminComponent(context)) == true
        } catch (_: Exception) {
            false
        }
    }

    fun adbActivationCommand(context: Context): String =
        "adb shell dpm set-device-owner ${context.packageName}/.TrackerAdminReceiver"

    /**
     * Applies Smart Mode permanent protections when Device Owner is active:
     * - Blocks app uninstallation, factory reset, safe boot, secondary user creation, and network reset.
     * - Locks essential runtime permissions (Location, Notifications, SMS/Phone in full flavor).
     * - Enforces USB Debugging lock unless within an owner-authorized 30-minute window.
     * - Reads hardware IMEI 1/2 locally for the family Emergency Card (never sent to Nostr).
     */
    fun applySmartOwnerPolicies(context: Context, forceRelockUsb: Boolean = false) {
        val appCtx = context.applicationContext
        val manager = dpm(appCtx) ?: return
        val pkg = appCtx.packageName
        if (!isDeviceOwner(appCtx)) return
        val admin = adminComponent(appCtx)

        try {
            manager.setUninstallBlocked(admin, pkg, true)
        } catch (e: Exception) {
            Log.w(TAG, "setUninstallBlocked failed: ${e.message}")
        }

        for (restriction in PERMANENT_RESTRICTIONS) {
            try {
                manager.addUserRestriction(admin, restriction)
            } catch (e: Exception) {
                Log.w(TAG, "addUserRestriction($restriction) failed: ${e.message}")
            }
        }

        if (forceRelockUsb) {
            TrackerPrefs.setUsbDebugAllowUntilMs(appCtx, 0L)
        }
        syncUsbDebuggingLock(appCtx)

        if (TrackerPrefs.isEmergencyLockdownActive(appCtx) && Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            for (restriction in emergencyRestrictions()) {
                try {
                    manager.addUserRestriction(admin, restriction)
                } catch (e: Exception) {
                    Log.w(TAG, "Re-applying emergency restriction($restriction) failed: ${e.message}")
                }
            }
            try {
                manager.setLocationEnabled(admin, true)
            } catch (e: Exception) {
                Log.w(TAG, "Re-applying setLocationEnabled failed: ${e.message}")
            }
        }

        val essentialPermissions = buildList {
            add(Manifest.permission.ACCESS_FINE_LOCATION)
            add(Manifest.permission.ACCESS_COARSE_LOCATION)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                add(Manifest.permission.ACCESS_BACKGROUND_LOCATION)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                add(Manifest.permission.POST_NOTIFICATIONS)
            }
            addAll(VariantSmsBridge.requiredPermissions())
        }
        for (perm in essentialPermissions) {
            try {
                manager.setPermissionGrantState(
                    admin,
                    pkg,
                    perm,
                    DevicePolicyManager.PERMISSION_GRANT_STATE_GRANTED
                )
            } catch (e: Exception) {
                Log.w(TAG, "setPermissionGrantState($perm) skipped: ${e.message}")
            }
        }

        readAndCacheHardwareImeis(appCtx)
    }

    fun onBootOrUpgrade(context: Context) {
        if (isDeviceOwner(context)) {
            applySmartOwnerPolicies(context, forceRelockUsb = true)
        } else {
            TrackerPrefs.setUsbDebugAllowUntilMs(context, 0L)
        }
    }

    /**
     * Ensures DISALLOW_DEBUGGING_FEATURES is active once the 30-minute temporary window expires.
     */
    fun syncUsbDebuggingLock(context: Context, nowMs: Long = System.currentTimeMillis()) {
        val appCtx = context.applicationContext
        if (!isDeviceOwner(appCtx)) return
        val manager = dpm(appCtx) ?: return
        val admin = adminComponent(appCtx)
        val allowUntil = TrackerPrefs.getUsbDebugAllowUntilMs(appCtx)

        try {
            if (TrackerPrefs.isWindowActive(allowUntil, nowMs)) {
                manager.clearUserRestriction(admin, UserManager.DISALLOW_DEBUGGING_FEATURES)
            } else {
                if (allowUntil != 0L) {
                    TrackerPrefs.setUsbDebugAllowUntilMs(appCtx, 0L)
                }
                manager.addUserRestriction(admin, UserManager.DISALLOW_DEBUGGING_FEATURES)
            }
        } catch (e: Exception) {
            Log.w(TAG, "syncUsbDebuggingLock failed: ${e.message}")
        }
    }

    fun allowUsbDebuggingTemporarily(
        context: Context,
        durationMs: Long = TrackerPrefs.USB_DEBUG_WINDOW_MS
    ): Long {
        val appCtx = context.applicationContext
        val until = System.currentTimeMillis() + durationMs
        TrackerPrefs.setUsbDebugAllowUntilMs(appCtx, until)
        syncUsbDebuggingLock(appCtx)
        return until
    }

    fun relockUsbDebuggingNow(context: Context) {
        val appCtx = context.applicationContext
        TrackerPrefs.setUsbDebugAllowUntilMs(appCtx, 0L)
        syncUsbDebuggingLock(appCtx)
    }

    /**
     * Zero-latency emergency escalation callable directly inside BroadcastReceivers (even in Doze Mode):
     * 1. Activates 2-minute Chase Mode for 45 minutes.
     * 2. Immediately relocks USB Debugging, blocks Airplane Mode / Location / Clock changes, and forces Location ON when Device Owner.
     */
    fun enforceEmergencyLockdown(context: Context) {
        val appCtx = context.applicationContext
        TrackerPrefs.activateChaseMode(appCtx)
        TrackerPrefs.setEmergencyLockdownActive(appCtx, true)

        if (isDeviceOwner(appCtx)) {
            applySmartOwnerPolicies(appCtx, forceRelockUsb = true)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                val manager = dpm(appCtx)
                val admin = adminComponent(appCtx)
                for (restriction in emergencyRestrictions()) {
                    try {
                        manager?.addUserRestriction(admin, restriction)
                    } catch (e: Exception) {
                        Log.w(TAG, "Failed locking $restriction: ${e.message}")
                    }
                }
                try {
                    manager?.setLocationEnabled(admin, true)
                } catch (e: Exception) {
                    Log.w(TAG, "Failed forcing Location enabled: ${e.message}")
                }
            }
        }
    }

    /**
     * Restores normal non-emergency Airplane Mode, Location config, and Date/Time access after Dual Owner Verification.
     */
    fun clearEmergencyLockdown(context: Context) {
        val appCtx = context.applicationContext
        TrackerPrefs.setEmergencyLockdownActive(appCtx, false)
        TrackerPrefs.clearChaseMode(appCtx)
        if (isDeviceOwner(appCtx)) {
            val manager = dpm(appCtx)
            val admin = adminComponent(appCtx)
            for (restriction in emergencyRestrictions()) {
                try {
                    manager?.clearUserRestriction(admin, restriction)
                } catch (e: Exception) {
                    Log.w(TAG, "Failed clearing $restriction: ${e.message}")
                }
            }
        }
    }

    /**
     * Releases all Device Owner restrictions & ownership after Dual Owner Verification
     * so the legitimate owner can uninstall or sell/reset the phone cleanly.
     */
    @Suppress("DEPRECATION")
    fun releaseDeviceOwner(context: Context): Boolean {
        val appCtx = context.applicationContext
        val manager = dpm(appCtx) ?: return false
        val pkg = appCtx.packageName
        val admin = adminComponent(appCtx)

        TrackerPrefs.setEmergencyLockdownActive(appCtx, false)
        TrackerPrefs.clearChaseMode(appCtx)
        TrackerPrefs.setUsbDebugAllowUntilMs(appCtx, 0L)

        if (!isDeviceOwner(appCtx)) {
            if (manager.isAdminActive(admin)) {
                try {
                    manager.removeActiveAdmin(admin)
                } catch (_: Exception) {}
            }
            return true
        }

        val allRestrictions = PERMANENT_RESTRICTIONS +
            UserManager.DISALLOW_DEBUGGING_FEATURES +
            emergencyRestrictions()
        for (r in allRestrictions) {
            try {
                manager.clearUserRestriction(admin, r)
            } catch (_: Exception) {}
        }

        val unlockedPerms = buildList {
            add(Manifest.permission.ACCESS_FINE_LOCATION)
            add(Manifest.permission.ACCESS_COARSE_LOCATION)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                add(Manifest.permission.ACCESS_BACKGROUND_LOCATION)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                add(Manifest.permission.POST_NOTIFICATIONS)
            }
            addAll(VariantSmsBridge.requiredPermissions())
        }
        for (perm in unlockedPerms) {
            try {
                manager.setPermissionGrantState(
                    admin,
                    pkg,
                    perm,
                    DevicePolicyManager.PERMISSION_GRANT_STATE_DEFAULT
                )
            } catch (_: Exception) {}
        }

        return try {
            manager.setUninstallBlocked(admin, pkg, false)
            manager.clearDeviceOwnerApp(pkg)
            true
        } catch (e: Exception) {
            Log.e(TAG, "clearDeviceOwnerApp failed: ${e.message}")
            false
        }
    }

    /**
     * Reads hardware IMEI 1 & IMEI 2 locally when Device Owner + READ_PHONE_STATE are active.
     * Never transmitted over Nostr; used solely for the owner's local Emergency Card.
     */
    fun readAndCacheHardwareImeis(context: Context): Pair<String, String> {
        val appCtx = context.applicationContext
        if (!isDeviceOwner(appCtx)) {
            return TrackerPrefs.getImei1(appCtx) to TrackerPrefs.getImei2(appCtx)
        }
        if (ContextCompat.checkSelfPermission(appCtx, Manifest.permission.READ_PHONE_STATE)
            != PackageManager.PERMISSION_GRANTED
        ) {
            return TrackerPrefs.getImei1(appCtx) to TrackerPrefs.getImei2(appCtx)
        }
        return try {
            val tm = appCtx.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager
            val slot0 = TrackerPrefs.sanitizeImei(tm?.getImei(0).orEmpty())
            val slot1 = TrackerPrefs.sanitizeImei(tm?.getImei(1).orEmpty())
                .takeIf { it != slot0 }.orEmpty()
            val finalImei1 = slot0.ifEmpty { TrackerPrefs.getImei1(appCtx) }
            val finalImei2 = slot1.ifEmpty { TrackerPrefs.getImei2(appCtx) }
            if (finalImei1.isNotEmpty() || finalImei2.isNotEmpty()) {
                TrackerPrefs.saveImeis(appCtx, finalImei1, finalImei2)
            }
            finalImei1 to finalImei2
        } catch (_: Exception) {
            TrackerPrefs.getImei1(appCtx) to TrackerPrefs.getImei2(appCtx)
        }
    }
}

/**
 * Android 12+ (API 31+) Managed Provisioning handler for 6-tap QR Device Owner setup.
 */
class ProvisioningModeActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val resultIntent = Intent().apply {
            // PROVISIONING_MODE_FULLY_MANAGED_DEVICE = 1
            putExtra("android.app.extra.PROVISIONING_MODE", 1)
        }
        setResult(RESULT_OK, resultIntent)
        finish()
    }
}

/**
 * Android 12+ (API 31+) policy compliance callback completing QR Device Owner setup.
 */
class AdminPolicyComplianceActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        DeviceOwnerHelper.applySmartOwnerPolicies(applicationContext)
        setResult(RESULT_OK)
        finish()
    }
}
