import 'dart:io';

/// Temporary gate for App Review while Apple IAP products are not submitted.
///
/// - Android/web: plans UI stays available (Razorpay).
/// - iOS: hide Plans / Upgrade entry points so this binary does not offer
///   paid digital subscriptions for purchase.
///
/// Set [kIosPlansPurchaseEnabled] to `true` in a later update after
/// `opspick.silver.monthly` / `opspick.gold.monthly` are live in App Store Connect.
const bool kIosPlansPurchaseEnabled = false;

/// Whether the in-app Plans & Pricing screen / Upgrade CTAs should be shown.
bool get isPlansBillingUiEnabled {
  if (!Platform.isIOS) return true;
  return kIosPlansPurchaseEnabled;
}
