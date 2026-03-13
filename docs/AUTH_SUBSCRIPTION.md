# Authentication & Subscription Architecture

## Overview

SpeakEasy uses a **frontend-only** architecture with two hosted third-party
services — no custom backend is required:

| Concern            | Provider          | Reason                                  |
|--------------------|-------------------|-----------------------------------------|
| Authentication     | **Firebase Auth** | Hosted, generous free tier, magic links |
| Subscription       | **RevenueCat**    | Native IAP wrapper, receipt validation  |
| Session storage    | `browserLocalPersistence` — works in both Capacitor WebView and browser |

---

## 1. File Map

```
src/
  services/
    firebase.js          Firebase app + all auth helper functions
    revenuecat.js        RevenueCat SDK wrapper (mobile-only, dynamic import)
    subscription.js      Unified entitlement logic + free-tier constants

  features/
    auth/
      useAuth.js         React hook: user, session, signIn, signUp, signOut
      AuthModal.jsx      Login / signup / magic-link bottom sheet

    subscription/
      useSubscription.js React hook: isPremium, offering, refresh, restore
      useFreeTier.js     Daily usage counters + paywall trigger logic
      Paywall.jsx        Purchase sheet (mobile) / redirect (web)
      SubscriptionBanner.jsx  Inline usage meter + upgrade button

.env.example             Required environment variables (see Setup)
```

---

## 2. Authentication Flow

```
App start
  └─> useAuth hook mounts
        └─> onAuthStateChanged fires immediately with current user
              ├─ User found  →  user state set, RevenueCat linked
              └─ No user     →  user null, anonymous RevenueCat user

User taps "Sign in" (ProfilePanel → AuthModal)
  └─> AuthModal (email+password  OR  magic link)
        └─> signIn() / signUp() / sendMagicLink()
              └─> Firebase Auth
                    └─> onAuthStateChanged fires with new user
                          └─> loginRevenueCat(user.uid) — links RC to Firebase UID
                                └─> useSubscription re-fetches entitlement
```

**Session storage:**  
Firebase `browserLocalPersistence` works in both Capacitor WebView and browser.

**Cross-device sync**: Firebase JWTs resolve on any device. RevenueCat uses
the same `user.uid` as the app user ID so purchases follow the user across
re-installs.

---

## 3. Subscription Flow

```
App start (native)
  └─> initRevenueCat(userId)  — configure RC SDK with Firebase UID
        └─> useSubscription fetches getIsPremium()
              ├─ true  →  isPremium = true, no paywall
              └─ false →  free tier limits apply

User triggers a gated action (speak / AI / save phrase)
  └─> useFreeTier.consumeVoice() / consumeAI() / canSavePhrase()
        ├─ within limit  →  action proceeds
        └─ limit reached →  showPaywall = true  →  <Paywall> rendered

Paywall (mobile)
  └─> getOffering() — loads package list from RevenueCat
        └─> purchasePackage(pkg) — native App Store / Play Store sheet
              └─> success  →  refreshSub()  →  isPremium = true

Paywall (web)
  └─> Static message: "Subscribe via the mobile app"
        └─> Links to App Store + Google Play
```

---

## 4. Free Tier Limits

Defined in `src/services/subscription.js`:

| Feature            | Free limit      | Resets   |
|--------------------|-----------------|----------|
| AI suggestions     | 10 calls / day  | Midnight |
| Voice outputs      | 20 / day        | Midnight |
| Saved phrases      | 5 total         | Never    |

When any limit is reached, the paywall is shown automatically.
Premium users have no limits.

---

## 5. Developer Bypass

During local development, set in `.env.local`:

```
VITE_DEV_SUBSCRIPTION_OVERRIDE=true
```

This makes the app always treat the user as premium. The bypass is
**only effective when `import.meta.env.DEV` is true** (i.e., `npm run dev`).
Vite statically replaces the flag during `npm run build`, so the bypass
branch is dead-code-eliminated from production bundles.

A small `isDevOverride` flag is exported from `subscription.js` so the UI
can show a "DEV" badge on the Paywall when the override is active.

---

## 6. Web Behaviour

On web (`isNative === false`):

- `getIsPremium()` always returns `false`
- `purchasePackage()` throws immediately with a human-readable error
- `<Paywall>` renders an informational message with App Store / Play Store links
- RevenueCat SDK is never loaded (tree-shaken by Vite)

---

## 7. Setup

### Step 1 — Firebase

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
2. **Add a web app** to the project (gear icon → Project settings → Your apps)
3. Copy the config values (`apiKey`, `authDomain`, `projectId`, `appId`) into `.env.local`
4. Go to **Authentication → Sign-in method** and enable:
   - **Email/Password** (for email+password login and signup)
   - **Email link (passwordless sign-in)** (for magic link login)
5. For magic links, add your app domain to **Authentication → Settings → Authorized domains**

### Step 2 — RevenueCat

1. Create a project at [app.revenuecat.com](https://app.revenuecat.com)
2. Add iOS and Android apps; connect to App Store Connect + Google Play Console
3. Create an **Entitlement** named `premium`
4. Create a **Product** (monthly subscription) and add it to an **Offering** named `default`
5. Copy iOS and Android SDK keys into `.env.local`

### Step 3 — Install packages

```bash
npm install firebase @revenuecat/purchases-capacitor
npx cap sync
```

### Step 4 — iOS (CocoaPods)

RevenueCat requires a native pod. After `npx cap sync`:

```bash
cd ios/App
pod install
```

### Step 5 — Android

RevenueCat's Capacitor plugin includes the Android Gradle dependency
automatically via `cap sync`. No manual step required.

---

## 8. Compliance Notes

- **Apple App Store Rule 3.1.1**: All in-app purchases must use StoreKit.
  RevenueCat wraps StoreKit natively — compliant.
- **Google Play Billing Policy**: All in-app purchases must use Google Play
  Billing. RevenueCat wraps that natively — compliant.
- **Web purchases**: The web version intentionally shows no purchase UI,
  directing users to the mobile apps. This avoids any policy conflicts.
- **Subscription restoration**: The Paywall includes a "Restore purchases"
  button that calls `RC.restorePurchases()` as required by App Store rules.

---

## 9. Scaling Notes

- Firebase free tier (Spark plan) supports 10,000 MAU — enough for early traction.
  Upgrade to Blaze (pay-as-you-go) when you scale; it remains very cheap.
- RevenueCat free tier supports unlimited apps and 10,000 MAU.
- Both services scale automatically with no infrastructure changes required
  from the developer.
