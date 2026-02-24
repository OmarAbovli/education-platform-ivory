# How to Build Your Android App (APK)

Since you are running on Windows, you can build the APK directly if you have **Android Studio** installed.

## Prerequisites
-   [Download & Install Android Studio](https://developer.android.com/studio) (if you haven't already).

## Steps to Build

1.  **Open the Android Project:**
    Open your terminal in the project folder and run:
    ```powershell
    npx cap open android
    ```
    (Or launch Android Studio and select "Open" -> navigate to `components/EL-helal-master/android`).

2.  **Wait for Gradle Sync:**
    Android Studio will take a minute to download dependencies. Wait until the bottom loading bar finishes.

3.  **Build the APK:**
    -   Go to the top menu: **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
    -   Wait for the build to finish.
    -   Click the **"locate"** link that appears in the bottom-right notification.
    -   You will find `app-debug.apk`. This is your installable app file!

## Important Note
This app is configured as a **Live Wrapper**. It points directly to your website URL (`https://yourplatform-demo.vercel.app`).
-   **Pros:** Any update you push to Vercel instantly updates the app. No need to rebuild the APK for code changes.
-   **Cons:** The user needs internet access to open the app.
