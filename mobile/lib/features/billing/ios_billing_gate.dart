import 'package:flutter/foundation.dart';

/// iOS Plans UI + Apple IAP checkout.
///
/// - iOS app: Apple In-App Purchase (`opspick.silver.monthly` / `opspick.gold.monthly`).
/// - Android app + website: Razorpay (unchanged).
const bool kIosPlansPurchaseEnabled = true;

/// Whether the in-app Plans & Pricing screen / Upgrade CTAs should be shown.
bool get isPlansBillingUiEnabled {
  // Use defaultTargetPlatform — dart:io Platform crashes on Flutter web.
  if (defaultTargetPlatform != TargetPlatform.iOS) return true;
  return kIosPlansPurchaseEnabled;
}
