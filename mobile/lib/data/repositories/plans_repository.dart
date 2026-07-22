import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/api/api_exception.dart';
import '../models/plan.dart';

class PlansRepository {
  PlansRepository({required ApiClient apiClient}) : _api = apiClient;

  final ApiClient _api;

  Future<List<PlanListItem>> listPlans() async {
    try {
      final response = await _api.dio.get<List<dynamic>>('/plans');
      final list = response.data ?? const [];
      return list
          .whereType<Map<String, dynamic>>()
          .map(PlanListItem.fromJson)
          .toList();
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<CurrentPlan> fetchCurrentPlan() async {
    try {
      final response =
          await _api.dio.get<Map<String, dynamic>>('/plans/current');
      return CurrentPlan.fromJson(response.data ?? const {});
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<CurrentPlan> fetchPlanUsage() async {
    try {
      final response = await _api.dio.get<Map<String, dynamic>>('/plans/usage');
      return CurrentPlan.fromJson(response.data ?? const {});
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<CouponValidation> validateCoupon({
    required String code,
    required String plan,
  }) async {
    try {
      final response = await _api.dio.post<Map<String, dynamic>>(
        '/plans/validate-coupon',
        data: {'code': code.trim(), 'plan': plan},
      );
      return CouponValidation.fromJson(response.data ?? const {});
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<CreatePlanOrderResult> createOrder({
    required String plan,
    String? couponCode,
  }) async {
    try {
      final response = await _api.dio.post<Map<String, dynamic>>(
        '/plans/create-order',
        data: {
          'plan': plan,
          if (couponCode != null && couponCode.trim().isNotEmpty)
            'couponCode': couponCode.trim(),
        },
      );
      return CreatePlanOrderResult.fromJson(response.data ?? const {});
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<({String plan, String? planExpiresAt})> verifyPayment({
    required String plan,
    required String razorpayOrderId,
    required String razorpayPaymentId,
    required String razorpaySignature,
    String? couponCode,
  }) async {
    try {
      final response = await _api.dio.post<Map<String, dynamic>>(
        '/plans/verify-payment',
        data: {
          'plan': plan,
          'razorpay_order_id': razorpayOrderId,
          'razorpay_payment_id': razorpayPaymentId,
          'razorpay_signature': razorpaySignature,
          if (couponCode != null && couponCode.trim().isNotEmpty)
            'couponCode': couponCode.trim(),
        },
      );
      final data = response.data ?? const {};
      return (
        plan: data['plan'] as String? ?? plan,
        planExpiresAt: data['planExpiresAt'] as String?,
      );
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }
}

final plansRepositoryProvider = Provider<PlansRepository>((ref) {
  return PlansRepository(apiClient: ref.watch(apiClientProvider));
});

final userPlansListProvider =
    FutureProvider.autoDispose<List<PlanListItem>>((ref) {
  return ref.watch(plansRepositoryProvider).listPlans();
});

final currentUserPlanProvider = FutureProvider.autoDispose<CurrentPlan>((ref) {
  return ref.watch(plansRepositoryProvider).fetchCurrentPlan();
});
