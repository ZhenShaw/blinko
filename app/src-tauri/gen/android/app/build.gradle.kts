import java.util.Properties
import java.io.FileInputStream

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("rust")
}

val tauriProperties = Properties().apply {
    val propFile = file("tauri.properties")
    if (propFile.exists()) {
        propFile.inputStream().use { load(it) }
    }
}

android {
    compileSdk = 34
    namespace = "com.blinko.app"
    defaultConfig {
        manifestPlaceholders["usesCleartextTraffic"] = "false"
        applicationId = "com.blinko.app"
        minSdk = 24
        targetSdk = 34
        versionCode = tauriProperties.getProperty("tauri.android.versionCode", "1").toInt()
        versionName = tauriProperties.getProperty("tauri.android.versionName", "1.0")
    }
    signingConfigs {
        create("release") {
            val keystorePropertiesFile = rootProject.file("keystore.properties")
            val keystoreProperties = Properties()
            if (keystorePropertiesFile.exists()) {
                keystoreProperties.load(FileInputStream(keystorePropertiesFile))
            }
    
            keyAlias = keystoreProperties["keyAlias"] as String
            keyPassword = keystoreProperties["password"] as String
            storeFile = file(keystoreProperties["storeFile"] as String)
            storePassword = keystoreProperties["password"] as String
        }
    }
    buildTypes {
        getByName("debug") {
            manifestPlaceholders["usesCleartextTraffic"] = "true"
            isDebuggable = true
            isJniDebuggable = true
            isMinifyEnabled = false
            packaging {                jniLibs.keepDebugSymbols.add("*/arm64-v8a/*.so")
                jniLibs.keepDebugSymbols.add("*/armeabi-v7a/*.so")
                jniLibs.keepDebugSymbols.add("*/x86/*.so")
                jniLibs.keepDebugSymbols.add("*/x86_64/*.so")
            }
        }
        getByName("release") {
            signingConfig = signingConfigs.getByName("release")
            isMinifyEnabled = true
            proguardFiles(
                *fileTree(".") { include("**/*.pro") }
                    .plus(getDefaultProguardFile("proguard-android-optimize.txt"))
                    .toList().toTypedArray()
            )
        }
    }
    kotlinOptions {
        jvmTarget = "1.8"
    }
    buildFeatures {
        buildConfig = true
    }
}

rust {
    rootDirRel = "../../../"
}

dependencies {
    implementation("androidx.webkit:webkit:1.6.1")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("com.google.android.material:material:1.8.0")
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.1.4")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.0")

}

// === Blinko fix: fullscreen video custom view state ===
// Wry's upstream `onShowCustomView` calls `callback.onCustomViewHidden()`
// immediately, breaking HTML5 <video> fullscreen on Android. We overwrite
// the generated Kotlin file with our patched copy (which hides system bars
// and attaches the view to android.R.id.content) just before Kotlin
// compilation runs, so the patched class always lands in the dex regardless
// of what `wry/build.rs` wrote.
//
// Template source: app/patches/RustWebChromeClient.kt
// Output: gen/.../src/main/java/com/blinko/app/generated/RustWebChromeClient.kt
//
// Runs as a dependency of every Kotlin compile task, so it's always
// ordered correctly — `:app:compileUniversalReleaseKotlin` (and
// debug variants) cannot start until this has run.
val blinkoPatchedChromeClientTemplate = file("patches/RustWebChromeClient.kt")
val blinkoGeneratedChromeClientDir = file("src/main/java/com/blinko/app/generated")
val blinkoGeneratedChromeClientFile = blinkoGeneratedChromeClientDir.resolve("RustWebChromeClient.kt")

tasks.register("patchBlinkoWryChromeClient") {
    group = "blinko"
    description = "Overwrite wry's auto-generated RustWebChromeClient.kt with the patched template so HTML5 video fullscreen works."
    inputs.file(blinkoPatchedChromeClientTemplate)
    outputs.file(blinkoGeneratedChromeClientFile)
    doLast {
        blinkoGeneratedChromeClientDir.mkdirs()
        val templateContent = blinkoPatchedChromeClientTemplate.readText()
        val pkg = android.namespace ?: error("android.namespace is null")
        val patched = templateContent.replace("{{package}}", pkg)
        blinkoGeneratedChromeClientFile.writeText(patched)
        val hasMarker = patched.contains("Blinko fix: fullscreen video custom view state")
        logger.lifecycle("patchBlinkoWryChromeClient: wrote ${patched.length} bytes, marker=$hasMarker to $blinkoGeneratedChromeClientFile")
    }
}

afterEvaluate {
    // Ordering is critical: the rust plugin's cargo build (rustBuild*) runs
    // wry/build.rs, which (re)writes the generated Kotlin from wry's source
    // template. Our patch must land AFTER that, otherwise it gets overwritten
    // back to the upstream version. Force rustBuild* -> patch -> compile*Kotlin.
    tasks.named("patchBlinkoWryChromeClient") {
        mustRunAfter(tasks.matching { it.name.startsWith("rustBuild") })
    }
    tasks.matching { it.name.startsWith("compile") && it.name.endsWith("Kotlin") }.configureEach {
        dependsOn("patchBlinkoWryChromeClient")
    }
}

apply(from = "tauri.build.gradle.kts")