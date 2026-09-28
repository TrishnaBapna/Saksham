# Google Play Store Publishing Guide for Saksham (सक्षम)

This comprehensive guide walks you step-by-step through packaging and uploading **Saksham** to the **Google Play Store**.

Saksham is built as a Progressive Web App (PWA) with complete offline caching, manifest metadata, maskable icons, and a privacy policy. Google officially supports and promotes publishing PWAs to Google Play via **Trusted Web Activities (TWA)**.

---

## Prerequisites

1. **Google Play Developer Account**:
   - Register at [Google Play Console](https://play.google.com/console/signup).
   - One-time registration fee: **$25 USD**.
2. **A Live Web URL**:
   - Your app must be hosted online with HTTPS (e.g. GitHub Pages `https://trishnabapna.github.io/Saksham/` or Vercel / Netlify / Firebase).
   - All assets (`manifest.json`, `sw.js`, `icons/`, `privacy.html`) must be live at that URL.

---

## Method 1: PWABuilder (Recommended — No Coding Required, 5 Minutes)

**PWABuilder** was created by Microsoft in collaboration with Google's Chrome team. It takes your live URL and generates a production-ready, signed **Android App Bundle (`.aab`)** ready for Google Play Console.

### Step 1: Generate the Android Package
1. Open [pwabuilder.com](https://www.pwabuilder.com/) in your browser.
2. Enter your live website URL (e.g., `https://trishnabapna.github.io/Saksham/`) and click **Start**.
3. PWABuilder will scan your `manifest.json`, `sw.js`, and icons. Your score will be **High (PWA Ready)**.
4. Click **Package for Stores** $\rightarrow$ select **Google Play**.
5. In the configuration popup:
   - **Package ID / App ID**: `in.sakshamcare.app` (or your preferred unique ID)
   - **App Name**: `Saksham - Cognitive Wellness`
   - **Launcher Name / Short Name**: `Saksham`
   - **Theme color**: `#1B4225`
   - **Background color**: `#F5F4E0`
   - **Display Mode**: `Standalone`
   - **Signing Key**: Select *"Generate a new key"* (PWABuilder will generate your `.keystore` and password; make sure to save it safely!).
6. Click **Generate Package**.
7. Download the `.zip` file. Inside you will find:
   - `app-release-bundle.aab` (the actual bundle to upload to Google Play!)
   - `assetlinks.json` (for domain verification)
   - `signing.keystore` (keep this backup safe!)

---

### Step 2: Set Up Digital Asset Links (`assetlinks.json`)
To remove the browser address bar in the Play Store app, Android verifies that you own the website:
1. In your project, open `.well-known/assetlinks.json`.
2. Copy the `assetlinks.json` provided in your PWABuilder download (which contains the exact SHA-256 fingerprint of your app).
3. Commit and deploy this file to your website so it is accessible at:
   `https://your-domain.com/.well-known/assetlinks.json`
4. Once deployed, test verification at [Digital Asset Links Tester](https://developers.google.com/digital-asset-links/tools/generator).

---

### Step 3: Create App Listing in Google Play Console
1. Log into [Google Play Console](https://play.google.com/console).
2. Click **Create App**:
   - **App Name**: `Saksham - Cognitive Wellness & Routine Studio`
   - **Default Language**: English (United States) or English (India)
   - **App or Game**: App
   - **Free or Paid**: Free
   - Accept the Developer Program Policies and US export laws.
3. Complete the **Set up your app** tasks on the Dashboard:
   - **Privacy Policy**: Enter `https://your-domain.com/privacy.html`
   - **App Access**: All functionality is available without special access.
   - **Ads**: Select *"No, my app does not contain ads"*.
   - **Content Ratings**: Complete the questionnaire (Select *"Health/Utility"* $\rightarrow$ Rating will be PEGI 3 / Everyone).
   - **Target Audience**: Select 18 and older (or all adults / seniors).
   - **News Apps**: No.
   - **COVID-19 Contact Tracing**: No.
   - **Data Safety**:
     - Does your app collect data? $\rightarrow$ Select *"No, data stays on device"*.
   - **Category**: Medical / Health & Fitness.
   - **Contact Details**: Email (`aarav.sharma@sakshamcare.in`).

---

### Step 4: Store Listing Graphics
Upload the required graphics:
- **App Icon**: 512x512 PNG (Use `icons/icon-512.png` created in your project).
- **Feature Graphic**: 1024x500 PNG (A banner displaying the Saksham logo and tagline *"Cognitive Wellness & Routine Studio"*).
- **Screenshots**: At least 2 phone screenshots (take screenshots of the Routine Cues, Mind Clinic Games, and Calendar on mobile).

---

### Step 5: Upload the `.aab` Bundle & Release
1. In the left menu, navigate to **Testing $\rightarrow$ Internal testing** (or **Production**).
2. Click **Create new release**.
3. Drag and drop `app-release-bundle.aab`.
4. Name the release (e.g., `1.0.0 (Initial Release)`).
5. Click **Next** $\rightarrow$ **Review release** $\rightarrow$ **Start rollout**!

---

## Method 2: Google Bubblewrap CLI (Advanced / Command Line)

If you prefer building from the terminal using Google's official Bubblewrap tool:

```bash
# 1. Install Bubblewrap globally
npm install -g @bubblewrap/cli

# 2. Initialize from your live PWA manifest
bubblewrap init --manifest=https://your-domain.com/manifest.json

# 3. Build the signed Android App Bundle
bubblewrap build

# Output: app-release-bundle.aab
```

---

## Summary of Files Prepared in this Project

| File | Purpose |
| :--- | :--- |
| `icons/icon-192.png` | 192x192 PNG PWA and Android Launcher icon |
| `icons/icon-512.png` | 512x512 PNG Google Play Store listing icon |
| `icons/icon-maskable-512.png` | Adaptive maskable icon for Android 8+ devices |
| `manifest.json` | Web App Manifest with Play Store metadata |
| `.well-known/assetlinks.json` | Digital Asset Links for full-screen TWA verification |
| `privacy.html` | Mandatory Google Play Store Privacy Policy |
| `sw.js` | Service Worker providing offline capability |
