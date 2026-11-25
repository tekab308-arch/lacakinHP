package com.lacakhp.app

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Build
import android.util.Log
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/**
 * Publishes E2EE-encrypted GPS coordinates to multiple decentralized Nostr relays
 * over WebSockets so no single server or admin can read or censor location updates.
 */
object NostrRelayClient {
    private const val TAG = "NostrRelayClient"
    const val KIND_HISTORY = 3078
    const val KIND_LATEST = 30078
    private const val RELAY_COOLDOWN_MS = 10 * 60_000L
    private const val RELAY_FAIL_THRESHOLD = 3

    private val relayFailureCounts = ConcurrentHashMap<String, Int>()
    private val relayCooldownUntilMs = ConcurrentHashMap<String, Long>()

    private val client = OkHttpClient.Builder()
        .connectTimeout(6, TimeUnit.SECONDS)
        .readTimeout(8, TimeUnit.SECONDS)
        .writeTimeout(8, TimeUnit.SECONDS)
        .build()

    fun isNetworkOnline(context: Context): Boolean {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = cm.activeNetwork ?: return false
        val caps = cm.getNetworkCapabilities(network) ?: return false
        // Do NOT require NET_CAPABILITY_VALIDATED: Huawei/HarmonyOS devices without Google Play Services
        // (and some ISP/Wi-Fi setups) fail Google's connectivity probe and never flag the network as
        // validated even though the internet works, which silently blocked every relay upload.
        // If the network is truly down, the WebSocket attempt fails and points stay safely queued.
        return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    /**
     * Publishes a lightweight replaceable kind-30078 heartbeat (no SQLite/kind-3078 history bloat)
     * when the device is stationary so battery% & "Laporan Terakhir" remain live.
     */
    fun publishLatestHeartbeat(context: Context, pt: LocationPoint, battery: Int): Boolean {
        if (!isNetworkOnline(context)) return false
        val relays = TrackerPrefs.getRelays(context)
        if (relays.isEmpty()) return false

        val keys = CryptoHelper.deriveKeys(
            TrackerPrefs.getDeviceId(context),
            TrackerPrefs.getSeedphrase(context),
            TrackerPrefs.getCryptoVersion(context)
        )
        val payload = JSONObject().apply {
            put("lat", pt.latitude)
            put("lng", pt.longitude)
            put("acc", pt.accuracy.toDouble())
            put("prv", pt.provider)
            put("bat", if (pt.battery >= 0) pt.battery else battery)
            put("ts", pt.timestamp)
            put("mdl", "${Build.MANUFACTURER.uppercase()} ${Build.MODEL}")
        }.toString()

        val encrypted = CryptoHelper.encryptPayload(keys.aesKeyBytes, payload)
        val nowSec = System.currentTimeMillis() / 1000L
        val (eventId, latestEventJson) = CryptoHelper.createSignedNostrEvent(
            keys = keys,
            kind = KIND_LATEST,
            createdAtSec = nowSec,
            tags = listOf(listOf("d", "lacakhp-latest")),
            encryptedContent = encrypted
        )
        val frames = listOf("[\"EVENT\",$latestEventJson]")
        val expected = setOf(eventId)

        val (primaryAccepted, okRelayCount) = publishBatchToRelays(relays, frames, expected)
        if (okRelayCount < 2) {
            val backupRelays = TrackerPrefs.FALLBACK_RELAYS.filterNot { relays.contains(it) }
            if (backupRelays.isNotEmpty()) {
                val (backupAccepted, _) = publishBatchToRelays(backupRelays, frames, expected)
                return primaryAccepted.isNotEmpty() || backupAccepted.isNotEmpty()
            }
        }
        return primaryAccepted.isNotEmpty()
    }

    /**
     * Encrypts and flushes unsynced points in SQLite to configured Nostr relays.
     * Must be called from a background thread.
     */
    fun flushQueue(context: Context, db: LocationDbHelper, battery: Int): Int {
        if (!isNetworkOnline(context)) return 0

        val relays = TrackerPrefs.getRelays(context)
        if (relays.isEmpty()) return 0

        val deviceId = TrackerPrefs.getDeviceId(context)
        val seedphrase = TrackerPrefs.getSeedphrase(context)
        val cryptoVersion = TrackerPrefs.getCryptoVersion(context)
        val keys = CryptoHelper.deriveKeys(deviceId, seedphrase, cryptoVersion)

        var totalSynced = 0
        while (true) {
            val batch = db.getUnsyncedPoints(limit = 20)
            if (batch.isEmpty()) break

            val eventFrames = mutableListOf<Pair<Long, String>>()
            val idToRowId = HashMap<String, Long>()
            var latestEncrypted: String? = null
            var latestTimestamp = 0L

            for (pt in batch) {
                val payload = JSONObject().apply {
                    put("lat", pt.latitude)
                    put("lng", pt.longitude)
                    put("acc", pt.accuracy.toDouble())
                    put("prv", pt.provider)
                    put("bat", if (pt.battery >= 0) pt.battery else battery)
                    put("ts", pt.timestamp)
                    put("mdl", "${Build.MANUFACTURER.uppercase()} ${Build.MODEL}")
                }.toString()

                val encrypted = CryptoHelper.encryptPayload(keys.aesKeyBytes, payload)
                val createdAtSec = clampCreatedAtSeconds(pt.timestamp)

                val (eventId, eventJson) = CryptoHelper.createSignedNostrEvent(
                    keys = keys,
                    kind = KIND_HISTORY,
                    createdAtSec = createdAtSec,
                    tags = listOf(listOf("t", "lacakhp")),
                    encryptedContent = encrypted
                )
                idToRowId[eventId] = pt.id
                eventFrames.add(pt.id to "[\"EVENT\",$eventJson]")

                if (pt.timestamp >= latestTimestamp) {
                    latestTimestamp = pt.timestamp
                    latestEncrypted = encrypted
                }
            }

            // Also publish a parameterized replaceable event (kind 30078) for fast latest-point lookup.
            if (latestEncrypted != null) {
                val nowSec = System.currentTimeMillis() / 1000L
                val (_, latestEventJson) = CryptoHelper.createSignedNostrEvent(
                    keys = keys,
                    kind = KIND_LATEST,
                    createdAtSec = nowSec,
                    tags = listOf(listOf("d", "lacakhp-latest")),
                    encryptedContent = latestEncrypted
                )
                eventFrames.add(-1L to "[\"EVENT\",$latestEventJson]")
            }

            val frameStrings = eventFrames.map { it.second }
            val (primaryAccepted, okRelayCount) = publishBatchToRelays(
                relays = relays,
                frames = frameStrings,
                expectedIds = idToRowId.keys
            )
            val allAcceptedIds = HashSet<String>(primaryAccepted)

            // Smart Auto-Failover: if fewer than 2 primary relays acknowledged, automatically
            // push to fallback relays so ISP throttling or relay downtime never drops coordinates.
            if (okRelayCount < 2) {
                val backupRelays = TrackerPrefs.FALLBACK_RELAYS.filterNot { relays.contains(it) }
                if (backupRelays.isNotEmpty()) {
                    Log.w(TAG, "Only $okRelayCount/${relays.size} primary relay(s) responded; triggering Auto-Failover to ${backupRelays.size} backup relays")
                    val (backupAccepted, _) = publishBatchToRelays(
                        relays = backupRelays,
                        frames = frameStrings,
                        expectedIds = idToRowId.keys
                    )
                    allAcceptedIds.addAll(backupAccepted)
                }
            }

            val syncedRowIds = allAcceptedIds.mapNotNull { idToRowId[it] }
            if (syncedRowIds.isEmpty()) {
                break
            }

            db.markSynced(syncedRowIds)
            totalSynced += syncedRowIds.size
            if (syncedRowIds.size < batch.size) break
        }

        return totalSynced
    }

    private fun filterHealthyRelays(relays: List<String>): List<String> {
        val now = System.currentTimeMillis()
        val healthy = relays.filter { (relayCooldownUntilMs[it] ?: 0L) <= now }
        return if (healthy.isNotEmpty()) healthy else relays
    }

    private fun recordRelaySuccess(url: String) {
        relayFailureCounts.remove(url)
        relayCooldownUntilMs.remove(url)
    }

    private fun recordRelayFailure(url: String) {
        val next = (relayFailureCounts[url] ?: 0) + 1
        relayFailureCounts[url] = next
        if (next >= RELAY_FAIL_THRESHOLD) {
            relayCooldownUntilMs[url] = System.currentTimeMillis() + RELAY_COOLDOWN_MS
        }
    }

    private fun publishBatchToRelays(
        relays: List<String>,
        frames: List<String>,
        expectedIds: Set<String>
    ): Pair<Set<String>, Int> {
        val activeRelays = filterHealthyRelays(relays)
        val acceptedIds = ConcurrentHashMap.newKeySet<String>()
        val successfulRelays = ConcurrentHashMap.newKeySet<String>()
        val quorumTarget = minOf(2, activeRelays.size)
        val doneLatch = CountDownLatch(activeRelays.size)
        val quorumLatch = CountDownLatch(1)
        val sockets = mutableListOf<WebSocket>()

        for (relayUrl in activeRelays) {
            val request = Request.Builder().url(relayUrl).build()
            val acksReceived = ConcurrentHashMap.newKeySet<String>()
            val relayAccepted = ConcurrentHashMap.newKeySet<String>()

            val ws = client.newWebSocket(request, object : WebSocketListener() {
                override fun onOpen(webSocket: WebSocket, response: Response) {
                    for (frame in frames) {
                        webSocket.send(frame)
                    }
                }

                override fun onMessage(webSocket: WebSocket, text: String) {
                    try {
                        val arr = JSONArray(text)
                        if (arr.length() >= 3 && arr.optString(0) == "OK") {
                            val eventId = arr.optString(1)
                            val ok = arr.optBoolean(2, false)
                            if (ok && expectedIds.contains(eventId)) {
                                acceptedIds.add(eventId)
                                relayAccepted.add(eventId)
                                successfulRelays.add(relayUrl)
                                recordRelaySuccess(relayUrl)
                            }
                            acksReceived.add(eventId)
                            if (acksReceived.size >= frames.size) {
                                webSocket.close(1000, "done")
                                doneLatch.countDown()
                                if (successfulRelays.size >= quorumTarget &&
                                    acceptedIds.containsAll(expectedIds)
                                ) {
                                    quorumLatch.countDown()
                                }
                            }
                        }
                    } catch (_: Exception) {}
                }

                override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
                    webSocket.close(1000, null)
                    doneLatch.countDown()
                }

                override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                    Log.w(TAG, "Relay $relayUrl failed: ${t.message}")
                    recordRelayFailure(relayUrl)
                    doneLatch.countDown()
                }
            })
            sockets.add(ws)
        }

        try {
            // Fast-finish once >=2 relays ACK all expected events instead of blocking 7s on a dead 3rd relay.
            val deadlineNs = System.nanoTime() + TimeUnit.SECONDS.toNanos(7)
            while (doneLatch.count > 0 && quorumLatch.count > 0) {
                val remMs = TimeUnit.NANOSECONDS.toMillis(deadlineNs - System.nanoTime())
                if (remMs <= 0) break
                quorumLatch.await(minOf(remMs, 250L), TimeUnit.MILLISECONDS)
            }
            if (quorumLatch.count == 0L && doneLatch.count > 0L) {
                doneLatch.await(350, TimeUnit.MILLISECONDS)
            }
        } catch (_: InterruptedException) {}

        for (ws in sockets) {
            try {
                ws.close(1000, "done")
            } catch (_: Exception) {}
        }

        Log.d(TAG, "Published ${acceptedIds.size}/${expectedIds.size} point(s) across ${successfulRelays.size}/${activeRelays.size} relay(s)")
        return acceptedIds to successfulRelays.size
    }

    private fun clampCreatedAtSeconds(timestampMs: Long): Long {
        val nowSec = System.currentTimeMillis() / 1000L
        val candidate = timestampMs / 1000L
        return if (candidate in (nowSec - 30 * 86400L)..(nowSec + 600L)) candidate else nowSec
    }
}
