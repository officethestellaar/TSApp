# 📱 Guide: Converting Stellaar TSwebapp to Android & iOS

Since your frontend is built with **Next.js (React 19)** and tailwind, you have three primary paths to bring Stellaar to mobile devices. 

This guide details the **Capacitor approach**, which is the industry standard for turning a Next.js web application into a true native App Store / Play Store app without rewriting your codebase.

---

## The 3 Paths to Mobile

### 1. Capacitor.js (Recommended 🏆)
Capacitor acts as a native bridge. It takes your compiled Next.js website and embeds it inside a native mobile WebView, while giving your JavaScript code access to native device features (Camera, Push Notifications, GPS, Biometrics).
* **Pros:** Keep 100% of your existing Next.js codebase. Fastest time to market. Access to native SDKs.
* **Cons:** UI is still rendered in a webview (though modern phones make it feel very fast).

### 2. React Native / Expo (The "True Native" Way)
You share your business logic (API calls, state), but you must rewrite your entire UI. Instead of `<div>` and `<button>`, you write `<View>` and `<TouchableOpacity>`.
* **Pros:** Flawless native performance and native UI components.
* **Cons:** Requires a massive rewrite of your frontend views. 

### 3. PWA (Progressive Web App)
You add a `manifest.json` and a service worker. Users "Add to Home Screen" from their browser.
* **Pros:** Zero extra code, bypasses the App Store approval process.
* **Cons:** Not in the App Stores. Apple heavily restricts PWA background features (like push notifications).

---

## 🛠️ Step-by-Step Guide to Capacitor (Recommended)

To convert your `frontend` to mobile apps using Capacitor, follow these steps:

### Phase 1: Prepare Next.js for Static Export
Capacitor requires plain HTML/CSS/JS files. Next.js supports this via "Static HTML Export".

1. **Update `next.config.mjs`:**
   In your `frontend/next.config.mjs` (or `.js`), add the `output: 'export'` option. You also need to disable Next.js Image Optimization since it requires a Node server.
   ```javascript
   /** @type {import('next').NextConfig} */
   const nextConfig = {
     output: 'export', // Critical for Capacitor
     images: {
       unoptimized: true, // Required for static export
     },
   };
   export default nextConfig;
   ```

2. **Test the Export:**
   Run `npm run build` inside the `frontend` folder. It should generate an `out/` folder containing your static site.

### Phase 2: Install and Initialize Capacitor

Inside your `frontend` directory, run:

1. **Install Capacitor CLI and Core:**
   ```bash
   npm install @capacitor/core
   npm install @capacitor/cli --save-dev
   ```

2. **Initialize Capacitor:**
   ```bash
   npx cap init
   ```
   * App Name: `Stellaar`
   * App Package ID: `com.stellaar.app` (or your preferred domain)
   * Web asset directory: `out` (This is where Next.js places the exported files).

### Phase 3: Add Android and iOS Platforms

1. **Install Platform Packages:**
   ```bash
   npm install @capacitor/android @capacitor/ios
   ```

2. **Add the Platforms to the Project:**
   ```bash
   npx cap add android
   npx cap add ios
   ```

### Phase 4: Sync & Build

Every time you make a change to your Next.js frontend, you need to sync it to your mobile apps.

1. **Build Next.js:** `npm run build`
2. **Sync to Capacitor:** `npx cap sync`

*Pro-tip: Add a script to your `package.json`:*
```json
"scripts": {
  "build:mobile": "next build && npx cap sync"
}
```

### Phase 5: Run and Test

To open the apps in their respective IDEs (you will need Android Studio and Xcode installed):

* **For Android:**
  ```bash
  npx cap open android
  ```
  *(This opens Android Studio. Hit the "Play" button to run on an emulator or plugged-in Android device).*

* **For iOS:**
  ```bash
  npx cap open ios
  ```
  *(This opens Xcode. Select a simulator and hit "Run". Note: Requires a Mac).*

---

## 🔌 Connecting to the Backend

Currently, your Next.js app probably connects to `localhost:3000` or similar. 
**Mobile apps run on the physical device, not on your computer.**

1. **Local Testing:** You must change your frontend API base URL to your computer's local IP address (e.g., `http://192.168.1.10:4000`) so the phone can reach the backend over Wi-Fi.
2. **Production:** When publishing the app, your frontend API calls must point to your deployed backend (e.g., `https://api.stellaar.com`).

**How to handle this:**
Create a `.env.production` file for your mobile build containing the remote backend URL, and ensure your `axios` or `fetch` calls use `process.env.NEXT_PUBLIC_API_URL`.

---

## 🧩 Adding Native Features (Capacitor Plugins)

Since Stellaar is a club management POS, you might need hardware integrations. Capacitor uses Plugins for this.

* **Camera / Barcode Scanner (for QR Orders/Tablets):**
  ```bash
  npm install @capacitor/camera
  npx cap sync
  ```
* **Push Notifications:**
  ```bash
  npm install @capacitor/push-notifications
  npx cap sync
  ```
* **Status Bar & Splash Screen styling:**
  ```bash
  npm install @capacitor/status-bar @capacitor/splash-screen
  npx cap sync
  ```

Once installed, import them in your React components:
```javascript
import { Camera, CameraResultType } from '@capacitor/camera';

const takePicture = async () => {
  const image = await Camera.getPhoto({
    quality: 90,
    allowEditing: true,
    resultType: CameraResultType.Uri
  });
  // Use image.webPath in your UI
};
```

---

## 🚀 App Store / Play Store Deployment

1. **App Icons & Splash Screens:**
   Use the `cordova-res` or `@capacitor/assets` tool to automatically generate all the required sizes for iOS and Android icons from a single `Logo_no_Back.png`.
   ```bash
   npm install -g @capacitor/assets
   npx capacitor-assets generate
   ```
2. **Android Play Store:** Generate a Signed AAB (Android App Bundle) from Android Studio and upload to Google Play Console.
3. **Apple App Store:** Archive the app from Xcode, sign it with your Apple Developer Account ($99/yr), and upload it via Transporter to App Store Connect.

## Summary Checklist for Mobile Conversion:
- [ ] Change Next.js config to `output: 'export'`.
- [ ] Disable unoptimized `next/image`.
- [ ] Ensure API routes rely on dynamic environment variables.
- [ ] Install `@capacitor/core` and CLI.
- [ ] Run `npx cap add ios` and `npx cap add android`.
- [ ] Set up Mobile Icons using `@capacitor/assets`.
- [ ] Test on real devices using Xcode & Android Studio.
