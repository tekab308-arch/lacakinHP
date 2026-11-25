package com.lacakhp.app

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
}
