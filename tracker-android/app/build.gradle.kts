plugins {
    id("com.android.application")
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
            isMinifyEnabled = false
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
