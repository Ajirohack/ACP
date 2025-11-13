
plugins {
    id("com.android.application")
    kotlin("android")
}

android {
    namespace = "com.example.controlplane"
    compileSdk = 33

    defaultConfig {
        applicationId = "com.example.controlplane"
        minSdk = 28
        targetSdk = 33
        versionCode = 1
        versionName = "1.0"
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }

    kotlinOptions {
        jvmTarget = "1.8"
    }
}

dependencies {
    // Ktor for embedded server
    implementation("io.ktor:ktor-server-core-jvm:2.3.5")
    implementation("io.ktor:ktor-server-netty-jvm:2.3.5")
    implementation("io.ktor:ktor-server-content-negotiation-jvm:2.3.5")
    implementation("io.ktor:ktor-serialization-gson-jvm:2.3.5")

    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.1")

    // AndroidX Core
    implementation("androidx.core:core-ktx:1.9.0")
}
