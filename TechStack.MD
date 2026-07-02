# Tech Stack - Expense Tracker

## Project Overview
The **Expense Tracker** is a cross-platform mobile application designed to help users manage their personal finances. It allows users to:
*   **Log Expenses & Income**: Record daily purchases, incoming salary, transactions, and cash flows.
*   **Track Budgets**: Set monthly limits and monitor spending thresholds.
*   **Monitor Savings**: Calculate net savings (Income - Expenses) and track progress toward customizable savings goals.
*   **Categorize Spending**: Group transactions into categories (e.g., Food, Transport, Entertainment) to visualize where money is going.
*   **Analyze Habits**: Provide visual breakdowns and summaries of historical spending patterns.

This document details the technologies, packages, databases, and frameworks used to build this application.

---

## 1. Frontend Frameworks & Navigation
*   **React Native (v0.81.5)**: Used to write cross-platform mobile interfaces that render as native iOS and Android components.
*   **Expo (SDK 54.0.35)**: Provides the development environment, tooling, and native modules wrapper to run and test the application.
*   **React (v19.1.0)**: Foundational library for building components.
*   **Expo Router (v6.0.24)**: File-based routing for React Native, built on top of **React Navigation v7** (under `app/(tabs)/`).

## 2. Styling, Animations & Gestures
*   **React Native Stylesheets**: Core style system used to define flexbox layouts and styling.
*   **Expo Symbols & Vector Icons**: Integrated system icons (`@expo/vector-icons`, `expo-symbols`).
*   **React Native Reanimated (v4.1.1)**: Runs high-performance, smooth 60fps animations on the native UI thread.
*   **React Native Gesture Handler (v2.28.0)**: Handles touch, swipe, and gesture inputs.


_________________________________________________________________________________________________________________________


## 3. Backend & Database (Supabase)
We use **Supabase** (an open-source Firebase alternative) to power the app's backend:
*   **PostgreSQL Database**: Relational database to store user transactions, categories, budgets, and savings goals with full schema integrity.
*   **Supabase Auth**: Secure user authentication (email/password login, signups, and session management).
*   **Row Level Security (RLS)**: Enforces security rules at the database level to ensure users can only access their own financial data.
*   **Supabase Storage** (Optional): Used if users need to upload and store receipts or profile images.

## 4. Build Tooling & Development
*   **TypeScript (v5.9.2)**: Static typing and autocomplete support.
*   **Metro Bundler**: The compiler/packager for React Native.
*   **ESLint**: Integrated linting for code quality checks.

## 5. Design System (Color Palette)
| Color Token | Hex Code | Usage |
| :--- | :--- | :--- |
| **Primary Dark** | `#014134` | Dark green, headers, active tab highlights, and primary dark actions |
| **Primary** | `#00684F` | Branding primary color, main buttons, and prominent active indicators |
| **Secondary Green** | `#0D8A63` | Secondary brand color, budget highlights, positive savings balances |
| **Accent Mint** | `#2ED8A5` | Muted highlight, badges, and progress indicators |
| **Background** | `#F4FAF8` | Default background color for screens |
| **Card** | `#FFFFFF` | Container elements, list items, and standard cards |
| **Light Card** | `#EAF4F1` | Alternating row backgrounds and secondary surfaces |
| **Divider** | `#D7E5E0` | Subtle borders and separating lines |
| **Text Primary** | `#1C2A27` | Body headers, numbers, and main readable text |
| **Text Secondary** | `#6B7B77` | Muted captions, helper texts, and inactive states |

User
   ↓
C-Vault App
   ↓
SQLite (Local Database)
   ↓
Sync Manager
   ↓
Supabase Cloud