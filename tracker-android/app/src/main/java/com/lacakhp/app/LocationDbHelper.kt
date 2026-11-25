package com.lacakhp.app

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import android.os.UserManager

data class LocationPoint(
    val id: Long = 0L,
    val latitude: Double,
    val longitude: Double,
    val accuracy: Float,
    val provider: String,
    val battery: Int,
    val timestamp: Long,
    val synced: Boolean = false
)

/**
 * Local SQLite queue in Device-Protected storage so GPS coordinates recorded
 * before unlock or while data is off are persisted and flushed via NostrRelayClient.
 */
class LocationDbHelper(context: Context) :
    SQLiteOpenHelper(resolveDbContext(context), DB_NAME, null, DB_VERSION) {

    companion object {
        private const val DB_NAME = "lacakhp_locations.db"
        private const val DB_VERSION = 1
        private const val TABLE = "location_queue"
        private const val MAX_STORED_ROWS = 2000

        private fun resolveDbContext(context: Context): Context {
            val de = context.createDeviceProtectedStorageContext()
            try {
                val um = context.getSystemService(Context.USER_SERVICE) as? UserManager
                if (um?.isUserUnlocked == true &&
                    !de.getDatabasePath(DB_NAME).exists() &&
                    context.getDatabasePath(DB_NAME).exists()
                ) {
                    de.moveDatabaseFrom(context, DB_NAME)
                }
            } catch (_: Exception) {}
            return de
        }
    }

    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL(
            """
            CREATE TABLE $TABLE (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                accuracy REAL NOT NULL,
                provider TEXT NOT NULL,
                battery INTEGER NOT NULL,
                timestamp INTEGER NOT NULL,
                synced INTEGER NOT NULL DEFAULT 0
            )
            """.trimIndent()
        )
        db.execSQL("CREATE INDEX idx_location_synced_ts ON $TABLE (synced, timestamp)")
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        db.execSQL("DROP TABLE IF EXISTS $TABLE")
        onCreate(db)
    }

    @Synchronized
    fun insertPoint(point: LocationPoint): Long {
        val db = writableDatabase
        val values = ContentValues().apply {
            put("latitude", point.latitude)
            put("longitude", point.longitude)
            put("accuracy", point.accuracy)
            put("provider", point.provider)
            put("battery", point.battery)
            put("timestamp", point.timestamp)
            put("synced", if (point.synced) 1 else 0)
        }
        val rowId = db.insert(TABLE, null, values)
        pruneIfNeeded(db)
        return rowId
    }

    @Synchronized
    fun getUnsyncedPoints(limit: Int = 50): List<LocationPoint> {
        val list = mutableListOf<LocationPoint>()
        val db = readableDatabase
        db.rawQuery(
            "SELECT id, latitude, longitude, accuracy, provider, battery, timestamp, synced " +
                "FROM $TABLE WHERE synced = 0 ORDER BY timestamp ASC LIMIT ?",
            arrayOf(limit.toString())
        ).use { cursor ->
            while (cursor.moveToNext()) {
                list.add(
                    LocationPoint(
                        id = cursor.getLong(0),
                        latitude = cursor.getDouble(1),
                        longitude = cursor.getDouble(2),
                        accuracy = cursor.getFloat(3),
                        provider = cursor.getString(4),
                        battery = cursor.getInt(5),
                        timestamp = cursor.getLong(6),
                        synced = cursor.getInt(7) == 1
                    )
                )
            }
        }
        return list
    }

    @Synchronized
    fun markSynced(ids: List<Long>) {
        if (ids.isEmpty()) return
        val db = writableDatabase
        val placeholders = ids.joinToString(",") { "?" }
        val args = ids.map { it.toString() }.toTypedArray()
        db.execSQL("UPDATE $TABLE SET synced = 1 WHERE id IN ($placeholders)", args)
    }

    @Synchronized
    fun countUnsynced(): Int {
        val db = readableDatabase
        db.rawQuery("SELECT COUNT(*) FROM $TABLE WHERE synced = 0", null).use { cursor ->
            return if (cursor.moveToFirst()) cursor.getInt(0) else 0
        }
    }

    private fun pruneIfNeeded(db: SQLiteDatabase) {
        // Keep queue bounded so long offline periods do not exhaust app storage.
        db.execSQL(
            """
            DELETE FROM $TABLE
            WHERE id NOT IN (
                SELECT id FROM $TABLE ORDER BY timestamp DESC LIMIT $MAX_STORED_ROWS
            )
            """.trimIndent()
        )
    }
}
