plugins {
    id("com.android.application") version "9.1.0" apply false
}

// Enforce Reproducible & Deterministic Builds (Zero-Trust Supply Chain)
// Ensures file timestamps and entry orders are normalized bit-for-bit across any machine.
subprojects {
    tasks.withType<AbstractArchiveTask>().configureEach {
        isPreserveFileTimestamps = false
        isReproducibleFileOrder = true
    }
}

