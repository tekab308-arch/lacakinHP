package com.lacakhp.app

import android.app.job.JobInfo
import android.app.job.JobParameters
import android.app.job.JobScheduler
import android.app.job.JobService
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.core.content.ContextCompat
import java.util.concurrent.Executors

/**
 * Periodic JobScheduler watchdog (no external dependencies) that revives TrackerService
 * if the OS or OEM memory cleaner killed it while location permission is still granted.
 */
class TrackerWatchdogJob : JobService() {

    companion object {
        private const val TAG = "TrackerWatchdogJob"
        const val JOB_ID = 2041
        private const val WATCHDOG_INTERVAL_MS = 15 * 60 * 1000L
        private val fallbackExecutor = Executors.newSingleThreadExecutor()

        fun schedule(context: Context) {
            val appCtx = context.applicationContext
            if (!GpsLocator(appCtx).hasLocationPermission()) return
            val scheduler = appCtx.getSystemService(Context.JOB_SCHEDULER_SERVICE) as? JobScheduler ?: return
            if (scheduler.getPendingJob(JOB_ID) != null) return

            val job = JobInfo.Builder(
                JOB_ID,
                ComponentName(appCtx, TrackerWatchdogJob::class.java)
            )
                .setPeriodic(WATCHDOG_INTERVAL_MS)
                .setPersisted(true)
                .setRequiresBatteryNotLow(false)
                .setRequiresDeviceIdle(false)
                .build()

            try {
                scheduler.schedule(job)
            } catch (e: Exception) {
                Log.w(TAG, "Failed scheduling watchdog job: ${e.message}")
            }
        }

        fun cancel(context: Context) {
            val scheduler = context.applicationContext
                .getSystemService(Context.JOB_SCHEDULER_SERVICE) as? JobScheduler ?: return
            try {
                scheduler.cancel(JOB_ID)
            } catch (_: Exception) {}
        }
    }

    override fun onStartJob(params: JobParameters?): Boolean {
        val appCtx = applicationContext
        val gps = GpsLocator(appCtx)
        if (!gps.hasLocationPermission()) {
            cancel(appCtx)
            return false
        }

        if (TrackerService.isRunning) {
            return false
        }

        try {
            val intent = Intent(appCtx, TrackerService::class.java)
            ContextCompat.startForegroundService(appCtx, intent)
            Log.i(TAG, "Revived TrackerService from JobScheduler watchdog")
            return false
        } catch (e: Exception) {
            Log.w(TAG, "Background FGS start blocked in watchdog (${e.javaClass.simpleName}); running IO fallback")
        }

        fallbackExecutor.execute {
            try {
                val best = gps.getBestLastKnownLocation()
                if (best != null) {
                    val pt = LocationPoint(
                        latitude = best.latitude,
                        longitude = best.longitude,
                        accuracy = best.accuracy,
                        provider = best.provider ?: "watchdog",
                        battery = -1,
                        timestamp = System.currentTimeMillis()
                    )
                    TrackerPrefs.saveLastLocation(appCtx, pt)
                    LocationDbHelper(appCtx).use { db ->
                        db.insertPoint(pt)
                        NostrRelayClient.flushQueue(appCtx, db, -1)
                    }
                } else {
                    LocationDbHelper(appCtx).use { db ->
                        NostrRelayClient.flushQueue(appCtx, db, -1)
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Watchdog IO fallback error: ${e.message}")
            } finally {
                jobFinished(params, false)
            }
        }
        return true
    }

    override fun onStopJob(params: JobParameters?): Boolean = false
}
