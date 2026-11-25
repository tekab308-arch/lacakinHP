package com.lacakhp.app

import android.Manifest
import android.app.Activity
import android.app.KeyguardManager
import android.app.admin.DevicePolicyManager
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.Rect
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.text.method.PasswordTransformationMethod
import android.util.Log
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import com.google.android.material.card.MaterialCardView
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : AppCompatActivity() {

    private lateinit var rootScrollView: ScrollView
    private lateinit var cardAntiScamTop: MaterialCardView
    private lateinit var tvApkSignatureBadge: TextView
    private lateinit var cardReadinessBanner: MaterialCardView
    private lateinit var tvReadinessBanner: TextView
    private lateinit var tvVariantSubtitle: TextView
    private lateinit var tvEmergencyDeviceId: TextView
    private lateinit var tvSecurityModeBadge: TextView
    private lateinit var tvSeedLabel: TextView
    private lateinit var btnToggleReveal: Button
    private lateinit var tvSeedphrasePreview: TextView
    private lateinit var btnShareCard: Button
    private lateinit var btnRegenSeed: Button

    private lateinit var tvServiceStatus: TextView
    private lateinit var tvNetworkStatus: TextView
    private lateinit var tvLastCoords: TextView
    private lateinit var tvLastMeta: TextView
    private lateinit var tvQueueCount: TextView
    private lateinit var btnSyncNow: Button
    private lateinit var btnOpenMaps: Button
    private lateinit var btnSimLastGasp: Button
    private lateinit var btnCheckReadiness: Button

    private lateinit var btnPermTransparency: Button
    private lateinit var rowPermLocation: LinearLayout
    private lateinit var tvPermLocation: TextView
    private lateinit var btnPermLocation: Button
    private lateinit var rowPermBgLocation: LinearLayout
    private lateinit var tvPermBgLocation: TextView
    private lateinit var btnPermBgLocation: Button
    private lateinit var rowPermSms: LinearLayout
    private lateinit var tvPermSms: TextView
    private lateinit var btnPermSms: Button
    private lateinit var rowPermBattery: LinearLayout
    private lateinit var tvPermBattery: TextView
    private lateinit var btnPermBattery: Button
    private lateinit var tvPermAdmin: TextView
    private lateinit var btnPermAdmin: Button
    private lateinit var rowPermSim: LinearLayout
    private lateinit var tvPermSim: TextView
    private lateinit var btnPermSim: Button
    private lateinit var tvPermStealth: TextView
    private lateinit var btnPermStealth: Button

    private lateinit var sectionSmsConfig: LinearLayout
    private lateinit var btnToggleAdvanced: Button
    private lateinit var layoutAdvancedConfig: LinearLayout
    private lateinit var etTrustedNumbers: EditText
    private lateinit var etSmsKeyword: EditText
    private lateinit var etDeviceId: EditText
    private lateinit var etSeedphrase: EditText
    private lateinit var etRelays: EditText
    private lateinit var tvSmsHelp: TextView
    private lateinit var btnSaveConfig: Button
    private lateinit var btnTestSms: Button

    private lateinit var dbHelper: LocationDbHelper
    private var isKeyRevealed = false
    private var isAdvancedExpanded = false
    private var hasPromptedAdminThisSession = false
    private var isAwaitingCredential = false
    private var isManualSmsPermRequest = false
    private var pendingSecureAction: (() -> Unit)? = null

    private val confirmDeviceCredential = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        isAwaitingCredential = false
        if (result.resultCode == Activity.RESULT_OK) {
            val action = pendingSecureAction
            pendingSecureAction = null
            action?.invoke()
        } else {
            pendingSecureAction = null
            Toast.makeText(this, "Verifikasi kunci layar dibatalkan", Toast.LENGTH_SHORT).show()
        }
    }

    private val stateReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            refreshDashboard()
        }
    }

    private val requestMultiplePermissions = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) {
        val wasManualSms = isManualSmsPermRequest
        isManualSmsPermRequest = false
        updatePermissionsUI()
        if (hasForegroundLocation()) {
            startTrackerService()
        }
        if (wasManualSms && VariantSmsBridge.hasSmsSupport && !VariantSmsBridge.hasPermissions(this)) {
            showSmsRestrictedSettingsGuideDialog()
        }
    }

    private val requestBackgroundLocation = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) {
        updatePermissionsUI()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        dbHelper = LocationDbHelper(applicationContext)

        bindViews()
        setupKeyboardAndWindowInsets()
        applyVariantVisibility()
        loadConfigToInputs()
        setupListeners()
        requestStartupPermissions()
        if (hasForegroundLocation()) {
            startTrackerService()
        }
        checkInitialSetup()
        checkForAppUpdate(silentIfUpToDate = true)
    }

    override fun onResume() {
        super.onResume()
        applySecretMasking()
        updatePermissionsUI()
        refreshDashboard()

        val filter = IntentFilter(TrackerService.ACTION_BROADCAST_STATE)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(stateReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(stateReceiver, filter)
        }

        if (TrackerPrefs.isSetupCompleted(this) && !isAwaitingCredential) {
            promptDeviceAdminIfNeeded()
        }
    }

    override fun onPause() {
        super.onPause()
        isKeyRevealed = false
        try {
            unregisterReceiver(stateReceiver)
        } catch (_: Exception) {}
    }

    private fun bindViews() {
        rootScrollView = findViewById(R.id.root_scroll_view)
        cardAntiScamTop = findViewById(R.id.card_anti_scam_top)
        tvApkSignatureBadge = findViewById(R.id.tv_apk_signature_badge)
        cardReadinessBanner = findViewById(R.id.card_readiness_banner)
        tvReadinessBanner = findViewById(R.id.tv_readiness_banner)
        tvVariantSubtitle = findViewById(R.id.tv_variant_subtitle)
        tvEmergencyDeviceId = findViewById(R.id.tv_emergency_device_id)
        tvSecurityModeBadge = findViewById(R.id.tv_security_mode_badge)
        tvSeedLabel = findViewById(R.id.tv_seed_label)
        btnToggleReveal = findViewById(R.id.btn_toggle_reveal)
        tvSeedphrasePreview = findViewById(R.id.tv_seedphrase_preview)
        btnShareCard = findViewById(R.id.btn_share_card)
        btnRegenSeed = findViewById(R.id.btn_regen_seed)

        tvServiceStatus = findViewById(R.id.tv_service_status)
        tvNetworkStatus = findViewById(R.id.tv_network_status)
        tvLastCoords = findViewById(R.id.tv_last_coords)
        tvLastMeta = findViewById(R.id.tv_last_meta)
        tvQueueCount = findViewById(R.id.tv_queue_count)
        btnSyncNow = findViewById(R.id.btn_sync_now)
        btnOpenMaps = findViewById(R.id.btn_open_maps)
        btnSimLastGasp = findViewById(R.id.btn_sim_last_gasp)
        btnCheckReadiness = findViewById(R.id.btn_check_readiness)

        btnPermTransparency = findViewById(R.id.btn_perm_transparency)
        rowPermLocation = findViewById(R.id.row_perm_location)
        tvPermLocation = findViewById(R.id.tv_perm_location)
        btnPermLocation = findViewById(R.id.btn_perm_location)
        rowPermBgLocation = findViewById(R.id.row_perm_bg_location)
        tvPermBgLocation = findViewById(R.id.tv_perm_bg_location)
        btnPermBgLocation = findViewById(R.id.btn_perm_bg_location)
        rowPermSms = findViewById(R.id.row_perm_sms)
        tvPermSms = findViewById(R.id.tv_perm_sms)
        btnPermSms = findViewById(R.id.btn_perm_sms)
        rowPermBattery = findViewById(R.id.row_perm_battery)
        tvPermBattery = findViewById(R.id.tv_perm_battery)
        btnPermBattery = findViewById(R.id.btn_perm_battery)
        tvPermAdmin = findViewById(R.id.tv_perm_admin)
        btnPermAdmin = findViewById(R.id.btn_perm_admin)
        rowPermSim = findViewById(R.id.row_perm_sim)
        tvPermSim = findViewById(R.id.tv_perm_sim)
        btnPermSim = findViewById(R.id.btn_perm_sim)
        tvPermStealth = findViewById(R.id.tv_perm_stealth)
        btnPermStealth = findViewById(R.id.btn_perm_stealth)

        sectionSmsConfig = findViewById(R.id.section_sms_config)
        btnToggleAdvanced = findViewById(R.id.btn_toggle_advanced)
        layoutAdvancedConfig = findViewById(R.id.layout_advanced_config)
        etTrustedNumbers = findViewById(R.id.et_trusted_numbers)
        etSmsKeyword = findViewById(R.id.et_sms_keyword)
        etDeviceId = findViewById(R.id.et_device_id)
        etSeedphrase = findViewById(R.id.et_seedphrase)
        etRelays = findViewById(R.id.et_relays)
        tvSmsHelp = findViewById(R.id.tv_sms_help)
        btnSaveConfig = findViewById(R.id.btn_save_config)
        btnTestSms = findViewById(R.id.btn_test_sms)
    }

    private fun setupKeyboardAndWindowInsets() {
        val density = resources.displayMetrics.density
        val extraBottomPx = (28 * density).toInt()

        ViewCompat.setOnApplyWindowInsetsListener(rootScrollView) { view, windowInsets ->
            val sysBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
            val ime = windowInsets.getInsets(WindowInsetsCompat.Type.ime())
            val bottomInset = maxOf(sysBars.bottom, ime.bottom) + extraBottomPx
            view.setPadding(sysBars.left, sysBars.top, sysBars.right, bottomInset)

            if (ime.bottom > 0) {
                currentFocus?.let { focused ->
                    if (focused is EditText) {
                        scrollToInputView(focused)
                    }
                }
            }
            windowInsets
        }

        val inputs = listOf(etTrustedNumbers, etSmsKeyword, etDeviceId, etSeedphrase, etRelays)
        for (input in inputs) {
            input.setOnFocusChangeListener { v, hasFocus ->
                if (hasFocus) {
                    scrollToInputView(v)
                }
            }
            input.setOnClickListener { v ->
                scrollToInputView(v)
            }
        }
    }

    private fun scrollToInputView(target: View) {
        rootScrollView.postDelayed({
            if (isFinishing || isDestroyed) return@postDelayed
            try {
                val rect = Rect()
                target.getDrawingRect(rect)
                rootScrollView.offsetDescendantRectToMyCoords(target, rect)
                val density = resources.displayMetrics.density
                val topMarginPx = (84 * density).toInt()
                val desiredY = (rect.top - topMarginPx).coerceAtLeast(0)
                rootScrollView.smoothScrollTo(0, desiredY)
            } catch (_: Exception) {}
        }, 140L)
    }

    private fun applyVariantVisibility() {
        if (!VariantSmsBridge.hasSmsSupport) {
            tvVariantSubtitle.text = "Pelacak darurat gratis & privat (Mode Internet)"
            rowPermSms.visibility = View.GONE
            rowPermSim.visibility = View.GONE
            sectionSmsConfig.visibility = View.GONE
            tvSmsHelp.visibility = View.GONE
            btnTestSms.visibility = View.GONE
            isAdvancedExpanded = true
            layoutAdvancedConfig.visibility = View.VISIBLE
            btnToggleAdvanced.visibility = View.GONE
        }
    }

    private fun loadConfigToInputs() {
        val deviceId = TrackerPrefs.getDeviceId(this)
        val seedphrase = TrackerPrefs.getSeedphrase(this)
        val mode = TrackerPrefs.getSecurityMode(this)
        val version = TrackerPrefs.getCryptoVersion(this)

        val modeLabel = if (mode == TrackerPrefs.MODE_SIMPLE) "Kata Sandi Pribadi" else "12 Kata Seed (BIP-39)"
        val verLabel = if (version == CryptoHelper.VERSION_V2) "v2 PBKDF2-100k" else "v1 Legacy"
        tvSecurityModeBadge.text = "Mode: $modeLabel • $verLabel"
        tvSeedLabel.text = if (mode == TrackerPrefs.MODE_SIMPLE) "Kata Sandi Rahasia:" else "Seedphrase Rahasia (12 Kata):"

        tvEmergencyDeviceId.text = "ID Perangkat: $deviceId"

        etTrustedNumbers.setText(TrackerPrefs.getTrustedNumbers(this))
        etSmsKeyword.setText(TrackerPrefs.getSmsKeyword(this))
        etDeviceId.setText(deviceId)
        etSeedphrase.setText(seedphrase)
        etRelays.setText(TrackerPrefs.getRelaysString(this))

        applySecretMasking()
    }

    private fun applySecretMasking() {
        val seedphrase = TrackerPrefs.getSeedphrase(this)
        if (isKeyRevealed) {
            tvSeedphrasePreview.text = seedphrase
            btnToggleReveal.text = "Tutup"
            etSeedphrase.transformationMethod = null
            etSeedphrase.isEnabled = true
        } else {
            tvSeedphrasePreview.text = "•••••• •••••• •••••• (Ketuk 'Buka Kunci')"
            btnToggleReveal.text = "Buka Kunci"
            etSeedphrase.transformationMethod = PasswordTransformationMethod.getInstance()
            etSeedphrase.isEnabled = false
        }
    }

    private fun requireDeviceCredential(title: String, reason: String, onVerified: () -> Unit) {
        val km = getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
        if (!km.isDeviceSecure) {
            onVerified()
            return
        }
        @Suppress("DEPRECATION")
        val authIntent = km.createConfirmDeviceCredentialIntent(title, reason)
        if (authIntent == null) {
            onVerified()
            return
        }
        pendingSecureAction = onVerified
        isAwaitingCredential = true
        confirmDeviceCredential.launch(authIntent)
    }

    private fun setupListeners() {
        cardAntiScamTop.setOnClickListener {
            showApkIntegrityDialog()
        }

        btnToggleReveal.setOnClickListener {
            if (isKeyRevealed) {
                isKeyRevealed = false
                applySecretMasking()
            } else {
                requireDeviceCredential(
                    "Buka Kunci Rahasia",
                    "Verifikasi PIN/Sidik Jari layar HP untuk melihat atau mengubah kunci dekripsi."
                ) {
                    isKeyRevealed = true
                    applySecretMasking()
                }
            }
        }

        btnShareCard.setOnClickListener {
            requireDeviceCredential(
                "Kirim Kartu Darurat",
                "Verifikasi PIN/Sidik Jari sebelum membagikan tautan akses & kunci pelacakan."
            ) {
                launchShareEmergencyCard()
            }
        }

        btnRegenSeed.setOnClickListener {
            requireDeviceCredential(
                "Ubah Kunci / Mode Keamanan",
                "Verifikasi PIN/Sidik Jari untuk mengganti kata sandi atau seedphrase."
            ) {
                val isV1 = TrackerPrefs.getCryptoVersion(this) == CryptoHelper.VERSION_V1
                val optionsList = mutableListOf(
                    "Ganti ke Kata Sandi Pribadi Baru (v2)",
                    "Acak Ulang 12 Kata Seed (v2 PBKDF2)"
                )
                if (isV1) {
                    optionsList.add("Upgrade Kunci Saat Ini ke Enkripsi v2 (PBKDF2-100k)")
                }

                AlertDialog.Builder(this)
                    .setTitle("Ubah Kunci / Mode Keamanan")
                    .setItems(optionsList.toTypedArray()) { _, which ->
                        when (which) {
                            0 -> showCustomPasswordPrompt(isInitial = false)
                            1 -> {
                                AlertDialog.Builder(this)
                                    .setTitle("Acak Ulang 12 Kata Seed?")
                                    .setMessage(
                                        "Jika Anda mengacak ulang seedphrase, kartu darurat lama tidak bisa lagi mendekripsi lokasi baru. Pastikan mengirim kartu darurat baru ke keluarga."
                                    )
                                    .setPositiveButton("Acak Baru") { _, _ ->
                                        TrackerPrefs.regenerateSeedphrase(this)
                                        isKeyRevealed = true
                                        loadConfigToInputs()
                                        Toast.makeText(this, "12 Kata Seed v2 dibuat. Segera kirim ke keluarga!", Toast.LENGTH_LONG).show()
                                    }
                                    .setNegativeButton("Batal", null)
                                    .show()
                            }
                            2 -> {
                                TrackerPrefs.upgradeCryptoToV2(this)
                                isKeyRevealed = true
                                loadConfigToInputs()
                                Toast.makeText(
                                    this,
                                    "Upgrade ke v2 PBKDF2-100k berhasil! Kirim Kartu Darurat baru jika ID berubah.",
                                    Toast.LENGTH_LONG
                                ).show()
                            }
                        }
                    }
                    .setNegativeButton("Batal", null)
                    .show()
            }
        }

        btnSyncNow.setOnClickListener {
            if (dispatchTrackerAction(TrackerService.ACTION_SYNC_NOW)) {
                Toast.makeText(this, "Mengambil GPS & sinkron E2EE...", Toast.LENGTH_SHORT).show()
            }
        }

        btnOpenMaps.setOnClickListener {
            val last = TrackerPrefs.getLastLocation(this)
            if (last == null) {
                Toast.makeText(this, "Belum ada koordinat GPS tersimpan", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            val uri = Uri.parse("https://maps.google.com/?q=${last.latitude},${last.longitude}")
            startActivity(Intent(Intent.ACTION_VIEW, uri))
        }

        btnSimLastGasp.setOnClickListener {
            AlertDialog.Builder(this)
                .setTitle("Simulasi Baterai Kritis (Last-Gasp 7%)?")
                .setMessage(
                    "Sistem akan mengunci koordinat GPS, mengirimkannya ke relay Nostr, dan (pada versi Lengkap) mengirim SMS darurat ke Nomor Pemantau pertama."
                )
                .setPositiveButton("Jalankan Simulasi") { _, _ ->
                    if (dispatchTrackerAction(TrackerService.ACTION_SIMULATE_LAST_GASP)) {
                        Toast.makeText(this, "Menjalankan simulasi Last-Gasp (7%)...", Toast.LENGTH_LONG).show()
                    }
                }
                .setNegativeButton("Batal", null)
                .show()
        }

        btnCheckReadiness.setOnClickListener {
            showReadinessDiagnosticsDialog()
        }

        btnPermTransparency.setOnClickListener {
            showPermissionTransparencyDialog()
        }
        rowPermLocation.setOnClickListener {
            showPermissionTransparencyDialog("lokasi")
        }
        rowPermBgLocation.setOnClickListener {
            showPermissionTransparencyDialog("lokasi")
        }
        rowPermSms.setOnClickListener {
            showPermissionTransparencyDialog("sms")
        }
        rowPermBattery.setOnClickListener {
            showPermissionTransparencyDialog("baterai")
        }

        btnPermLocation.setOnClickListener {
            requestMultiplePermissions.launch(
                arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                )
            )
        }

        btnPermBgLocation.setOnClickListener {
            if (!hasForegroundLocation()) {
                Toast.makeText(this, "Aktifkan Lokasi GPS Akurat terlebih dahulu", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                requestBackgroundLocation.launch(Manifest.permission.ACCESS_BACKGROUND_LOCATION)
            }
        }

        btnPermSms.setOnClickListener {
            if (VariantSmsBridge.hasPermissions(this)) {
                Toast.makeText(this, "Izin SMS Darurat sudah aktif!", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            val smsPerms = VariantSmsBridge.requiredPermissions()
            if (smsPerms.isNotEmpty()) {
                isManualSmsPermRequest = true
                requestMultiplePermissions.launch(smsPerms)
            }
        }

        btnPermBattery.setOnClickListener {
            val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
            if (!pm.isIgnoringBatteryOptimizations(packageName)) {
                val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                    data = Uri.parse("package:$packageName")
                }
                startActivity(intent)
            } else {
                Toast.makeText(this, "Hemat baterai sudah dinonaktifkan", Toast.LENGTH_SHORT).show()
            }
        }

        btnSaveConfig.setOnClickListener {
            requireDeviceCredential(
                "Simpan Pengaturan",
                "Verifikasi PIN/Sidik Jari sebelum menyimpan perubahan konfigurasi pelacakan."
            ) {
                saveCurrentInputs()
                Toast.makeText(this, "Pengaturan disimpan", Toast.LENGTH_SHORT).show()
                startTrackerService()
            }
        }

        btnTestSms.setOnClickListener {
            if (!VariantSmsBridge.hasSmsSupport) return@setOnClickListener
            if (!VariantSmsBridge.hasPermissions(this)) {
                Toast.makeText(this, "Izinkan Baca & Kirim SMS terlebih dahulu", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            if (!hasForegroundLocation()) {
                Toast.makeText(this, "Izinkan lokasi GPS terlebih dahulu.", Toast.LENGTH_SHORT).show()
                requestStartupPermissions()
                return@setOnClickListener
            }
            val firstTrusted = TrackerPrefs.getFirstTrustedNumber(this)
            if (firstTrusted.isNullOrEmpty()) {
                Toast.makeText(this, "Isi Nomor Pemantau dulu & simpan untuk test kirim SMS", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            try {
                val intent = Intent(this, TrackerService::class.java).apply {
                    action = TrackerService.ACTION_LOCATE_FOR_SMS
                    putExtra(TrackerService.EXTRA_REPLY_TO, firstTrusted)
                }
                ContextCompat.startForegroundService(this, intent)
                Toast.makeText(this, "Mengambil GPS lalu mengirim SMS ke $firstTrusted", Toast.LENGTH_LONG).show()
            } catch (e: Exception) {
                Log.w("MainActivity", "Failed test SMS launch: ${e.message}")
            }
        }

        btnPermAdmin.setOnClickListener {
            val dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
            val adminComponent = ComponentName(this, TrackerAdminReceiver::class.java)
            if (dpm.isAdminActive(adminComponent)) {
                requireDeviceCredential(
                    "Lepas Kunci Anti-Uninstall?",
                    "Verifikasi PIN/Sidik Jari sebelum melepas Administrator Perangkat."
                ) {
                    AlertDialog.Builder(this)
                        .setTitle("Lepas Kunci Anti-Uninstall?")
                        .setMessage("Jika dilepas, siapa pun dapat mencopot pemasangan aplikasi ini tanpa perlindungan.")
                        .setPositiveButton("Lepas Kunci") { _, _ ->
                            dpm.removeActiveAdmin(adminComponent)
                            updatePermissionsUI()
                            Toast.makeText(this, "Kunci Anti-Uninstall dilepas", Toast.LENGTH_SHORT).show()
                        }
                        .setNegativeButton("Batal", null)
                        .show()
                }
            } else {
                launchDeviceAdminActivation()
            }
        }

        btnPermSim.setOnClickListener {
            if (!VariantSmsBridge.hasSmsSupport) return@setOnClickListener
            if (TrackerPrefs.getTrustedSimSignature(this).isNotEmpty()) {
                Toast.makeText(
                    this,
                    "Kunci SIM permanen sudah aktif dan tidak dapat diubah.",
                    Toast.LENGTH_SHORT
                ).show()
                return@setOnClickListener
            }
            if (!VariantSmsBridge.hasPermissions(this) || !VariantSmsBridge.hasPhoneStatePermission(this)) {
                Toast.makeText(this, "Izinkan SMS & Telepon terlebih dahulu agar deteksi Dual-SIM akurat", Toast.LENGTH_LONG).show()
                val smsPerms = VariantSmsBridge.requiredPermissions()
                if (smsPerms.isNotEmpty()) {
                    isManualSmsPermRequest = true
                    requestMultiplePermissions.launch(smsPerms)
                }
                return@setOnClickListener
            }
            val (sig, carrier) = TrackerPrefs.getCurrentSimSignature(this)
            if (sig.isEmpty()) {
                Toast.makeText(
                    this,
                    "Tidak ada kartu SIM terdeteksi. Pasang kartu SIM sah Anda terlebih dahulu.",
                    Toast.LENGTH_LONG
                ).show()
                return@setOnClickListener
            }

            AlertDialog.Builder(this)
                .setTitle("Kunci Kartu SIM Secara Permanen?")
                .setMessage(
                    "Kartu SIM saat ini ($carrier) akan dikunci sebagai SIM Sah Pemilik. " +
                        "Setelah dikunci, aturan Anti-SIM Swap tidak dapat diubah dari dalam aplikasi demi mencegah sabotase pencuri."
                )
                .setPositiveButton("Kunci Permanen") { _, _ ->
                    requireDeviceCredential(
                        "Kunci Kartu SIM Permanen",
                        "Verifikasi PIN/Sidik Jari untuk mengunci SIM ($carrier) secara permanen."
                    ) {
                        val locked = TrackerPrefs.registerCurrentSim(this)
                        updatePermissionsUI()
                        if (locked.isNotEmpty()) {
                            Toast.makeText(
                                this,
                                "Kartu SIM ($locked) terkunci permanen sebagai SIM Sah Pemilik!",
                                Toast.LENGTH_LONG
                            ).show()
                        }
                    }
                }
                .setNegativeButton("Batal", null)
                .show()
        }

        btnToggleAdvanced.setOnClickListener {
            isAdvancedExpanded = !isAdvancedExpanded
            layoutAdvancedConfig.visibility = if (isAdvancedExpanded) View.VISIBLE else View.GONE
            btnToggleAdvanced.text = if (isAdvancedExpanded) {
                "Sembunyikan Pengaturan Teknis ▴"
            } else {
                "Pengaturan Teknis (ID / Kunci / Server Relay) ▾"
            }
        }

        btnPermStealth.setOnClickListener {
            val currentlyStealth = TrackerPrefs.isStealthMode(this)
            if (!currentlyStealth) {
                AlertDialog.Builder(this)
                    .setTitle("Aktifkan Mode Penyamaran (Stealth)?")
                    .setMessage(
                        "• Notifikasi pelacak disembunyikan dari layar kunci & diubah menjadi 'Layanan Sinkronisasi Sistem'.\n" +
                            "• Ikon & nama aplikasi di daftar menu HP akan berubah menjadi 'Layanan Sistem' agar pencuri tidak curiga."
                    )
                    .setPositiveButton("Aktifkan Penyamaran") { _, _ ->
                        requireDeviceCredential(
                            "Aktifkan Mode Penyamaran",
                            "Verifikasi PIN/Sidik Jari untuk menyamarkan ikon & notifikasi LacakHP."
                        ) {
                            applyStealthMode(true)
                        }
                    }
                    .setNegativeButton("Batal", null)
                    .show()
            } else {
                requireDeviceCredential(
                    "Matikan Mode Penyamaran",
                    "Verifikasi PIN/Sidik Jari untuk mengembalikan ikon & notifikasi LacakHP."
                ) {
                    applyStealthMode(false)
                }
            }
        }
    }

    private fun applyStealthMode(enable: Boolean) {
        TrackerPrefs.setStealthMode(this, enable)
        try {
            val defaultAlias = ComponentName(this, "com.lacakhp.app.DefaultLauncherAlias")
            val stealthAlias = ComponentName(this, "com.lacakhp.app.StealthLauncherAlias")
            packageManager.setComponentEnabledSetting(
                stealthAlias,
                if (enable) PackageManager.COMPONENT_ENABLED_STATE_ENABLED else PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                PackageManager.DONT_KILL_APP
            )
            packageManager.setComponentEnabledSetting(
                defaultAlias,
                if (enable) PackageManager.COMPONENT_ENABLED_STATE_DISABLED else PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
                PackageManager.DONT_KILL_APP
            )
        } catch (e: Exception) {
            Log.w("MainActivity", "Failed switching launcher alias: ${e.message}")
        }
        dispatchTrackerAction(TrackerService.ACTION_REFRESH_NOTIFICATION)
        updatePermissionsUI()
        Toast.makeText(
            this,
            if (enable) "Mode Penyamaran aktif: Aplikasi tampil sebagai 'Layanan Sistem'" else "Mode Penyamaran dimatikan",
            Toast.LENGTH_LONG
        ).show()
    }

    private fun saveCurrentInputs() {
        TrackerPrefs.saveConfig(
            context = this,
            trustedNumbers = etTrustedNumbers.text.toString(),
            smsKeyword = etSmsKeyword.text.toString(),
            deviceId = etDeviceId.text.toString(),
            seedphrase = etSeedphrase.text.toString(),
            relaysCsv = etRelays.text.toString()
        )
        loadConfigToInputs()
    }

    private fun requestStartupPermissions() {
        val needed = mutableListOf<String>()
        if (!hasForegroundLocation()) {
            needed.add(Manifest.permission.ACCESS_FINE_LOCATION)
            needed.add(Manifest.permission.ACCESS_COARSE_LOCATION)
        }
        if (VariantSmsBridge.hasSmsSupport && !VariantSmsBridge.hasPermissions(this)) {
            needed.addAll(VariantSmsBridge.requiredPermissions())
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
            != PackageManager.PERMISSION_GRANTED
        ) {
            needed.add(Manifest.permission.POST_NOTIFICATIONS)
        }
        if (needed.isNotEmpty()) {
            requestMultiplePermissions.launch(needed.toTypedArray())
        }
    }

    private fun refreshDashboard() {
        val online = NostrRelayClient.isNetworkOnline(this)
        tvServiceStatus.text = if (TrackerService.isStationaryMode) {
            "Hemat Baterai Aktif (HP Diam • 30 mnt)"
        } else {
            "Pelacak E2EE Aktif (Interval 10 mnt)"
        }
        tvNetworkStatus.text = if (online) {
            "NOSTR RELAY: SIAP"
        } else if (VariantSmsBridge.hasSmsSupport) {
            "OFFLINE (SMS & ANTREAN SIAP)"
        } else {
            "OFFLINE (ANTREAN SQLITE SIAP)"
        }
        tvNetworkStatus.setTextColor(Color.parseColor(if (online) "#10B981" else "#FBBF24"))

        val last = TrackerPrefs.getLastLocation(this)
        if (last != null) {
            tvLastCoords.text = String.format(Locale.US, "%.6f, %.6f", last.latitude, last.longitude)
            val timeStr = SimpleDateFormat("dd/MM/yyyy HH:mm:ss", Locale.getDefault())
                .format(Date(last.timestamp))
            val acc = if (last.accuracy >= 0f) "${last.accuracy.toInt()}m" else "-"
            tvLastMeta.text = "Akurasi: $acc (${last.provider}) • $timeStr"
        } else {
            tvLastCoords.text = "Belum ada titik GPS"
            tvLastMeta.text = "Tekan 'Ambil GPS & Sync' di tempat terbuka"
        }

        val unsynced = dbHelper.countUnsynced()
        tvQueueCount.text = if (unsynced > 0) {
            "Antrean Offline: $unsynced titik menunggu internet"
        } else {
            "Antrean Offline: 0 titik (semua terenkripsi & tersinkron)"
        }
        tvQueueCount.setTextColor(Color.parseColor(if (unsynced > 0) "#FBBF24" else "#10B981"))
    }

    private fun updatePermissionsUI() {
        applyBadge(tvPermLocation, btnPermLocation, hasForegroundLocation(), "Aktif", "Belum aktif")

        val bgGranted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.ACCESS_BACKGROUND_LOCATION
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            true
        }
        applyBadge(
            tvPermBgLocation,
            btnPermBgLocation,
            bgGranted,
            "Aktif (Sepanjang waktu)",
            "Pilih 'Izinkan sepanjang waktu'"
        )

        if (VariantSmsBridge.hasSmsSupport) {
            applyBadge(
                tvPermSms,
                btnPermSms,
                VariantSmsBridge.hasPermissions(this),
                "Aktif (Siap perintah SMS)",
                "Belum aktif"
            )
        }

        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        val batteryOk = pm.isIgnoringBatteryOptimizations(packageName)
        applyBadge(tvPermBattery, btnPermBattery, batteryOk, "Diizinkan", "Perlu diizinkan")

        val dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val adminComponent = ComponentName(this, TrackerAdminReceiver::class.java)
        val adminActive = dpm.isAdminActive(adminComponent)
        applyBadge(tvPermAdmin, btnPermAdmin, adminActive, "Aktif (Terkunci)", "Belum aktif (Bisa dihapus)")

        if (VariantSmsBridge.hasSmsSupport) {
            val trustedSig = TrackerPrefs.getTrustedSimSignature(this)
            val simLocked = trustedSig.isNotEmpty()
            val (_, currentCarrier) = TrackerPrefs.getCurrentSimSignature(this)
            if (simLocked) {
                val lockedLabel = TrackerPrefs.getLockedSimLabel(this)
                tvPermSim.text = "Terkunci Permanen ($lockedLabel)"
                tvPermSim.setTextColor(Color.parseColor("#10B981"))
                btnPermSim.text = "✓ Terkunci"
                btnPermSim.isEnabled = false
                btnPermSim.alpha = 0.85f
                btnPermSim.backgroundTintList = ColorStateList.valueOf(Color.parseColor("#059669"))
            } else {
                tvPermSim.text = "Belum dikunci ($currentCarrier)"
                tvPermSim.setTextColor(Color.parseColor("#FBBF24"))
                btnPermSim.text = "Kunci SIM"
                btnPermSim.isEnabled = true
                btnPermSim.alpha = 1f
                btnPermSim.backgroundTintList = ColorStateList.valueOf(Color.parseColor("#4F46E5"))
            }
        }

        val stealthActive = TrackerPrefs.isStealthMode(this)
        if (stealthActive) {
            tvPermStealth.text = "Aktif (Disamarkan jadi 'Layanan Sistem')"
            tvPermStealth.setTextColor(Color.parseColor("#10B981"))
            btnPermStealth.text = "✓ Tersamar"
            btnPermStealth.backgroundTintList = ColorStateList.valueOf(Color.parseColor("#059669"))
        } else {
            tvPermStealth.text = "Opsional (Tampil normal sebagai LacakHP)"
            tvPermStealth.setTextColor(Color.parseColor("#94A3B8"))
            btnPermStealth.text = "Samarkan"
            btnPermStealth.backgroundTintList = ColorStateList.valueOf(Color.parseColor("#4F46E5"))
        }

        val integrity = ApkIntegrityHelper.verify(this)
        val (_, verName) = UpdateChecker.getLocalVersion(this)
        if (integrity.isOfficial) {
            tvApkSignatureBadge.text =
                "✓ APK Resmi v$verName (${integrity.shortFingerprint}) • Ketuk untuk cek keaslian & update"
            tvApkSignatureBadge.setTextColor(Color.parseColor("#34D399"))
            cardAntiScamTop.setCardBackgroundColor(Color.parseColor("#1C1917"))
            cardAntiScamTop.strokeColor = Color.parseColor("#B45309")
        } else {
            tvApkSignatureBadge.text =
                "🚨 PERINGATAN: Signature APK Tidak Resmi / Hasil Clone (${integrity.shortFingerprint})"
            tvApkSignatureBadge.setTextColor(Color.parseColor("#FCA5A5"))
            cardAntiScamTop.setCardBackgroundColor(Color.parseColor("#450A0A"))
            cardAntiScamTop.strokeColor = Color.parseColor("#EF4444")
        }

        val missingSteps = mutableListOf<String>()
        if (!hasForegroundLocation()) missingSteps.add("Lokasi GPS")
        if (!bgGranted) missingSteps.add("Lokasi Sepanjang Waktu")
        if (VariantSmsBridge.hasSmsSupport && !VariantSmsBridge.hasPermissions(this)) {
            missingSteps.add("Izin SMS")
        }
        if (!batteryOk) missingSteps.add("Bebas Hemat Baterai")
        if (!adminActive) missingSteps.add("Kunci Anti-Uninstall")

        if (missingSteps.isEmpty()) {
            tvReadinessBanner.text =
                "✓ Semua perlindungan utama aktif! Pastikan tautan sudah dikirim ke WhatsApp keluarga."
            tvReadinessBanner.setTextColor(Color.parseColor("#A7F3D0"))
            cardReadinessBanner.setCardBackgroundColor(Color.parseColor("#064E3B"))
            cardReadinessBanner.strokeColor = Color.parseColor("#10B981")
        } else {
            tvReadinessBanner.text =
                "⚠️ ${missingSteps.size} perlindungan wajib belum aktif (${missingSteps.joinToString(", ")}). Aktifkan di Bagian 2."
            tvReadinessBanner.setTextColor(Color.parseColor("#FDE68A"))
            cardReadinessBanner.setCardBackgroundColor(Color.parseColor("#1E293B"))
            cardReadinessBanner.strokeColor = Color.parseColor("#F59E0B")
        }
    }

    private fun applyBadge(
        statusText: TextView,
        button: Button,
        granted: Boolean,
        okLabel: String,
        missingLabel: String
    ) {
        if (granted) {
            statusText.text = okLabel
            statusText.setTextColor(Color.parseColor("#10B981"))
            button.text = "✓ Aktif"
            button.backgroundTintList = ColorStateList.valueOf(Color.parseColor("#059669"))
        } else {
            statusText.text = missingLabel
            statusText.setTextColor(Color.parseColor("#F87171"))
            button.text = "Izinkan"
            button.backgroundTintList = ColorStateList.valueOf(Color.parseColor("#4F46E5"))
        }
    }

    private fun hasForegroundLocation(): Boolean {
        return ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
    }

    private fun dispatchTrackerAction(action: String): Boolean {
        if (!hasForegroundLocation()) {
            Toast.makeText(this, "Izinkan lokasi GPS terlebih dahulu.", Toast.LENGTH_SHORT).show()
            requestStartupPermissions()
            return false
        }
        return try {
            val intent = Intent(this, TrackerService::class.java).apply {
                this.action = action
            }
            ContextCompat.startForegroundService(this, intent)
            true
        } catch (e: Exception) {
            Log.w("MainActivity", "Failed dispatching $action: ${e.message}")
            false
        }
    }

    private fun startTrackerService() {
        if (!hasForegroundLocation()) return
        try {
            val intent = Intent(this, TrackerService::class.java)
            ContextCompat.startForegroundService(this, intent)
        } catch (e: Exception) {
            Log.w("MainActivity", "Cannot start TrackerService: ${e.message}")
        }
    }

    private fun checkInitialSetup() {
        if (!TrackerPrefs.isSetupCompleted(this)) {
            showInitialSecuritySetupDialog()
        }
    }

    private fun showInitialSecuritySetupDialog() {
        val density = resources.displayMetrics.density
        fun dp(v: Int): Int = (v * density).toInt()

        val container = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(20), dp(10), dp(20), dp(16))
        }

        val intro = TextView(this).apply {
            text = "Pilih cara mengamankan kunci dekripsi lokasi.\n\n" +
                "⚠️ Peringatan Hukum & Etika (UU ITE & UU PDP):\n" +
                "Aplikasi amal ini 100% GRATIS dan hanya boleh dipasang pada perangkat milik sendiri atau keluarga atas persetujuan yang sah. Dilarang keras dipasang secara sembunyi-sembunyi untuk memata-matai atau menyadap orang lain (melanggar Pasal 30 & 31 UU ITE ancaman penjara hingga 10 tahun / denda Rp 800 Juta, serta Pasal 65 UU PDP No. 27/2022 denda hingga Rp 5 Miliar)."
            textSize = 12f
            setPadding(0, 0, 0, dp(12))
        }
        container.addView(intro)

        val dialogHolder = arrayOfNulls<AlertDialog>(1)

        fun buildOptionButton(
            title: String,
            detail: String,
            bgHex: String,
            strokeHex: String,
            onClick: () -> Unit
        ): LinearLayout {
            return LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                isClickable = true
                isFocusable = true
                setPadding(dp(14), dp(12), dp(14), dp(12))
                background = android.graphics.drawable.GradientDrawable().apply {
                    setColor(Color.parseColor(bgHex))
                    cornerRadius = dp(12).toFloat()
                    setStroke(dp(1), Color.parseColor(strokeHex))
                }
                val lp = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    bottomMargin = dp(10)
                }
                layoutParams = lp

                addView(TextView(this@MainActivity).apply {
                    text = title
                    setTextColor(Color.WHITE)
                    textSize = 14.5f
                    setTypeface(typeface, android.graphics.Typeface.BOLD)
                })
                addView(TextView(this@MainActivity).apply {
                    text = detail
                    setTextColor(Color.parseColor("#E2E8F0"))
                    textSize = 12f
                    setPadding(0, dp(4), 0, 0)
                })

                setOnClickListener {
                    dialogHolder[0]?.dismiss()
                    onClick()
                }
            }
        }

        container.addView(
            buildOptionButton(
                title = "1. Mode Sederhana (Kata Sandi Pribadi)",
                detail = "• Mudah dihafal di luar kepala\n• Cocok untuk pertolongan darurat cepat",
                bgHex = "#312E81",
                strokeHex = "#6366F1"
            ) {
                showCustomPasswordPrompt(isInitial = true)
            }
        )

        container.addView(
            buildOptionButton(
                title = "2. Mode Brankas (12 Kata Seed Acak)",
                detail = "• Enkripsi matematis maksimal (BIP-39)\n• Wajib dicatat di tempat aman terpisah",
                bgHex = "#064E3B",
                strokeHex = "#10B981"
            ) {
                TrackerPrefs.setSeedphrase(this, TrackerPrefs.getSeedphrase(this))
                TrackerPrefs.setSecurityMode(this, TrackerPrefs.MODE_SEEDPHRASE)
                TrackerPrefs.setSetupCompleted(this, true)
                loadConfigToInputs()
                Toast.makeText(this, "Mode 12 Kata Seedphrase aktif!", Toast.LENGTH_SHORT).show()
                showShareReminderDialog()
            }
        )

        val dialog = AlertDialog.Builder(this)
            .setTitle("Setup Mode Keamanan LacakHP")
            .setView(container)
            .setCancelable(false)
            .create()
        dialogHolder[0] = dialog
        dialog.show()
    }

    private fun showCustomPasswordPrompt(isInitial: Boolean) {
        val container = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(50, 20, 50, 10)
        }
        val input = EditText(this).apply {
            hint = "Minimal 6 karakter (mis. kucinglucu2024)"
            setSingleLine()
            setTextColor(Color.WHITE)
            setHintTextColor(Color.GRAY)
            setBackgroundColor(Color.parseColor("#0F172A"))
            setPadding(30, 25, 30, 25)
        }
        container.addView(input)

        AlertDialog.Builder(this)
            .setTitle("Buat Kata Sandi / Passphrase")
            .setMessage("Masukkan kata sandi atau kalimat rahasia yang mudah Anda hafal saat darurat:")
            .setView(container)
            .setCancelable(!isInitial)
            .setPositiveButton("Simpan & Aktifkan") { _, _ ->
                val entered = input.text.toString().trim()
                if (entered.length < 6) {
                    Toast.makeText(this, "Kata sandi minimal 6 karakter demi keamanan!", Toast.LENGTH_LONG).show()
                    showCustomPasswordPrompt(isInitial)
                } else {
                    TrackerPrefs.setCustomPassphrase(this, entered)
                    loadConfigToInputs()
                    Toast.makeText(this, "Mode Kata Sandi Pribadi aktif!", Toast.LENGTH_SHORT).show()
                    if (isInitial) {
                        showShareReminderDialog()
                    }
                }
            }
            .apply {
                if (!isInitial) {
                    setNegativeButton("Batal", null)
                }
            }
            .show()
    }

    private fun showReadinessDiagnosticsDialog() {
        val bgOk = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.ACCESS_BACKGROUND_LOCATION
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            true
        }
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        val batteryOk = pm.isIgnoringBatteryOptimizations(packageName)

        val dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val adminOk = dpm.isAdminActive(ComponentName(this, TrackerAdminReceiver::class.java))

        val km = getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
        val lockOk = km.isDeviceSecure

        val isV2 = TrackerPrefs.getCryptoVersion(this) == CryptoHelper.VERSION_V2
        val integrity = ApkIntegrityHelper.verify(this)

        val msg = buildString {
            append(if (integrity.isOfficial) "✅ " else "🚨 ")
            append("Keaslian Signature APK: ${if (integrity.isOfficial) "Resmi (${integrity.shortFingerprint})" else "TIDAK RESMI / MODIFIKASI"}\n")

            append(if (hasForegroundLocation() && bgOk) "✅ " else "⚠️ ")
            append("GPS Sepanjang Waktu: ${if (bgOk) "Aktif" else "Belum 'Sepanjang waktu'"}\n")

            append(if (batteryOk) "✅ " else "⚠️ ")
            append("Abaikan Optimasi Baterai: ${if (batteryOk) "Diizinkan" else "Belum diizinkan"}\n")

            append(if (adminOk) "✅ " else "⚠️ ")
            append("Anti-Uninstall Admin: ${if (adminOk) "Terkunci" else "Belum dikunci"}\n")

            append(if (lockOk) "✅ " else "⚠️ ")
            append("Kunci Layar HP (PIN/Sidik Jari): ${if (lockOk) "Aktif" else "Belum dipasang!"}\n")

            append(if (isV2) "✅ " else "ℹ️ ")
            append("Enkripsi Kunci: ${if (isV2) "v2 PBKDF2-100k (Kuat)" else "v1 Legacy (bisa upgrade di Ubah Kunci)"}\n")

            if (VariantSmsBridge.hasSmsSupport) {
                val smsOk = VariantSmsBridge.hasPermissions(this@MainActivity)
                val trustedOk = TrackerPrefs.getFirstTrustedNumber(this@MainActivity) != null
                val pinOk = VariantSmsBridge.hasSmsPinConfigured(this@MainActivity)
                val simOk = TrackerPrefs.getTrustedSimSignature(this@MainActivity).isNotEmpty()

                append(if (smsOk) "✅ " else "⚠️ ")
                append("Izin SMS & Telepon: ${if (smsOk) "Aktif" else "Belum aktif"}\n")

                append(if (trustedOk || pinOk) "✅ " else "⚠️ ")
                append("Keamanan SMS: ${if (trustedOk) "Nomor Pemantau Aktif" else if (pinOk) "PIN SMS Aktif" else "BELUM AMAN (isi Nomor Keluarga / tambah PIN SMS!)"}\n")

                append(if (simOk) "✅ " else "ℹ️ ")
                append("Kunci Kartu SIM: ${if (simOk) "Terkunci" else "Belum dikunci"}\n")
            }

            append("\n--- TIPS KHUSUS SAMSUNG ONE UI ---\n")
            append("Pastikan masuk ke Info Aplikasi -> Baterai -> pilih 'Tidak dibatasi' (Unrestricted) dan masukkan LacakHP ke 'Aplikasi tidak pernah tidur' di Pengaturan Perawatan Perangkat.")
        }

        AlertDialog.Builder(this)
            .setTitle("Diagnosa Kesiapan Perangkat")
            .setMessage(msg)
            .setPositiveButton("Buka Info Aplikasi") { _, _ ->
                val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                    data = Uri.parse("package:$packageName")
                }
                startActivity(intent)
            }
            .setNegativeButton("Tutup", null)
            .show()
    }

    private fun launchShareEmergencyCard() {
        saveCurrentInputs()
        val cardText = TrackerPrefs.buildEmergencyCardText(this)
        val sendIntent = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_SUBJECT, "Kartu Darurat LacakHP")
            putExtra(Intent.EXTRA_TEXT, cardText)
        }
        startActivity(Intent.createChooser(sendIntent, "Kirim Kartu Darurat ke Keluarga"))
    }

    private fun launchDeviceAdminActivation() {
        val adminComponent = ComponentName(this, TrackerAdminReceiver::class.java)
        val intent = Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN).apply {
            putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, adminComponent)
            putExtra(
                DevicePolicyManager.EXTRA_ADD_EXPLANATION,
                "Kunci aplikasi ini sebagai Administrator Perangkat agar pencuri tidak bisa mencopot pemasangan (uninstall) aplikasi."
            )
        }
        startActivity(intent)
    }

    private fun promptDeviceAdminIfNeeded() {
        if (hasPromptedAdminThisSession || isFinishing || isDestroyed) return
        val dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val adminComponent = ComponentName(this, TrackerAdminReceiver::class.java)
        if (dpm.isAdminActive(adminComponent)) return

        hasPromptedAdminThisSession = true
        AlertDialog.Builder(this)
            .setTitle("Aktifkan Kunci Anti-Uninstall")
            .setMessage(
                "Agar pencuri tidak bisa langsung menghapus LacakHP, aktifkan izin Administrator Perangkat sekarang."
            )
            .setPositiveButton("Aktifkan Sekarang") { _, _ ->
                launchDeviceAdminActivation()
            }
            .setNegativeButton("Nanti", null)
            .show()
    }

    private fun showApkIntegrityDialog() {
        val integrity = ApkIntegrityHelper.verify(this)
        val (verCode, verName) = UpdateChecker.getLocalVersion(this)
        val statusHeader = if (integrity.isOfficial) {
            "✅ APK RESMI TERVERIFIKASI (v$verName • Build $verCode)\nTanda tangan kriptografi aplikasi ini cocok dengan kunci rilis resmi LacakHP."
        } else {
            "🚨 PERINGATAN: APK TIDAK RESMI / HASIL CLONE\nTanda tangan aplikasi ini TIDAK cocok dengan kunci resmi LacakHP. Berhati-hatilah terhadap modifikasi pihak ketiga."
        }

        val message = "$statusHeader\n\n" +
            "Sidik Jari Sertifikat APK (SHA-256):\n${integrity.colonFormatted}\n\n" +
            "Domain Web Resmi:\n${TrackerPrefs.DEFAULT_WEB_URL}\n\n" +
            "Peringatan Hukum (UU ITE & UU PDP):\n" +
            "Aplikasi amal ini 100% Gratis. Dilarang keras dipasang secara diam-diam untuk memata-matai orang lain tanpa izin sah (melanggar Pasal 30 & 31 UU ITE pidana penjara maks 10 tahun / denda Rp 800 Juta, serta Pasal 65 UU PDP No. 27/2022 denda maks Rp 5 Miliar)."

        AlertDialog.Builder(this)
            .setTitle("Verifikasi Keaslian & Update LacakHP")
            .setMessage(message)
            .setPositiveButton("Cek Update Resmi") { _, _ ->
                Toast.makeText(this, "Memeriksa pembaruan di ${TrackerPrefs.DEFAULT_WEB_URL}...", Toast.LENGTH_SHORT).show()
                checkForAppUpdate(silentIfUpToDate = false)
            }
            .setNeutralButton("Salin SHA-256") { _, _ ->
                val cm = getSystemService(Context.CLIPBOARD_SERVICE) as android.content.ClipboardManager
                cm.setPrimaryClip(
                    android.content.ClipData.newPlainText("LacakHP APK SHA-256", integrity.colonFormatted)
                )
                Toast.makeText(this, "Sidik jari SHA-256 disalin", Toast.LENGTH_SHORT).show()
            }
            .setNegativeButton("Tutup", null)
            .show()
    }

    private fun checkForAppUpdate(silentIfUpToDate: Boolean) {
        UpdateChecker.checkAsync(this) { res ->
            if (isFinishing || isDestroyed) return@checkAsync
            if (!res.success) {
                if (!silentIfUpToDate) {
                    Toast.makeText(
                        this,
                        "Gagal menghubungi server pembaruan. Periksa koneksi internet Anda.",
                        Toast.LENGTH_LONG
                    ).show()
                }
                return@checkAsync
            }

            if (res.hasUpdate) {
                val msg = buildString {
                    append("Versi terbaru LacakHP v${res.remoteVersionName} (Build ${res.remoteVersionCode}) sudah tersedia!\n\n")
                    if (res.notes.isNotBlank()) {
                        append("Pembaruan:\n${res.notes}\n\n")
                    }
                    append("• Data, Kunci Rahasia, Kunci SIM, dan Anti-Uninstall Anda TETAP AMAN (tidak perlu uninstall aplikasi lama, cukup instal menimpa versi ini).")
                }
                AlertDialog.Builder(this)
                    .setTitle("🎉 Pembaruan Resmi Tersedia!")
                    .setMessage(msg)
                    .setPositiveButton("Unduh & Perbarui Sekarang") { _, _ ->
                        startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(res.apkUrl)))
                    }
                    .setNegativeButton("Nanti", null)
                    .show()
            } else if (!silentIfUpToDate) {
                AlertDialog.Builder(this)
                    .setTitle("✓ Sudah Versi Terbaru")
                    .setMessage(
                        "Aplikasi LacakHP Anda sudah menggunakan rilis resmi terbaru (v${res.localVersionName} • Build ${res.localVersionCode})."
                    )
                    .setPositiveButton("OK", null)
                    .show()
            }
        }
    }

    private fun showSmsRestrictedSettingsGuideDialog() {
        val brand = "${Build.MANUFACTURER} ${Build.BRAND}".lowercase(Locale.ROOT)
        val isXiaomi = brand.contains("xiaomi") || brand.contains("redmi") || brand.contains("poco")

        val message = if (isXiaomi) {
            "Pada Xiaomi HyperOS / MIUI (Android 13–15), sistem mengunci izin SMS untuk aplikasi dari luar Play Store ('Setelan Terbatas').\n\n" +
                "Cara mengaktifkannya sangat mudah (2 langkah):\n\n" +
                "1️⃣ Ketuk 'Buka Info Aplikasi' di bawah → GULIR KE PALING BAWAH LAYAR → ketuk 'Izinkan setelan terbatas' (Allow restricted settings) lalu masukkan PIN/Pola layar HP.\n\n" +
                "2️⃣ Masuk ke menu 'Perizinan aplikasi' (App permissions) → pilih 'SMS' (serta di 'Perizinan lainnya' → Baca/Kirim SMS) → pilih 'Selalu izinkan' dan centang konfirmasi 10 detik."
        } else {
            "Pada Android 13–15, sistem mengunci izin SMS untuk aplikasi dari luar Play Store ('Setelan Terbatas').\n\n" +
                "Cara membukanya:\n" +
                "1️⃣ Ketuk 'Buka Info Aplikasi' di bawah.\n" +
                "2️⃣ Ketuk ikon titik tiga (⋮) di pojok kanan atas (atau gulir ke paling bawah layar) → pilih 'Izinkan setelan terbatas' (Allow restricted settings).\n" +
                "3️⃣ Masuk ke menu 'Izin' (Permissions) → pilih 'SMS' & 'Telepon' → pilih 'Izinkan'."
        }

        val builder = AlertDialog.Builder(this)
            .setTitle(if (isXiaomi) "Cara Aktifkan Izin SMS di Xiaomi HyperOS" else "Buka Kunci 'Setelan Terbatas' SMS")
            .setMessage(message)
            .setPositiveButton("1. Buka Info Aplikasi") { _, _ ->
                openAppDetailsSettings()
            }
            .setNegativeButton("Tutup", null)

        if (isXiaomi) {
            builder.setNeutralButton("2. Perizinan Xiaomi") { _, _ ->
                openXiaomiPermissionEditor()
            }
        }

        builder.show()
    }

    private fun openAppDetailsSettings() {
        try {
            val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.parse("package:$packageName")
            }
            startActivity(intent)
        } catch (e: Exception) {
            Log.w("MainActivity", "Failed opening app details: ${e.message}")
        }
    }

    private fun openXiaomiPermissionEditor() {
        try {
            val intent = Intent("miui.intent.action.APP_PERM_EDITOR").apply {
                setClassName(
                    "com.miui.securitycenter",
                    "com.miui.permcenter.permissions.PermissionsEditorActivity"
                )
                putExtra("extra_pkgname", packageName)
            }
            startActivity(intent)
        } catch (_: Exception) {
            try {
                val fallback = Intent("miui.intent.action.APP_PERM_EDITOR").apply {
                    putExtra("extra_pkgname", packageName)
                }
                startActivity(fallback)
            } catch (_: Exception) {
                openAppDetailsSettings()
            }
        }
    }

    private fun showPermissionTransparencyDialog(focus: String? = null) {
        val headerNote = when (focus) {
            "lokasi" -> "FOKUS: TRANSPARANSI IZIN LOKASI\n\n"
            "sms" -> "FOKUS: TRANSPARANSI IZIN SMS & TELEPON\n\n"
            "baterai" -> "FOKUS: TRANSPARANSI IZIN BATERAI\n\n"
            else -> ""
        }

        val message = headerNote +
            "Prinsip kami: Anda memegang kendali penuh. Jika ada izin yang dirasa terlalu pribadi, Anda bebas mematikannya kapan saja.\n\n" +
            "📍 1. IZIN LOKASI (GPS & Sepanjang Waktu)\n" +
            "• Kenapa diminta: Untuk mencatat titik GPS satelit saat HP hilang, termasuk saat layar terkunci.\n" +
            "• Bisa membaca apa: Hanya angka koordinat, akurasi meter, & waktu — langsung diacak (AES-256-GCM) dengan kunci Anda sebelum keluar HP.\n" +
            "• Dampak jika dimatikan: Peta web & SMS tidak bisa menemukan koordinat terbaru HP (atau berhenti melacak saat layar mati jika hanya pilih 'Saat dipakai').\n\n" +
            "🔋 2. IZIN BEBAS PEMBATASAN BATERAI\n" +
            "• Kenapa diminta: Sistem Samsung/Xiaomi/Oppo/Vivo sering membekukan aplikasi latar belakang agar hemat daya.\n" +
            "• Bisa membaca apa: TIDAK membaca data pribadi apa pun; hanya memantau % sisa baterai untuk sinyal darurat 'Last-Gasp' saat baterai ≤ 8%.\n" +
            "• Dampak jika dimatikan: Pelacak berisiko ditidurkan oleh sistem HP setelah layar mati lama.\n\n" +
            "✉️ 3. IZIN SMS & TELEPON (Versi Lengkap)\n" +
            "• Kenapa diminta: Sebagai jalur penyelamat saat internet/WiFi dimatikan pencuri & deteksi ganti kartu SIM.\n" +
            "• Bisa membaca apa: TIDAK membaca kotak masuk SMS pribadi maupun SMS OTP bank Anda. Aplikasi HANYA memproses SMS masuk yang diawali Kata Kunci + PIN Anda sendiri, dan TIDAK mengakses Kontak, Foto/Galeri, Kamera, maupun Mikrofon.\n" +
            "• Dampak jika dimatikan: Pelacakan lewat internet (Nostr Relay) TETAP JALAN NORMAL. Hanya pelacakan via SMS saat kuota mati, kunci layar via SMS, & alert ganti kartu SIM yang nonaktif."

        AlertDialog.Builder(this)
            .setTitle("Transparansi Izin & Privasi LacakHP")
            .setMessage(message)
            .setPositiveButton("Atur / Matikan Izin HP") { _, _ ->
                openAppDetailsSettings()
            }
            .setNegativeButton("Mengerti", null)
            .show()
    }

    private fun showShareReminderDialog() {
        AlertDialog.Builder(this)
            .setTitle("Langkah Terakhir: Bagikan Kartu Darurat")
            .setMessage("Kirim Kartu Darurat / Tautan 1-Klik ke WhatsApp keluarga atau pasangan Anda sekarang. Tautan ini memungkinkan keluarga langsung melihat lokasi tanpa perlu mengetik kata sandi saat HP hilang.")
            .setPositiveButton("Kirim ke WhatsApp") { _, _ ->
                launchShareEmergencyCard()
            }
            .setNegativeButton("Nanti Saja") { _, _ ->
                promptDeviceAdminIfNeeded()
            }
            .show()
    }
}
