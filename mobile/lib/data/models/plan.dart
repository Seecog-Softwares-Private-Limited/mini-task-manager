import 'package:equatable/equatable.dart';

typedef UserPlanSlug = String;

abstract final class UserPlans {
  static const free = 'free';
  static const silver = 'silver';
  static const gold = 'gold';
  static const order = <String>[free, silver, gold];

  static String displayName(String slug) {
    if (slug.isEmpty) return slug;
    return '${slug[0].toUpperCase()}${slug.substring(1)}';
  }

  static bool canUpgradeTo(String? current, String target) {
    if (current == null) return target != free;
    if (current == gold) return false;
    if (target == free) return false;
    if (current == silver) return target == gold;
    if (current == free) return target == silver || target == gold;
    return false;
  }

  static String ctaLabel(String target, String current) {
    if (target == current) {
      return target == free ? 'Included' : 'Current plan';
    }
    final targetIdx = order.indexOf(target);
    final currentIdx = order.indexOf(current);
    if (targetIdx >= 0 && currentIdx >= 0 && targetIdx < currentIdx) {
      return 'Contact support to downgrade';
    }
    return 'Upgrade to ${displayName(target)}';
  }

  static bool ctaEnabled(String target, String current) =>
      canUpgradeTo(current, target);

  static String formatBytes(num bytes) {
    final value = bytes.toDouble();
    if (value >= 1024 * 1024 * 1024) {
      return '${(value / (1024 * 1024 * 1024)).toStringAsFixed(1)} GB';
    }
    if (value >= 1024 * 1024) {
      return '${(value / (1024 * 1024)).round()} MB';
    }
    return '${value.round()} B';
  }

  static String limitLabel(num? n) => n == null ? 'Unlimited' : '$n';
}

class PlanLimits extends Equatable {
  const PlanLimits({
    required this.maxWorkspaces,
    required this.maxMembersPerWorkspace,
    required this.storageBytes,
  });

  final int? maxWorkspaces;
  final int? maxMembersPerWorkspace;
  final int storageBytes;

  factory PlanLimits.fromJson(Map<String, dynamic> json) {
    return PlanLimits(
      maxWorkspaces: json['maxWorkspaces'] as int?,
      maxMembersPerWorkspace: json['maxMembersPerWorkspace'] as int?,
      storageBytes: (json['storageBytes'] as num?)?.toInt() ?? 0,
    );
  }

  @override
  List<Object?> get props =>
      [maxWorkspaces, maxMembersPerWorkspace, storageBytes];
}

class PlanListItem extends Equatable {
  const PlanListItem({
    required this.slug,
    required this.name,
    required this.price,
    required this.currency,
    required this.priceLabel,
    required this.limits,
    required this.benefits,
    this.allowCoupon = false,
  });

  final String slug;
  final String name;
  final num price;
  final String currency;
  final String priceLabel;
  final PlanLimits limits;
  final List<String> benefits;
  final bool allowCoupon;

  factory PlanListItem.fromJson(Map<String, dynamic> json) {
    return PlanListItem(
      slug: json['slug'] as String? ?? UserPlans.free,
      name: json['name'] as String? ?? '',
      price: json['price'] as num? ?? 0,
      currency: json['currency'] as String? ?? 'INR',
      priceLabel: json['priceLabel'] as String? ?? '',
      limits: PlanLimits.fromJson(
        (json['limits'] as Map<String, dynamic>?) ?? const {},
      ),
      benefits: (json['benefits'] as List<dynamic>?)
              ?.whereType<String>()
              .toList() ??
          const [],
      allowCoupon: json['allowCoupon'] as bool? ?? false,
    );
  }

  @override
  List<Object?> get props =>
      [slug, name, price, currency, priceLabel, limits, benefits, allowCoupon];
}

class PlanUsageBucket extends Equatable {
  const PlanUsageBucket({required this.used, required this.limit});

  final int used;
  final int? limit;

  factory PlanUsageBucket.fromJson(Map<String, dynamic> json) {
    return PlanUsageBucket(
      used: (json['used'] as num?)?.toInt() ?? 0,
      limit: json['limit'] as int?,
    );
  }

  @override
  List<Object?> get props => [used, limit];
}

class PlanStorageUsage extends Equatable {
  const PlanStorageUsage({required this.usedBytes, required this.limitBytes});

  final int usedBytes;
  final int limitBytes;

  factory PlanStorageUsage.fromJson(Map<String, dynamic> json) {
    return PlanStorageUsage(
      usedBytes: (json['usedBytes'] as num?)?.toInt() ?? 0,
      limitBytes: (json['limitBytes'] as num?)?.toInt() ?? 0,
    );
  }

  @override
  List<Object?> get props => [usedBytes, limitBytes];
}

class PlanDefinition extends Equatable {
  const PlanDefinition({
    required this.slug,
    required this.name,
    required this.priceLabel,
    required this.limits,
    required this.benefits,
  });

  final String slug;
  final String name;
  final String priceLabel;
  final PlanLimits limits;
  final List<String> benefits;

  factory PlanDefinition.fromJson(Map<String, dynamic> json) {
    final pricing = json['pricing'] as Map<String, dynamic>? ?? const {};
    return PlanDefinition(
      slug: json['slug'] as String? ?? UserPlans.free,
      name: json['name'] as String? ?? '',
      priceLabel: pricing['label'] as String? ?? '',
      limits: PlanLimits.fromJson(
        (json['limits'] as Map<String, dynamic>?) ?? const {},
      ),
      benefits: (json['benefits'] as List<dynamic>?)
              ?.whereType<String>()
              .toList() ??
          const [],
    );
  }

  @override
  List<Object?> get props => [slug, name, priceLabel, limits, benefits];
}

class CurrentPlan extends Equatable {
  const CurrentPlan({
    required this.plan,
    required this.definition,
    required this.usage,
    this.planStartedAt,
    this.planExpiresAt,
  });

  final String plan;
  final PlanDefinition definition;
  final DateTime? planStartedAt;
  final DateTime? planExpiresAt;
  final ({
    PlanUsageBucket workspaces,
    PlanUsageBucket members,
    PlanStorageUsage storage,
  }) usage;

  factory CurrentPlan.fromJson(Map<String, dynamic> json) {
    final usage = json['usage'] as Map<String, dynamic>? ?? const {};
    return CurrentPlan(
      plan: json['plan'] as String? ?? UserPlans.free,
      definition: PlanDefinition.fromJson(
        (json['definition'] as Map<String, dynamic>?) ?? const {},
      ),
      planStartedAt: DateTime.tryParse(json['planStartedAt'] as String? ?? ''),
      planExpiresAt: DateTime.tryParse(json['planExpiresAt'] as String? ?? ''),
      usage: (
        workspaces: PlanUsageBucket.fromJson(
          (usage['workspaces'] as Map<String, dynamic>?) ?? const {},
        ),
        members: PlanUsageBucket.fromJson(
          (usage['members'] as Map<String, dynamic>?) ?? const {},
        ),
        storage: PlanStorageUsage.fromJson(
          (usage['storage'] as Map<String, dynamic>?) ?? const {},
        ),
      ),
    );
  }

  @override
  List<Object?> get props =>
      [plan, definition, planStartedAt, planExpiresAt, usage];
}

class CouponValidation extends Equatable {
  const CouponValidation({
    required this.valid,
    required this.code,
    required this.plan,
    required this.discountPercent,
    required this.originalAmountInr,
    required this.finalAmountInr,
    required this.savingsInr,
    this.message,
  });

  final bool valid;
  final String code;
  final String plan;
  final num discountPercent;
  final num originalAmountInr;
  final num finalAmountInr;
  final num savingsInr;
  final String? message;

  factory CouponValidation.fromJson(Map<String, dynamic> json) {
    return CouponValidation(
      valid: json['valid'] as bool? ?? false,
      code: json['code'] as String? ?? '',
      plan: json['plan'] as String? ?? UserPlans.free,
      discountPercent: json['discountPercent'] as num? ?? 0,
      originalAmountInr: json['originalAmountInr'] as num? ?? 0,
      finalAmountInr: json['finalAmountInr'] as num? ?? 0,
      savingsInr: json['savingsInr'] as num? ?? 0,
      message: json['message'] as String?,
    );
  }

  @override
  List<Object?> get props => [
        valid,
        code,
        plan,
        discountPercent,
        originalAmountInr,
        finalAmountInr,
        savingsInr,
        message,
      ];
}

class UserPlanRazorpayOrder extends Equatable {
  const UserPlanRazorpayOrder({
    required this.orderId,
    required this.amount,
    required this.currency,
    required this.keyId,
    required this.amountInr,
    this.planName,
  });

  final String orderId;
  final int amount;
  final String currency;
  final String keyId;
  final num amountInr;
  final String? planName;

  factory UserPlanRazorpayOrder.fromJson(Map<String, dynamic> json) {
    return UserPlanRazorpayOrder(
      orderId: json['orderId'] as String? ?? '',
      amount: (json['amount'] as num?)?.toInt() ?? 0,
      currency: json['currency'] as String? ?? 'INR',
      keyId: json['keyId'] as String? ?? '',
      amountInr: json['amountInr'] as num? ?? 0,
      planName: json['planName'] as String?,
    );
  }

  @override
  List<Object?> get props =>
      [orderId, amount, currency, keyId, amountInr, planName];
}

class CreatePlanOrderResult extends Equatable {
  const CreatePlanOrderResult({
    required this.requiresPayment,
    this.plan,
    this.planExpiresAt,
    this.message,
    this.razorpay,
    this.originalAmountInr,
    this.finalAmountInr,
    this.couponApplied = false,
  });

  final bool requiresPayment;
  final String? plan;
  final String? planExpiresAt;
  final String? message;
  final UserPlanRazorpayOrder? razorpay;
  final num? originalAmountInr;
  final num? finalAmountInr;
  final bool couponApplied;

  factory CreatePlanOrderResult.fromJson(Map<String, dynamic> json) {
    final rz = json['razorpay'];
    return CreatePlanOrderResult(
      requiresPayment: json['requiresPayment'] as bool? ?? false,
      plan: json['plan'] as String?,
      planExpiresAt: json['planExpiresAt'] as String?,
      message: json['message'] as String?,
      razorpay: rz is Map<String, dynamic>
          ? UserPlanRazorpayOrder.fromJson(rz)
          : null,
      originalAmountInr: json['originalAmountInr'] as num?,
      finalAmountInr: json['finalAmountInr'] as num?,
      couponApplied: json['couponApplied'] as bool? ?? false,
    );
  }

  @override
  List<Object?> get props => [
        requiresPayment,
        plan,
        planExpiresAt,
        message,
        razorpay,
        originalAmountInr,
        finalAmountInr,
        couponApplied,
      ];
}
