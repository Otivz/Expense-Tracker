# React Native & Expo Setup Recap

This document outlines how the React Native environment and the **Expense Tracker** project were set up, along with commands to run and test the app.

---

## 1. Prerequisites installed
To develop React Native apps with Expo, the following environment prerequisites are needed on your system:
*   **Node.js** (LTS version recommended)
*   **Git** (for version control)
*   **Expo Go App** (installed on your mobile device via Google Play Store or iOS App Store)

---

## 2. Project Initialization
This project was generated using the official Expo template generator:
```bash
npx create-expo-app@latest expense-tracker --template tabs
```
*   **Template**: `tabs` (pre-configured with file-based routing using `expo-router` and a bottom tab navigation layout).
*   **Expo Version**: SDK 54 (`~54.0.34`)
*   **React Native Version**: `0.81.5`

---

## 3. Dependency Installation
If you clone this project or need to reinstall dependencies from scratch, run:
```bash
npm install
```
Key packages installed in this project:
*   `expo-router`: Handles file-based navigation (under the `app` directory).
*   `react-native-safe-area-context`: Safe boundaries for modern phone screens (notches/home indicators).
*   `react-native-reanimated` & `react-native-gesture-handler`: Power smooth animations and touch gestures.
*   `react-native-screens`: Native navigation primitives.

---

## 4. Running the Development Server
To launch the Metro Bundler (development server), run the following command in the project directory:
```bash
npm start
```
*Alternative: `npx expo start`*

---

## 5. Viewing and Testing the App

### A. On a Mobile Phone (Recommended)
1. Ensure both your computer and your phone are connected to the **same Wi-Fi network**.
2. Run `npm start` in your terminal to display the QR code.
3. **Android**: Open **Expo Go**, select "Scan QR Code", and scan the QR code.
4. **iOS**: Open your default **Camera app**, point it at the QR code, and tap the notification link to open in **Expo Go**.

### B. On a Web Browser
Press **`w`** in the terminal where Expo is running, or go to [http://localhost:8081](http://localhost:8081).

### C. On Emulators/Simulators (If installed)
*   Press **`a`** for Android Emulator (requires Android Studio).
*   Press **`i`** for iOS Simulator (requires macOS and Xcode).

---

## 6. Project Structure Overview
*   **`app/`**: Contains the application screen files (using file-based routing).
    *   `app/(tabs)/`: Contains the main tab screens (e.g., `index.tsx`, `explore.tsx`).
    *   `app/+not-found.tsx`: Fallback screen for broken/unrecognized links.
    *   `app/_layout.tsx`: Root layout configuration.
*   **`components/`**: Reusable UI components.
*   **`constants/`**: Design tokens, colors, and layout constants.
*   **`hooks/`**: Custom React hooks.
*   **`scripts/reset-project.js`**: Run `npm run reset-project` to move the starter template files to `app-example` and start with a fresh blank canvas.
