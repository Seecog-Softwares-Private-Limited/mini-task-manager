import 'dart:async';
import 'dart:io';

import 'package:in_app_purchase/in_app_purchase.dart';

import '../../data/models/plan.dart';
import '../../data/repositories/plans_repository.dart';

class AppleIapCheckoutException implements Exception {
  AppleIapCheckoutException(this.message);
  final String message;

  @override
  String toString() => message;
}

/// App Store Connect product identifiers.
abstract final class AppleIapProducts {
  static const silverMonthly = 'opspick.silver.monthly';
  static const goldMonthly = 'opspick.gold.monthly';
  static const all = <String>{silverMonthly, goldMonthly};

  static String? productIdForPlan(String plan) {
    if (plan == UserPlans.silver) return silverMonthly;
    if (plan == UserPlans.gold) return goldMonthly;
    return null;
  }

  static String? planForProductId(String productId) {
    if (productId == silverMonthly) return UserPlans.silver;
    if (productId == goldMonthly) return UserPlans.gold;
    return null;
  }
}

typedef _VerifiedPurchase = ({
  String transactionId,
  String? signedTransaction,
  String productId,
});

/// StoreKit checkout + restore for iOS (Guideline 3.1.1).
class AppleIapCheckoutService {
  AppleIapCheckoutService({required PlansRepository repository})
      : _repository = repository;

  final PlansRepository _repository;
  final InAppPurchase _iap = InAppPurchase.instance;

  Future<Map<String, ProductDetails>> loadProducts() async {
    if (!Platform.isIOS) return {};
    final available = await _iap.isAvailable();
    if (!available) {
      throw AppleIapCheckoutException(
        'App Store purchases are not available on this device.',
      );
    }
    final response = await _iap.queryProductDetails(AppleIapProducts.all);
    if (response.error != null) {
      throw AppleIapCheckoutException(response.error!.message);
    }
    return {for (final p in response.productDetails) p.id: p};
  }

  Future<String> upgrade({required String plan}) async {
    _assertIos();
    final productId = AppleIapProducts.productIdForPlan(plan);
    if (productId == null) {
      throw AppleIapCheckoutException(
        'This plan is not available via In-App Purchase.',
      );
    }
    final products = await loadProducts();
    final product = products[productId];
    if (product == null) {
      throw AppleIapCheckoutException(
        'This subscription is not available yet. Please try again shortly.',
      );
    }

    final purchase = await _purchaseProduct(product);
    final verified = await _repository.verifyApplePurchase(
      transactionId: purchase.transactionId,
      signedTransaction: purchase.signedTransaction,
      productId: purchase.productId,
    );
    return verified.plan;
  }

  Future<String> restore() async {
    _assertIos();
    final restored = await _restorePurchases();
    if (restored.isEmpty) {
      throw AppleIapCheckoutException(
        'No previous purchases found for this Apple ID.',
      );
    }

    String? bestPlan;
    for (final purchase in restored) {
      final verified = await _repository.verifyApplePurchase(
        transactionId: purchase.transactionId,
        signedTransaction: purchase.signedTransaction,
        productId: purchase.productId,
      );
      bestPlan = verified.plan;
    }
    return bestPlan ?? UserPlans.free;
  }

  void _assertIos() {
    if (!Platform.isIOS) {
      throw AppleIapCheckoutException('Apple IAP is only available on iOS.');
    }
  }

  Future<_VerifiedPurchase> _purchaseProduct(ProductDetails product) async {
    final completer = Completer<_VerifiedPurchase>();
    late StreamSubscription<List<PurchaseDetails>> sub;

    sub = _iap.purchaseStream.listen((purchases) async {
      for (final purchase in purchases) {
        if (purchase.productID != product.id) continue;

        switch (purchase.status) {
          case PurchaseStatus.pending:
            continue;
          case PurchaseStatus.error:
            if (!completer.isCompleted) {
              completer.completeError(
                AppleIapCheckoutException(
                  purchase.error?.message ?? 'Purchase failed.',
                ),
              );
            }
          case PurchaseStatus.canceled:
            if (!completer.isCompleted) {
              completer.completeError(
                AppleIapCheckoutException('Purchase was canceled.'),
              );
            }
          case PurchaseStatus.purchased:
          case PurchaseStatus.restored:
            if (purchase.pendingCompletePurchase) {
              await _iap.completePurchase(purchase);
            }
            final txId = purchase.purchaseID?.trim() ?? '';
            if (txId.isEmpty) continue;
            if (!completer.isCompleted) {
              completer.complete((
                transactionId: txId,
                signedTransaction:
                    _signedPayload(purchase.verificationData.serverVerificationData),
                productId: purchase.productID,
              ));
            }
        }
      }
    });

    final started = await _iap.buyNonConsumable(
      purchaseParam: PurchaseParam(productDetails: product),
    );
    if (!started) {
      await sub.cancel();
      throw AppleIapCheckoutException('Could not start purchase.');
    }

    try {
      return await completer.future.timeout(
        const Duration(minutes: 5),
        onTimeout: () => throw AppleIapCheckoutException('Purchase timed out.'),
      );
    } finally {
      await sub.cancel();
    }
  }

  Future<List<_VerifiedPurchase>> _restorePurchases() async {
    final results = <_VerifiedPurchase>[];
    final seen = <String>{};
    late StreamSubscription<List<PurchaseDetails>> sub;
    final done = Completer<void>();

    sub = _iap.purchaseStream.listen((purchases) async {
      for (final purchase in purchases) {
        if (purchase.status != PurchaseStatus.restored &&
            purchase.status != PurchaseStatus.purchased) {
          continue;
        }
        if (purchase.pendingCompletePurchase) {
          await _iap.completePurchase(purchase);
        }
        final txId = purchase.purchaseID?.trim() ?? '';
        if (txId.isEmpty || seen.contains(txId)) continue;
        seen.add(txId);
        results.add((
          transactionId: txId,
          signedTransaction:
              _signedPayload(purchase.verificationData.serverVerificationData),
          productId: purchase.productID,
        ));
      }
      if (!done.isCompleted) done.complete();
    });

    await _iap.restorePurchases();
    await done.future.timeout(
      const Duration(seconds: 8),
      onTimeout: () {},
    );
    await sub.cancel();
    return results;
  }

  String? _signedPayload(String value) {
    final trimmed = value.trim();
    return trimmed.isEmpty ? null : trimmed;
  }
}
