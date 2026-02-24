# Minimal Android Build Guide (No Android Studio)

Since GitHub Actions is blocked for your account, and you don't want to install the full Android Studio (2GB+), you can build the APK using just the **Command Line Tools**.

## 🔴 Requirement: Update Java
Your current Java version (`1.8`) is too old for modern Android building.
1.  Download **Java JDK 17** or **Java JDK 21** (Both are LTS and excellent):
    [Download OpenJDK 21](https://jdk.java.net/archive/)
2.  Set your `JAVA_HOME` environment variable to point to extracted JDK folder.

## Steps to Build

1.  **Download Command Line Tools:**
    -   Download this zip: [Android Command Line Tools for Windows](https://dl.google.com/android/repository/commandlinetools-win-10406996_latest.zip)
    -   Extract it to a folder, e.g., `C:\Android\cmdline-tools\latest`. 
        *(Note: The structure MUST be `cmdline-tools/latest/bin`, `cmdline-tools/latest/lib`, etc.)*

2.  **Install SDK Platforms:**
    Open a terminal in `C:\Android\cmdline-tools\latest\bin` and run:
    ```powershell
    # Accept licenses
    yes | .\sdkmanager.bat --licenses
    
    # Install Build Tools
    .\sdkmanager.bat "platform-tools" "platforms;android-33" "build-tools;33.0.0"
    ```

3.  **Build the APK:**
    Go back to your project folder (`EL-helal-master`) and run:
    ```powershell
    # Set path to SDK
    $env:ANDROID_HOME = "C:\Android"
    
    # 1. Sync Capacitor
    npx cap sync android
    
    # 2. Build APK using Gradle
    cd android
    .\gradlew assembleDebug
    ```

4.  **Find Your APK:**
    The file will be at: `android/app/build/outputs/apk/debug/app-debug.apk`.

---

## Why "Live Wrapper" (WebView) instead of "Offline App" (Electron)?
You asked to make the app work like **Electron** (fully offline/self-contained).
-   **Electron** works for apps that run entirely on the device (like a calculator or text editor).
-   **Your App (YourPlatform)** is a **Next.js App** connected to a **PostgreSQL Database**.
-   The "Log In", "Get Videos", and "Save Progress" features **MUST** talk to the server to work. They cannot run "offline" inside the phone because the phone cannot host your database securely.
-   Therefore, the **WebView Wrapper** (what we built) is the standard correct way. It acts exactly like a native app (full screen, notification, etc.) but relies on the internet connection to fetch real data.
