package com.lacakhp.app

import android.os.Build
import android.os.UserManager
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class TrackerUnitTests {

    @Test
    fun rejectsCoarseBtsBounceAndStationaryHotspotJump() {
        val t0 = 1_700_000_000_000L
        val homeLat = -5.154884
        val homeLng = 105.299902

        // Coarse 1200m network fix 900m away within overlap radius -> rejected
        assertFalse(
            shouldAcceptLocationCandidate(
                candLat = -5.147211,
                candLng = 105.294169,
                candAcc = 1200f,
                candProvider = "network",
                candTimeMs = t0 + 10 * 60_000L,
                anchorLat = homeLat,
                anchorLng = homeLng,
                anchorAcc = 20f,
                anchorTimeMs = t0,
                nowMs = t0 + 10 * 60_000L
            )
        )

        // Metered mobile hotspot claiming fake 25m accuracy 1.06km away with no motion for 2m -> rejected
        assertFalse(
            shouldAcceptLocationCandidate(
                candLat = -5.147211,
                candLng = 105.294169,
                candAcc = 25.8f,
                candProvider = "network",
                candTimeMs = t0 + 5 * 60_000L,
                anchorLat = homeLat,
                anchorLng = homeLng,
                anchorAcc = 20f,
                anchorTimeMs = t0,
                nowMs = t0 + 5 * 60_000L,
                hasMotionSensor = true,
                lastMotionMs = t0 - 60_000L,
                isMeteredWifi = true
            )
        )

        // Impossible 2.5km teleport in 9s -> rejected
        assertFalse(
            shouldAcceptLocationCandidate(
                candLat = -5.124829,
                candLng = 105.293862,
                candAcc = 20f,
                candProvider = "network",
                candTimeMs = t0 + 9_000L,
                anchorLat = -5.147211,
                anchorLng = 105.294169,
                anchorAcc = 25f,
                anchorTimeMs = t0,
                nowMs = t0 + 9_000L,
                hasMotionSensor = true,
                lastMotionMs = t0 + 8_000L
            )
        )

        // Real movement with motion sensor triggered -> accepted
        assertTrue(
            shouldAcceptLocationCandidate(
                candLat = -5.147211,
                candLng = 105.294169,
                candAcc = 25f,
                candProvider = "network",
                candTimeMs = t0 + 5 * 60_000L,
                anchorLat = homeLat,
                anchorLng = homeLng,
                anchorAcc = 20f,
                anchorTimeMs = t0,
                nowMs = t0 + 5 * 60_000L,
                hasMotionSensor = true,
                lastMotionMs = t0 + 4 * 60_000L,
                isMeteredWifi = false
            )
        )
    }

    @Test
    fun normalizesSeedphraseConsistently() {
        assertEquals(
            "kucing lucu 2026",
            CryptoHelper.normalizeSeedphrase("  Kucing   Lucu\t2026 ")
        )
    }

    @Test
    fun validatesMirrorUrlsCertAndApkHashStrictly() {
        assertTrue(UpdateChecker.isTrustedUpdateUrl("https://lacakinhp110.my.id/lacakhp-resmi.apk"))
        assertTrue(UpdateChecker.isTrustedUpdateUrl("https://lacakinhp.pages.dev/lacakhp-resmi.apk"))
        assertTrue(UpdateChecker.isTrustedUpdateUrl("https://tracker-web-xi.vercel.app/lacakhp-resmi.apk"))
        assertTrue(
            UpdateChecker.isTrustedUpdateUrl(
                "https://github.com/tekab308-arch/lacakinHP/releases/download/v2.6/lacakhp-resmi.apk"
            )
        )

        // Reject subdomain/prefix spoofing, untrusted GitHub repos, path traversal, & plain HTTP
        assertFalse(UpdateChecker.isTrustedUpdateUrl("https://lacakinhp110.my.id.evil.com/lacakhp-resmi.apk"))
        assertFalse(UpdateChecker.isTrustedUpdateUrl("http://lacakinhp110.my.id/lacakhp-resmi.apk"))
        assertFalse(
            UpdateChecker.isTrustedUpdateUrl(
                "https://github.com/evil-attacker/lacakinHP/releases/download/v2.6/lacakhp-resmi.apk"
            )
        )
        assertFalse(
            UpdateChecker.isTrustedUpdateUrl(
                "https://github.com/tekab308-arch/lacakinHP/releases/download/v2.6/../evil.apk"
            )
        )

        // When failing over to Cloudflare mirror, mirror-hosted APK URL rewrites to active mirror,
        // while official GitHub Releases APK URL is preserved across mirrors
        assertEquals(
            "https://lacakinhp.pages.dev/lacakhp-resmi.apk",
            UpdateChecker.resolveMirrorApkUrl(
                "https://lacakinhp110.my.id/lacakhp-resmi.apk",
                "https://lacakinhp.pages.dev"
            )
        )
        assertEquals(
            "https://github.com/tekab308-arch/lacakinHP/releases/download/v2.6/lacakhp-resmi.apk",
            UpdateChecker.resolveMirrorApkUrl(
                "https://github.com/tekab308-arch/lacakinHP/releases/download/v2.6/lacakhp-resmi.apk",
                "https://lacakinhp.pages.dev"
            )
        )

        assertTrue(
            UpdateChecker.isOfficialCertSha256(
                "E3:10:0D:61:55:7B:49:1F:65:E4:B2:42:CC:43:29:25:27:3B:7C:96:F5:55:27:CA:27:A9:EB:48:C3:A8:07:48"
            )
        )
        assertFalse(
            UpdateChecker.isOfficialCertSha256(
                "00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF"
            )
        )
        assertTrue(
            UpdateChecker.isValidApkSha256(
                "de81c0fe3bc3d6cbe50a467bb4143fe4a0a41d9207ba56f12281f105cea1d970"
            )
        )
        assertFalse(UpdateChecker.isValidApkSha256("not-a-valid-sha256"))
    }

    @Test
    fun sanitizesMasksImeiAndChecksAutoRelockWindow() {
        assertEquals("356789101234567", TrackerPrefs.sanitizeImei("3567-8910-1234-567"))
        assertEquals("", TrackerPrefs.sanitizeImei("12345"))
        assertEquals("3567•••••••••67", TrackerPrefs.maskImei("356789101234567"))
        assertEquals("Belum diisi", TrackerPrefs.maskImei(""))

        assertTrue(TrackerPrefs.isWindowActive(untilMs = 1_000_000L, nowMs = 999_999L))
        assertFalse(TrackerPrefs.isWindowActive(untilMs = 1_000_000L, nowMs = 1_000_000L))
    }

    @Test
    fun detectsOemBrandsAndWatchdogConstants() {
        assertTrue(OemPowerHelper.isXiaomiDevice("Xiaomi", "Redmi"))
        assertTrue(OemPowerHelper.isXiaomiDevice("Xiaomi", "POCO"))
        assertFalse(OemPowerHelper.isXiaomiDevice("Samsung", "samsung"))

        assertTrue(OemPowerHelper.isSamsungDevice("samsung", "SM-A217F"))
        assertTrue(OemPowerHelper.isColorOsOrFuntouchDevice("OPPO", "realme"))
        assertTrue(OemPowerHelper.isColorOsOrFuntouchDevice("vivo", "iQOO"))

        assertEquals("com.lacakhp.app.ACTION_REVIVE_TRACKER", BootReceiver.ACTION_REVIVE_TRACKER)
        assertEquals(2041, TrackerWatchdogJob.JOB_ID)
    }

    @Test
    fun definesPermanentAndEmergencyDeviceOwnerRestrictions() {
        assertTrue(DeviceOwnerHelper.PERMANENT_RESTRICTIONS.containsAll(
            listOf(
                UserManager.DISALLOW_FACTORY_RESET,
                UserManager.DISALLOW_SAFE_BOOT,
                UserManager.DISALLOW_ADD_USER,
                UserManager.DISALLOW_NETWORK_RESET
            )
        ))

        assertTrue(DeviceOwnerHelper.emergencyRestrictions(Build.VERSION_CODES.O).isEmpty())
        assertTrue(
            DeviceOwnerHelper.emergencyRestrictions(Build.VERSION_CODES.P).containsAll(
                listOf(
                    UserManager.DISALLOW_AIRPLANE_MODE,
                    UserManager.DISALLOW_CONFIG_LOCATION,
                    UserManager.DISALLOW_CONFIG_DATE_TIME
                )
            )
        )
    }
}
