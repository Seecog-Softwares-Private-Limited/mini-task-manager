# App Store In-App Purchase (Guideline 3.1.1)

OpsPick sells Free / Silver / Gold digital plans. On **iOS**, those plans must be buyable via **Apple In-App Purchase**. Web and Android continue to use Razorpay. Users who bought on another platform keep access on iOS under guideline **3.1.3(b)**.

## Pre-submit gate (do not upload until every box is checked)

After six rejections, treat this as a hard gate. **Do not click Submit for Review** until all items pass.

### Metadata (App Store Connect)

- [ ] **Support URL** = `https://opspick.com/support` only — **never** `#pricing`, never a page with ₹ prices or Upgrade CTAs
- [ ] **Privacy Policy URL** = `https://opspick.com/privacypolicy`
- [ ] **Marketing URL** = `https://opspick.com` or **blank** — never `#pricing`
- [ ] App Description includes EULA: `https://www.apple.com/legal/internet-services/itunes/dev/stdeula/`
- [ ] App Description does **not** say “buy on website”, “cheaper on web”, or list web-only prices as the way to subscribe in the iOS app
- [ ] IAP products attached to this version: `opspick.silver.monthly`, `opspick.gold.monthly`
- [ ] Paid Applications Agreement + banking + tax are Active

### Live URL smoke tests (must be 200, not login redirect)

```bash
curl -sI https://opspick.com/support | head -5        # expect HTTP/2 200 (or 200)
curl -sI https://opspick.com/privacypolicy | head -5  # expect HTTP/2 200 (or 200)
```

- [ ] `/support` returns **200** without cookie / without login
- [ ] `/privacypolicy` returns **200** without cookie / without login
- [ ] `/support` has **no** plan prices, Upgrade buttons, signup-to-checkout, or link to `/#pricing`
- [ ] Open `/support` in a private browser window and confirm it is contact-only

### Binary / API

- [ ] Build **1.0.0 (23)** or newer (`mobile/pubspec.yaml` + Xcode `CURRENT_PROJECT_VERSION` match)
- [ ] On iOS device: upgrade uses **Apple sheet only** (no Razorpay UI)
- [ ] **Restore Purchases** works
- [ ] **Account Settings → Delete my account** succeeds (`DELETE /users/me`)
- [ ] API has `APPLE_IAP_*` + ASN V2 → `/api/v1/plans/apple/notifications`
- [ ] Demo account works on production: `test@test.com` / `Test123$` (re-seed: `npm run seed:app-review`)

### App Review Information (paste every submission)

```
OpsPick is a multiplatform productivity service (web, Android, and iOS).

Silver and Gold on iOS are sold only via Apple In-App Purchase:
- opspick.silver.monthly
- opspick.gold.monthly

Customers who subscribed on web or Android keep access on iOS under guideline 3.1.3(b).
iOS customers purchase or Restore Purchases via StoreKit only.

Support URL https://opspick.com/support is help/contact only (no pricing or external checkout).
Privacy Policy: https://opspick.com/privacypolicy
Terms of Use (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/

Demo login: test@test.com / Test123$
Sandbox Apple ID: <your sandbox tester>
Account deletion: Account Settings → Delete my account
```

### Reply if rejected again for Support URL / 3.1.1

```
We fixed the Support URL that pointed to our marketing pricing section.

Support URL is now https://opspick.com/support — help and contact only; no plans, prices, or external checkout.

iOS subscriptions are sold only via In-App Purchase (opspick.silver.monthly, opspick.gold.monthly). Web/Android billing is separate; customers who subscribed elsewhere keep access on iOS under guideline 3.1.3(b).
```

---

## App Store Connect (one-time product setup)

1. Open [App Store Connect](https://appstoreconnect.apple.com) → your app → **Subscriptions**.
2. Create subscription group: `opspick_plans`.
3. Create auto-renewable subscriptions:

| Product ID | Reference name | Duration | Maps to |
|---|---|---|---|
| `opspick.silver.monthly` | OpsPick Silver Monthly | 1 month | `silver` |
| `opspick.gold.monthly` | OpsPick Gold Monthly | 1 month | `gold` |

4. Set localization, pricing, and review screenshot/notes for each product.
5. Confirm **Paid Applications Agreement**, banking, and tax are Active.
6. Generate an **In-App Purchase Key** (Users and Access → Integrations → In-App Purchase).
7. Configure **App Store Server Notifications V2** URL:

   `https://<your-api-host>/api/v1/plans/apple/notifications`

## Server environment

```bash
APPLE_IAP_BUNDLE_ID=com.seecog.minitaskmanager.miniTaskManager
APPLE_IAP_ISSUER_ID=<asc-issuer-id>
APPLE_IAP_KEY_ID=<key-id>
APPLE_IAP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
# or path to .p8:
# APPLE_IAP_PRIVATE_KEY_PATH=/secure/AuthKey_XXXXX.p8
APPLE_IAP_ENVIRONMENT=Sandbox
# Production binary against live store: Production
APPLE_IAP_FALLBACK_SANDBOX=true
```

## Local StoreKit testing

Open `mobile/ios/Runner.xcworkspace` in Xcode → Scheme → Edit Scheme → Run → Options → StoreKit Configuration → `OpsPick.storekit`.

1. Configure server `APPLE_IAP_*` vars (Sandbox environment).
2. Run migration: `npm run migration:run`
3. Sign in with `test@test.com` / `Test123$`.
4. Account Settings → **Subscription Plans** → upgrade Silver or Gold (Apple sheet).
5. Confirm API `POST /plans/apple/verify` returns `plan: silver|gold`.
6. Tap **Restore Purchases** on a second device with the same Sandbox Apple ID.
7. Log in with a web/Razorpay-upgraded account on iOS and confirm paid limits without repurchasing (3.1.3(b)).
8. Account Settings → **Delete my account** on a disposable test user (not the shared review account unless you re-seed).

Automated checks: `npx jest src/plans/apple-iap.integration-spec.ts`

## Resubmit to App Review (build 23+)

1. Deploy frontend so `/support` + `/privacypolicy` return 200 unauthenticated.
2. Deploy API with `DELETE /users/me` + Apple IAP env.
3. Set ASC Support URL / Privacy / Marketing / EULA as in the gate above.
4. Archive **1.0.0 (23)+**; upload; attach IAP products.
5. Paste **App Review Information** template (with real Sandbox Apple ID).
6. Run the pre-submit gate once more, then submit.
