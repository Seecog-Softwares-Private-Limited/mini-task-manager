# App Store In-App Purchase (Guideline 3.1.1)

OpsPick sells Free / Silver / Gold digital plans. On **iOS**, those plans must be buyable via **Apple In-App Purchase**. Web and Android continue to use Razorpay. Users who bought on another platform keep access on iOS under guideline **3.1.3(b)**.

## App Store Connect (manual)

1. Open [App Store Connect](https://appstoreconnect.apple.com) → your app → **Subscriptions**.
2. Create subscription group: `opspick_plans`.
3. Create auto-renewable subscriptions:

| Product ID | Reference name | Duration | Maps to |
|---|---|---|---|
| `opspick.silver.monthly` | OpsPick Silver Monthly | 1 month | `silver` |
| `opspick.gold.monthly` | OpsPick Gold Monthly | 1 month | `gold` |

4. Set localization, pricing, and review screenshot/notes for each product.
5. Confirm **Paid Applications Agreement**, banking, and tax are Active.
6. Generate an **In-App Purchase Key** (Users and Access → Integrations → In-App Purchase) and note:
   - Issuer ID
   - Key ID
   - `.p8` private key file
7. Configure **App Store Server Notifications V2** URL:

   `https://<your-api-host>/api/v1/plans/apple/notifications`

8. Submit the IAP products **with** the next iOS binary (build > 18).
9. In **App Information**, set Privacy Policy URL to `https://opspick.com/privacypolicy` (must load over HTTPS).
10. In **App Information**, set **Support URL** to `https://opspick.com/support` (must load over HTTPS).
    - **Never** use `https://opspick.com/#pricing` or any page with plan prices / upgrade / external checkout CTAs.
11. If **Marketing URL** is set, use `https://opspick.com` (no `#pricing` hash). Leave blank if unused.
12. In the version **App Description**, include the Terms of Use link when using Apple's standard EULA:
    `https://www.apple.com/legal/internet-services/itunes/dev/stdeula/`

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
# Optional: also try Sandbox when Production lookup fails (recommended)
APPLE_IAP_FALLBACK_SANDBOX=true
```

## Local StoreKit testing

Open `mobile/ios/Runner.xcworkspace` in Xcode → Scheme → Edit Scheme → Run → Options → StoreKit Configuration → `OpsPick.storekit`.

## App Review reply (paste into ASC)

```
OpsPick is a multiplatform productivity service (web, Android, and iOS).

Silver and Gold subscription plans are now available for purchase on iOS via In-App Purchase:
- opspick.silver.monthly
- opspick.gold.monthly

Customers who subscribed on the web or Android may continue using that entitlement in the iOS app under guideline 3.1.3(b). iOS customers can purchase the same plans using Apple In-App Purchase (StoreKit), including Restore Purchases.

Test account: <review login email / password>
Sandbox Apple ID: <sandbox tester>
```

## App Review reply — Guideline 3.1.1 Support URL (paste into ASC rejection thread)

Use when Apple cites the Support URL pointing at marketing pricing (`#pricing`) or other external purchase links:

```
We fixed the Support URL that pointed to our marketing pricing section.

Support URL is now https://opspick.com/support — help and contact only; no plans, prices, or external checkout.

iOS subscriptions are sold only via In-App Purchase (opspick.silver.monthly, opspick.gold.monthly). Web/Android billing is separate; customers who subscribed elsewhere keep access on iOS under guideline 3.1.3(b).
```

## Sandbox / StoreKit test steps

1. Configure server `APPLE_IAP_*` vars (Sandbox environment).
2. Run migration: `npm run migration:run`
3. In Xcode, attach `mobile/ios/Runner/OpsPick.storekit` to the Run scheme.
4. Sign in to the app with a test OpsPick account.
5. Account Settings → **Plans & Pricing** → upgrade Silver or Gold (Apple sheet).
6. Confirm API `POST /plans/apple/verify` returns `plan: silver|gold`.
7. Tap **Restore** on a second device/simulator with the same Sandbox Apple ID.
8. Log in with a web/Razorpay-upgraded account on iOS and confirm paid limits work without repurchasing (3.1.3(b)).

Automated checks: `npx jest src/plans/apple-iap.integration-spec.ts`

## Resubmit after Support URL rejection (3.1.1 metadata)

1. Deploy frontend so `https://opspick.com/support` returns 200 (push `frontend/**` to `lakshya` to trigger Lightsail deploy, or deploy manually).
2. App Store Connect → **App Information** → Support URL = `https://opspick.com/support`.
3. Confirm Marketing URL is not `#pricing` (use `https://opspick.com` or blank).
4. Reply in the rejection thread with the **Guideline 3.1.1 Support URL** reply above (also paste into App Review Information).
5. Resubmit version **1.0.0 (22)** (or newer). No new binary required for this metadata-only fix unless you already have other binary changes.

## Resubmit to App Review

1. Bump build in Xcode / `mobile/pubspec.yaml` (current: `1.0.0+21`).
2. Archive iOS release; upload to App Store Connect.
3. Attach IAP products `opspick.silver.monthly` and `opspick.gold.monthly` to the version.
4. Deploy API with Apple env vars + run migration on production DB.
5. Set ASN V2 URL to production `/api/v1/plans/apple/notifications`.
6. Paste the **App Review reply** above into the rejection thread and App Review Information.
7. Submit for review.


- [ ] ASC products Ready to Submit with binary
- [ ] Apple IAP env vars set on API host
- [ ] ASN V2 URL configured
- [ ] Sandbox purchase → `users.current_plan` updates
- [ ] Restore Purchases works
- [ ] Razorpay checkout never shown on iOS
- [ ] Review notes include 3.1.3(b) explanation
- [ ] Privacy Policy URL live at https://opspick.com/privacypolicy
- [ ] Support URL live at https://opspick.com/support (no pricing / checkout CTAs)
- [ ] Support URL in ASC is **not** `#pricing` or any external purchase page
- [ ] Marketing URL (if set) is https://opspick.com — not `#pricing`
- [ ] App Description includes Apple standard EULA link (if using standard EULA)
- [ ] New build uploaded and submitted (> build 19; current target: **21**)
