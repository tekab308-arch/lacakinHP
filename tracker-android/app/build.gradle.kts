import java.util.Properties

plugins {
    id("com.android.application")
}

val keystoreProps = Properties()
val keystorePropsFile = listOf(
    rootProject.file("keystore.properties"),
    rootProject.file("../keystore.properties")
).firstOrNull { it.exists() }
if (keystorePropsFile != null) {
    keystorePropsFile.inputStream().use { keystoreProps.load(it) }
}

android {
    namespace = "com.lacakhp.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.lacakhp.app"
        minSdk = 26
        targetSdk = 35
        versionCode = 8
        versionName = "2.6"
    }

    signingConfigs {
        if (keystorePropsFile != null) {
            create("official") {
                storeFile = file(keystoreProps.getProperty("storeFile"))
                storePassword = keystoreProps.getProperty("storePassword")
                keyAlias = keystoreProps.getProperty("keyAlias")
                keyPassword = keystoreProps.getProperty("keyPassword")
                enableV1Signing = true
                enableV2Signing = true
                enableV3Signing = true
            }
        }
    }

    flavorDimensions += "variant"
    productFlavors {
        create("full") {
            dimension = "variant"
        }
        create("play") {
            dimension = "variant"
            applicationIdSuffix = ".play"
        }
    }

    buildTypes {
        release {
            isDebuggable = false
            isMinifyEnabled = false
            isShrinkResources = false
            // Uses dedicated keystore.properties when present; falls back to local ~/.android/debug.keystore
            // (which holds E3:10:0D:61... on maintainer machine and allows CI builds to verify non-debuggable APK).
            signingConfig = if (keystorePropsFile != null) {
                signingConfigs.getByName("official")
            } else {
                signingConfigs.getByName("debug")
            }
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    testOptions {
        unitTests.isReturnDefaultValues = true
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("fr.acinq.secp256k1:secp256k1-kmp:0.24.0")
    implementation("fr.acinq.secp256k1:secp256k1-kmp-jni-android:0.24.0")
    testImplementation("junit:junit:4.13.2")
}
