package com.lacakhp.app

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import androidx.core.content.ContextCompat

data class GpsFixResult(
    val point: LocationPoint?,
    val isCachedFallback: Boolean
)

/**
 * Reads GPS coordinates directly from Android LocationManager so satellite positioning
 * works completely offline without Google Play Services or internet access.
 */
class GpsLocator(private val context: Context) {

    private val locationManager =
        context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
    private val mainHandler = Handler(Looper.getMainLooper())
    private var periodicListener: LocationListener? = null

    fun hasHardwareGps(): Boolean {
        return context.packageManager.hasSystemFeature(PackageManager.FEATURE_LOCATION_GPS)
    }

    fun hasLocationPermission(): Boolean {
        val fine = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        val coarse = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        return fine || coarse
    }

    fun isGpsEnabled(): Boolean {
        return try {
            locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER) ||
                locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
        } catch (_: Exception) {
            false
        }
    }

    @SuppressLint("MissingPermission")
    fun startPeriodicUpdates(
        minTimeMs: Long = 120_000L,
        minDistanceM: Float = 25f,
        onLocation: (Location) -> Unit
    ) {
        if (!hasLocationPermission()) return
        stopPeriodicUpdates()

        val listener = object : LocationListener {
            override fun onLocationChanged(location: Location) {
                onLocation(location)
            }

            @Deprecated("Deprecated in API 29")
            override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
        }
        periodicListener = listener

        val enabledProviders = try {
            locationManager.getProviders(true)
        } catch (_: Exception) {
            emptyList<String>()
        }
        for (p in enabledProviders) {
            try {
                locationManager.requestLocationUpdates(
                    p,
                    minTimeMs,
                    minDistanceM,
                    listener,
                    Looper.getMainLooper()
                )
            } catch (_: Exception) {}
        }
        // Also listen on PASSIVE_PROVIDER so fixes from Petal Maps, Huawei HMS, or other apps are automatically captured
        try {
            locationManager.requestLocationUpdates(
                LocationManager.PASSIVE_PROVIDER,
                minTimeMs,
                minDistanceM,
                listener,
                Looper.getMainLooper()
            )
        } catch (_: Exception) {}
    }

    fun isPeriodicRunning(): Boolean = periodicListener != null

    fun stopPeriodicUpdates() {
        periodicListener?.let {
            try {
                locationManager.removeUpdates(it)
            } catch (_: Exception) {}
        }
        periodicListener = null
    }

    /**
     * Requests a fresh satellite fix up to [timeoutMs]. Returns early once GPS reaches
     * [targetAccuracyMeters] or better; otherwise picks the best fix or cached fallback.
     */
    @SuppressLint("MissingPermission")
    fun requestAccurateLocation(
        batteryPct: Int,
        timeoutMs: Long = 25_000L,
        targetAccuracyMeters: Float = 20f,
        onResult: (GpsFixResult) -> Unit
    ) {
        if (!hasLocationPermission()) {
            onResult(GpsFixResult(TrackerPrefs.getLastLocation(context), isCachedFallback = true))
            return
        }

        mainHandler.post {
            var finished = false
            var bestLocation: Location? = null
            var listenerRef: LocationListener? = null
            var timeoutRunnable: Runnable? = null

            fun finishWith(location: Location?, isCached: Boolean) {
                if (finished) return
                finished = true
                timeoutRunnable?.let { mainHandler.removeCallbacks(it) }
                listenerRef?.let {
                    try {
                        locationManager.removeUpdates(it)
                    } catch (_: Exception) {}
                }

                if (location != null) {
                    val now = System.currentTimeMillis()
                    val locTime = location.time
                    val effectiveTime = if (!isCached && locTime in 1..now && (now - locTime) <= 60_000L) {
                        locTime
                    } else {
                        now
                    }
                    val point = LocationPoint(
                        latitude = location.latitude,
                        longitude = location.longitude,
                        accuracy = location.accuracy,
                        provider = location.provider ?: "gps",
                        battery = batteryPct,
                        timestamp = effectiveTime
                    )
                    onResult(GpsFixResult(point, isCachedFallback = isCached))
                } else {
                    val cached = TrackerPrefs.getLastLocation(context)?.copy(
                        battery = batteryPct,
                        timestamp = System.currentTimeMillis()
                    )
                    onResult(GpsFixResult(cached, isCachedFallback = true))
                }
            }

            val listener = object : LocationListener {
                override fun onLocationChanged(location: Location) {
                    if (finished || !isValidLocation(location)) return
                    val currentBest = bestLocation
                    if (currentBest == null || isBetterLocation(location, currentBest)) {
                        bestLocation = location
                    }
                    val isGps = location.provider == LocationManager.GPS_PROVIDER
                    val acceptableAccuracy = if (isGps) targetAccuracyMeters else maxOf(targetAccuracyMeters * 2.5f, 75f)
                    if (location.accuracy <= acceptableAccuracy) {
                        finishWith(location, isCached = false)
                    }
                }

                @Deprecated("Deprecated in API 29")
                override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
            }
            listenerRef = listener

            var requestedAny = false
            val enabledProviders = try {
                locationManager.getProviders(true)
            } catch (_: Exception) {
                emptyList<String>()
            }
            for (p in enabledProviders) {
                try {
                    locationManager.requestLocationUpdates(
                        p,
                        1000L,
                        0f,
                        listener,
                        Looper.getMainLooper()
                    )
                    requestedAny = true
                } catch (_: Exception) {}
            }
            try {
                locationManager.requestLocationUpdates(
                    LocationManager.PASSIVE_PROVIDER,
                    1000L,
                    0f,
                    listener,
                    Looper.getMainLooper()
                )
                requestedAny = true
            } catch (_: Exception) {}

            if (!requestedAny) {
                finishWith(getBestLastKnownLocation(), isCached = true)
                return@post
            }

            val timeout = Runnable {
                val chosen = bestLocation ?: getBestLastKnownLocation()
                finishWith(chosen, isCached = bestLocation == null)
            }
            timeoutRunnable = timeout
            mainHandler.postDelayed(timeout, timeoutMs)
        }
    }

    @SuppressLint("MissingPermission")
    fun getBestLastKnownLocation(): Location? {
        if (!hasLocationPermission()) return null
        val providers = try {
            val list = mutableListOf(
                LocationManager.GPS_PROVIDER,
                LocationManager.NETWORK_PROVIDER,
                LocationManager.PASSIVE_PROVIDER
            )
            for (p in locationManager.allProviders) {
                if (!list.contains(p)) list.add(p)
            }
            list
        } catch (_: Exception) {
            listOf(
                LocationManager.GPS_PROVIDER,
                LocationManager.NETWORK_PROVIDER,
                LocationManager.PASSIVE_PROVIDER
            )
        }
        var best: Location? = null
        for (provider in providers) {
            val loc = try {
                locationManager.getLastKnownLocation(provider)
            } catch (_: Exception) {
                null
            } ?: continue
            if (!isValidLocation(loc)) continue
            if (provider == LocationManager.PASSIVE_PROVIDER && loc.accuracy > 250f) continue
            if (best == null || isBetterLocation(loc, best)) {
                best = loc
            }
        }
        return best
    }

    private fun isBetterLocation(candidate: Location, currentBest: Location): Boolean {
        if (!isValidLocation(candidate)) return false
        val timeDelta = candidate.time - currentBest.time
        val accDelta = candidate.accuracy - currentBest.accuracy

        // Fresh/recent GPS or substantially more accurate fix wins over coarse cache.
        if (candidate.provider == LocationManager.GPS_PROVIDER &&
            currentBest.provider != LocationManager.GPS_PROVIDER &&
            candidate.accuracy <= 50f &&
            timeDelta >= -60_000L
        ) {
            return true
        }
        if (accDelta <= -50f && timeDelta >= -5 * 60_000L) return true

        if (timeDelta > 60_000L) {
            // Do not let a coarse cell-tower/network fix overwrite a much sharper fix just by being >60s newer.
            val acceptableAccuracy = candidate.accuracy <= 100f ||
                candidate.accuracy <= currentBest.accuracy * 2f ||
                (timeDelta > 30 * 60_000L && candidate.accuracy <= 500f)
            return acceptableAccuracy
        }
        if (timeDelta < -60_000L) return false

        return when {
            accDelta < 0f -> true
            timeDelta > 0L && accDelta <= 50f && candidate.provider == currentBest.provider -> true
            else -> false
        }
    }
}

internal fun isValidLocation(loc: Location): Boolean {
    if (loc.latitude.isNaN() || loc.longitude.isNaN()) return false
    if (loc.latitude == 0.0 && loc.longitude == 0.0) return false
    return loc.hasAccuracy() && loc.accuracy > 0f && loc.accuracy <= 2000f
}

internal fun haversineMeters(lat1: Double, lng1: Double, lat2: Double, lng2: Double): Double {
    val r = 6_371_000.0
    val dLat = Math.toRadians(lat2 - lat1)
    val dLng = Math.toRadians(lng2 - lng1)
    val a = kotlin.math.sin(dLat / 2) * kotlin.math.sin(dLat / 2) +
        kotlin.math.cos(Math.toRadians(lat1)) * kotlin.math.cos(Math.toRadians(lat2)) *
        kotlin.math.sin(dLng / 2) * kotlin.math.sin(dLng / 2)
    return 2.0 * r * kotlin.math.atan2(kotlin.math.sqrt(a), kotlin.math.sqrt(1.0 - a))
}

/**
 * Rejects coarse network/BTS bounces, stationary Wi-Fi hotspot BSSID jumps,
 * and single-sample GPS teleports when an accurate anchor exists.
 */
internal fun shouldAcceptLocationCandidate(
    candLat: Double,
    candLng: Double,
    candAcc: Float,
    candProvider: String,
    candTimeMs: Long,
    anchorLat: Double?,
    anchorLng: Double?,
    anchorAcc: Float,
    anchorTimeMs: Long,
    nowMs: Long,
    hasMotionSensor: Boolean = false,
    lastMotionMs: Long = nowMs,
    isMeteredWifi: Boolean = false
): Boolean {
    if (candLat.isNaN() || candLng.isNaN() || (candLat == 0.0 && candLng == 0.0)) return false
    if (candAcc <= 0f) return false
    if (anchorLat == null || anchorLng == null) return candAcc <= 3000f
    if (candAcc > 1500f) return false

    val dist = haversineMeters(anchorLat, anchorLng, candLat, candLng)
    val ageMs = (nowMs - anchorTimeMs).coerceAtLeast(0L)
    val isNonGps = candProvider != LocationManager.GPS_PROVIDER

    if (candAcc > 150f && candAcc > anchorAcc * 2f) {
        val overlapRadius = maxOf(candAcc * 2.5, 400.0)
        if (dist <= overlapRadius) return false
        if (isNonGps && ageMs < 30 * 60_000L) return false
    }

    // Hardware stationary guard: if Significant Motion sensor reports no physical movement
    // since the anchor was locked (or >60s on a metered mobile hotspot), reject network/Wi-Fi jumps >150m.
    if (hasMotionSensor && isNonGps && dist > 150.0) {
        val idleMs = (nowMs - lastMotionMs).coerceAtLeast(0L)
        val noMotionSinceAnchor = lastMotionMs < anchorTimeMs && idleMs >= 120_000L
        val hotspotWithoutRecentMotion = isMeteredWifi && idleMs >= 60_000L
        if (noMotionSinceAnchor || hotspotWithoutRecentMotion) return false
    }

    if (candTimeMs > anchorTimeMs) {
        val dtSec = ((candTimeMs - anchorTimeMs) / 1000.0).coerceAtLeast(1.0)
        val maxSpeedMps = if (isNonGps) 55.0 else 85.0
        if (dtSec <= 120.0 && dist / dtSec > maxSpeedMps) return false
    }

    return true
}
