package com.lacakhp.app

import android.util.Base64
import fr.acinq.secp256k1.Secp256k1
import org.json.JSONArray
import org.json.JSONObject
import java.nio.charset.StandardCharsets
import java.security.MessageDigest
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec

data class DerivedKeys(
    val aesKeyBytes: ByteArray,
    val nostrPrivKeyBytes: ByteArray,
    val nostrPubKeyHex: String,
    val version: String
)

/**
 * Provides zero-knowledge E2EE (AES-256-GCM) and Nostr BIP-340 Schnorr signing
 * derived deterministically from (deviceId + secret) via PBKDF2 v2 or legacy SHA-256 v1.
 */
object CryptoHelper {

    const val VERSION_V1 = "v1"
    const val VERSION_V2 = "v2"
    private const val PBKDF2_ITERATIONS = 100_000

    private val random = SecureRandom()

    @Volatile
    private var cachedKeys: Pair<String, DerivedKeys>? = null

    // 256 unambiguous Indonesian/common words -> 12 words = 96 bits of entropy.
    private val WORDLIST = listOf(
        "abadi", "awan", "angin", "api", "apel", "asam", "atap", "ayam",
        "badai", "baja", "bakti", "balai", "bambu", "bangku", "banjir", "bantu",
        "bara", "baris", "batik", "batu", "bawang", "bayam", "bayi", "bebek",
        "bedug", "bekal", "belah", "belut", "benang", "benda", "benih", "beras",
        "berita", "besi", "beton", "biaya", "bibir", "bibit", "bidan", "bintang",
        "biola", "biru", "bisa", "bisik", "bola", "boneka", "borong", "botol",
        "buah", "buana", "buaya", "bubur", "budaya", "budi", "buka", "bukit",
        "buku", "bulan", "bulu", "bumbu", "bunga", "buntut", "burung", "busur",
        "cabai", "cahaya", "cakap", "cakar", "camar", "candi", "cangkir", "capai",
        "cat", "catur", "celah", "cepat", "cerah", "cerita", "cermin", "cinta",
        "cipta", "cocok", "coba", "contoh", "corak", "cuaca", "cukup", "curah",
        "dada", "dadu", "dagang", "dahan", "dahulu", "damai", "danau", "dapur",
        "darat", "darah", "dasar", "datang", "daun", "daya", "debu", "dekat",
        "delima", "demi", "denda", "dengar", "depan", "deras", "desa", "detik",
        "dewa", "diam", "didik", "dingin", "dini", "doa", "domba", "dompet",
        "dorong", "dua", "duduk", "duka", "dunia", "dupa", "duri", "dusun",
        "ekor", "elang", "emas", "embun", "empat", "enak", "enam", "enggan",
        "fajar", "fakir", "fasih", "fosil", "foto", "fungsi", "gading", "gagah",
        "gagak", "gajah", "gaji", "galak", "gali", "gambar", "gamelan", "gandum",
        "ganggu", "ganjil", "ganti", "garam", "garis", "garuda", "gasing", "gatal",
        "gaya", "gayung", "gedung", "gelang", "gelap", "gelas", "gelombang", "gema",
        "gempa", "gemuk", "gendang", "genap", "gerak", "gerbang", "gergaji", "getah",
        "gigi", "gigih", "gila", "gilir", "gitar", "gizi", "goa", "goda",
        "golok", "goreng", "gosok", "goyang", "gubuk", "gudang", "gugur", "gula",
        "gulung", "gumpal", "guna", "guncang", "gunting", "gunung", "gurau", "gurih",
        "guru", "guruh", "gusur", "habis", "hadap", "hadiah", "hadir", "hafal",
        "hajat", "hakim", "halaman", "halang", "halus", "hama", "hamba", "hampa",
        "hampir", "handuk", "hangat", "hantar", "hantu", "hapus", "harap", "harga",
        "hari", "harimau", "harta", "harum", "harus", "hasil", "hati", "haus",
        "hawa", "hebat", "helai", "hemat", "hembus", "hendak", "hening", "henti"
    )

    fun generateSeedphrase(wordCount: Int = 12): String {
        val words = List(wordCount) {
            WORDLIST[random.nextInt(WORDLIST.size)]
        }
        return words.joinToString(" ")
    }

    fun generateRandomHex(byteCount: Int = 2): String {
        val bytes = ByteArray(byteCount).apply { random.nextBytes(this) }
        return bytes.toHex()
    }

    fun normalizeSeedphrase(seedphrase: String): String {
        return seedphrase.trim()
            .lowercase()
            .replace(Regex("\\s+"), " ")
    }

    fun deriveKeys(
        deviceId: String,
        seedphrase: String,
        version: String = VERSION_V2
    ): DerivedKeys {
        val normDevice = deviceId.trim().lowercase()
        val normSeed = normalizeSeedphrase(seedphrase)
        val normVersion = if (version == VERSION_V1) VERSION_V1 else VERSION_V2
        val cacheKey = "$normVersion|$normDevice|$normSeed"

        cachedKeys?.let { (key, value) ->
            if (key == cacheKey) return value
        }

        val aesKeyBytes: ByteArray
        var privCandidate: ByteArray

        if (normVersion == VERSION_V1) {
            aesKeyBytes = sha256("lacakhp:aes:v1:$normDevice:$normSeed".toByteArray(StandardCharsets.UTF_8))
            privCandidate = sha256("lacakhp:nostr:v1:$normDevice:$normSeed".toByteArray(StandardCharsets.UTF_8))
        } else {
            val salt = "lacakhp:v2:$normDevice".toByteArray(StandardCharsets.UTF_8)
            val factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
            val spec = PBEKeySpec(normSeed.toCharArray(), salt, PBKDF2_ITERATIONS, 512)
            val master = try {
                factory.generateSecret(spec).encoded
            } finally {
                spec.clearPassword()
            }
            aesKeyBytes = master.copyOfRange(0, 32)
            privCandidate = master.copyOfRange(32, 64)
        }

        while (!Secp256k1.secKeyVerify(privCandidate)) {
            privCandidate = sha256(privCandidate)
        }

        val fullPub = Secp256k1.pubkeyCreate(privCandidate)
        val xOnlyPub = fullPub.copyOfRange(1, 33)

        val derived = DerivedKeys(
            aesKeyBytes = aesKeyBytes,
            nostrPrivKeyBytes = privCandidate,
            nostrPubKeyHex = xOnlyPub.toHex(),
            version = normVersion
        )
        cachedKeys = cacheKey to derived
        return derived
    }

    fun encryptPayload(aesKeyBytes: ByteArray, plaintext: String): String {
        val iv = ByteArray(12).apply { random.nextBytes(this) }
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, SecretKeySpec(aesKeyBytes, "AES"), GCMParameterSpec(128, iv))
        val ciphertext = cipher.doFinal(plaintext.toByteArray(StandardCharsets.UTF_8))

        val flags = Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP
        val ivB64 = Base64.encodeToString(iv, flags)
        val ctB64 = Base64.encodeToString(ciphertext, flags)
        return "v1:$ivB64:$ctB64"
    }

    /**
     * Builds and signs a NIP-01 Nostr event JSON object ready for ["EVENT", <obj>].
     */
    fun createSignedNostrEvent(
        keys: DerivedKeys,
        kind: Int,
        createdAtSec: Long,
        tags: List<List<String>>,
        encryptedContent: String
    ): Pair<String, String> {
        val tagsArray = JSONArray()
        for (tag in tags) {
            val inner = JSONArray()
            for (v in tag) inner.put(v)
            tagsArray.put(inner)
        }

        // Canonical NIP-01 commitment serialization (no extra whitespace, no '/' escaping).
        val canonical = buildString {
            append("[0,")
            append(JSONObject.quote(keys.nostrPubKeyHex))
            append(",")
            append(createdAtSec)
            append(",")
            append(kind)
            append(",")
            append(tagsArray.toString())
            append(",")
            append(JSONObject.quote(encryptedContent))
            append("]")
        }

        val idBytes = sha256(canonical.toByteArray(StandardCharsets.UTF_8))
        val idHex = idBytes.toHex()
        val auxRand = ByteArray(32).apply { random.nextBytes(this) }
        val sigBytes = Secp256k1.signSchnorr(idBytes, keys.nostrPrivKeyBytes, auxRand)
        val sigHex = sigBytes.toHex()

        val eventObj = JSONObject().apply {
            put("id", idHex)
            put("pubkey", keys.nostrPubKeyHex)
            put("created_at", createdAtSec)
            put("kind", kind)
            put("tags", tagsArray)
            put("content", encryptedContent)
            put("sig", sigHex)
        }
        return Pair(idHex, eventObj.toString())
    }

    private fun sha256(input: ByteArray): ByteArray {
        return MessageDigest.getInstance("SHA-256").digest(input)
    }

    private fun ByteArray.toHex(): String = joinToString("") { "%02x".format(it) }
}
