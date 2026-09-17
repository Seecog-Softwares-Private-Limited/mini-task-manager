import 'dart:async';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:razorpay_flutter/razorpay_flutter.dart';

import '../../data/models/plan.dart';
import '../../data/repositories/plans_repository.dart';
import 'apple_iap_checkout_service.dart';

class PlanCheckoutException implements Exception {
  PlanCheckoutException(this.message);
  final String message;

  @override
  String toString() => message;
}

/// Opens checkout for a user plan upgrade (Apple IAP on iOS, Razorpay elsewhere).
class PlanCheckoutService {
  PlanCheckoutService({required PlansRepository repository})
      : _repository = repository;

  final PlansRepository _repository;

  Future<String> upgrade({
    required String plan,
    String? couponCode,
    String? userName,
    String? userEmail,
  }) async {
    if (Platform.isIOS) {
      try {
        return await AppleIapCheckoutService(repository: _repository).upgrade(
          plan: plan,
        );
      } on AppleIapCheckoutException catch (e) {
        throw PlanCheckoutException(e.message);
      }
    }

    final order = await _repository.createOrder(
      plan: plan,
      couponCode: couponCode,
    );

    if (!order.requiresPayment) {
      return order.plan ?? plan;
    }

    final rz = order.razorpay;
    if (rz == null || rz.orderId.isEmpty || rz.keyId.isEmpty) {
      throw PlanCheckoutException(
        'Payment could not be started. Please try again.',
      );
    }

    if (kIsWeb) {
      throw PlanCheckoutException(
        'In-app checkout is available on the iOS/Android app. '
        'Use the website Plans page on web.',
      );
    }

    final payment = await _openRazorpay(
      order: rz,
      plan: plan,
      userName: userName,
      userEmail: userEmail,
    );

    final verified = await _repository.verifyPayment(
      plan: plan,
      razorpayOrderId: payment.orderId,
      razorpayPaymentId: payment.paymentId,
      razorpaySignature: payment.signature,
      couponCode: couponCode,
    );
    return verified.plan;
  }

  Future<String> restorePurchases() async {
    if (!Platform.isIOS) {
      throw PlanCheckoutException('Restore is only available on iOS.');
    }
    try {
      return await AppleIapCheckoutService(repository: _repository).restore();
    } on AppleIapCheckoutException catch (e) {
      throw PlanCheckoutException(e.message);
    }
  }

  Future<({String orderId, String paymentId, String signature})> _openRazorpay({
    required UserPlanRazorpayOrder order,
    required String plan,
    String? userName,
    String? userEmail,
  }) async {
    final razorpay = Razorpay();
    final completer =
        Completer<({String orderId, String paymentId, String signature})>();

    void clearHandlers() {
      razorpay.clear();
    }

    razorpay.on(Razorpay.EVENT_PAYMENT_SUCCESS, (PaymentSuccessResponse res) {
      if (completer.isCompleted) return;
      completer.complete((
        orderId: res.orderId ?? order.orderId,
        paymentId: res.paymentId ?? '',
        signature: res.signature ?? '',
      ));
      clearHandlers();
    });

    razorpay.on(Razorpay.EVENT_PAYMENT_ERROR, (PaymentFailureResponse res) {
      if (completer.isCompleted) return;
      completer.completeError(
        PlanCheckoutException(
          res.message?.trim().isNotEmpty == true
              ? res.message!.trim()
              : 'Payment was not completed. You can try again.',
        ),
      );
      clearHandlers();
    });

    razorpay.on(Razorpay.EVENT_EXTERNAL_WALLET, (_) {
      // External wallets still complete via SUCCESS/ERROR.
    });

    final planLabel = order.planName ?? UserPlans.displayName(plan);
    razorpay.open({
      'key': order.keyId,
      'amount': order.amount,
      'currency': order.currency,
      'name': 'OpsPick',
      'description': '$planLabel plan — monthly',
      'order_id': order.orderId,
      'prefill': {
        if (userName != null && userName.trim().isNotEmpty) 'name': userName.trim(),
        if (userEmail != null && userEmail.trim().isNotEmpty)
          'email': userEmail.trim(),
      },
      'theme': {
        'color': plan == UserPlans.gold ? '#F59E0B' : '#8B5CF6',
      },
    });

    try {
      return await completer.future.timeout(
        const Duration(minutes: 15),
        onTimeout: () {
          clearHandlers();
          throw PlanCheckoutException('Payment timed out. Please try again.');
        },
      );
    } catch (e) {
      clearHandlers();
      rethrow;
    }
  }
}
