import 'dart:io';

import 'package:in_app_purchase/in_app_purchase.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/api/api_exception.dart';
import '../../core/messaging/app_messenger.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/models/plan.dart';
import '../../data/repositories/plans_repository.dart';
import '../../shared/widgets/app_widgets.dart';
import '../auth/session_controller.dart';
import 'plan_checkout_service.dart';
import 'apple_iap_checkout_service.dart';

class PlansBillingScreen extends ConsumerStatefulWidget {
  const PlansBillingScreen({super.key});

  @override
  ConsumerState<PlansBillingScreen> createState() => _PlansBillingScreenState();
}

class _PlansBillingScreenState extends ConsumerState<PlansBillingScreen> {
  String? _upgradingSlug;
  String? _validatingSlug;
  bool _restoring = false;
  Map<String, ProductDetails> _appleProducts = {};
  final Map<String, TextEditingController> _couponControllers = {};
  final Map<String, CouponValidation?> _appliedCoupons = {};

  bool get _isIos => Platform.isIOS;

  @override
  void initState() {
    super.initState();
    if (_isIos) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _loadAppleProducts());
    }
  }

  Future<void> _loadAppleProducts() async {
    try {
      final products =
          await AppleIapCheckoutService(repository: ref.read(plansRepositoryProvider))
              .loadProducts();
      if (mounted) setState(() => _appleProducts = products);
    } catch (_) {
      // Store prices fall back to API price labels.
    }
  }

  @override
  void dispose() {
    for (final c in _couponControllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  TextEditingController _couponControllerFor(String slug) {
    return _couponControllers.putIfAbsent(slug, TextEditingController.new);
  }

  Future<void> _refresh() async {
    ref.invalidate(userPlansListProvider);
    ref.invalidate(currentUserPlanProvider);
    await Future.wait([
      ref.read(userPlansListProvider.future),
      ref.read(currentUserPlanProvider.future),
    ]);
  }

  Future<void> _applyCoupon(String plan) async {
    final code = _couponControllerFor(plan).text.trim();
    if (code.isEmpty) {
      showAppMessage('Enter a coupon code', isError: true);
      return;
    }
    setState(() => _validatingSlug = plan);
    try {
      final result = await ref.read(plansRepositoryProvider).validateCoupon(
            code: code,
            plan: plan,
          );
      setState(() => _appliedCoupons[plan] = result);
      if (result.valid) {
        showAppMessage(
          '${result.discountPercent}% off — pay ₹${result.finalAmountInr} '
          'instead of ₹${result.originalAmountInr}',
        );
      } else {
        showAppMessage(
          result.message ?? 'This code cannot be used for this plan',
          isError: true,
        );
      }
    } on ApiException catch (e) {
      showAppMessage(e.message, isError: true);
    } catch (_) {
      showAppMessage('Could not validate coupon', isError: true);
    } finally {
      if (mounted) setState(() => _validatingSlug = null);
    }
  }

  Future<void> _upgrade(String plan) async {
    final applied = _appliedCoupons[plan];
    final couponCode =
        !_isIos && applied?.valid == true ? applied!.code : null;
    final user = ref.read(sessionControllerProvider).user;

    setState(() => _upgradingSlug = plan);
    try {
      final activated = await PlanCheckoutService(
        repository: ref.read(plansRepositoryProvider),
      ).upgrade(
        plan: plan,
        couponCode: couponCode,
        userName: user?.fullName,
        userEmail: user?.email,
      );
      showAppMessage('You are now on the ${UserPlans.displayName(activated)} plan.');
      await _refresh();
    } on PlanCheckoutException catch (e) {
      showAppMessage(e.message, isError: true);
    } on ApiException catch (e) {
      showAppMessage(e.message, isError: true);
    } catch (e) {
      showAppMessage('Upgrade failed. Please try again.', isError: true);
      debugPrint('Plan upgrade failed: $e');
    } finally {
      if (mounted) setState(() => _upgradingSlug = null);
    }
  }

  Future<void> _restorePurchases() async {
    setState(() => _restoring = true);
    try {
      final plan = await PlanCheckoutService(
        repository: ref.read(plansRepositoryProvider),
      ).restorePurchases();
      showAppMessage('Restored ${UserPlans.displayName(plan)} plan.');
      await _refresh();
    } on PlanCheckoutException catch (e) {
      showAppMessage(e.message, isError: true);
    } on ApiException catch (e) {
      showAppMessage(e.message, isError: true);
    } catch (e) {
      showAppMessage('Restore failed. Please try again.', isError: true);
    } finally {
      if (mounted) setState(() => _restoring = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final plansAsync = ref.watch(userPlansListProvider);
    final currentAsync = ref.watch(currentUserPlanProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Plans & Pricing'),
        actions: [
          if (_isIos)
            TextButton(
              onPressed: _restoring ? null : _restorePurchases,
              child: _restoring
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Restore'),
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.md),
          children: [
            Text(
              'Plans that scale with you',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              _isIos
                  ? 'Subscribe with Apple In-App Purchase. Already subscribed on another device? Tap Restore.'
                  : 'Transparent pricing for your account: Free, Silver, and Gold.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppColors.textMuted,
                  ),
            ),
            const SizedBox(height: AppSpacing.md),
            currentAsync.when(
              data: (current) => _CurrentPlanCard(current: current),
              loading: () => const SurfaceCard(
                child: Padding(
                  padding: EdgeInsets.all(AppSpacing.md),
                  child: Center(child: CircularProgressIndicator()),
                ),
              ),
              error: (e, _) => SurfaceCard(
                child: Text(
                  e is ApiException ? e.message : 'Could not load current plan',
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            plansAsync.when(
              data: (plans) {
                final currentSlug =
                    currentAsync.asData?.value.plan ?? UserPlans.free;
                return Column(
                  children: [
                    for (final plan in plans)
                      Padding(
                        padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                        child: _PlanCard(
                          plan: plan,
                          currentSlug: currentSlug,
                          upgrading: _upgradingSlug == plan.slug,
                          validatingCoupon: _validatingSlug == plan.slug,
                          couponController: _couponControllerFor(plan.slug),
                          appliedCoupon: _appliedCoupons[plan.slug],
                          storePriceLabel: _isIos &&
                                  plan.appleProductId != null
                              ? _appleProducts[plan.appleProductId!]?.price
                              : null,
                          hideCoupons: _isIos,
                          onApplyCoupon: () => _applyCoupon(plan.slug),
                          onUpgrade: () => _upgrade(plan.slug),
                        ),
                      ),
                  ],
                );
              },
              loading: () => const Padding(
                padding: EdgeInsets.symmetric(vertical: 48),
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (e, _) => SurfaceCard(
                child: Text(
                  e is ApiException ? e.message : 'Could not load plans',
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ),
            ),
            if (_isIos) ...[
              const SizedBox(height: AppSpacing.md),
              Text(
                'Silver and Gold are auto-renewable monthly subscriptions. '
                'Payment is charged to your Apple ID at confirmation of purchase. '
                'Your subscription renews automatically unless it is canceled at '
                'least 24 hours before the end of the current period. Manage or '
                'cancel anytime in your device Settings > Apple ID > Subscriptions.',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: AppColors.textMuted,
                    ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _CurrentPlanCard extends StatelessWidget {
  const _CurrentPlanCard({required this.current});

  final CurrentPlan current;

  @override
  Widget build(BuildContext context) {
    final usage = current.usage;
    final renews = current.planExpiresAt != null && current.plan != UserPlans.free
        ? DateFormat.yMMMd().format(current.planExpiresAt!.toLocal())
        : null;

    return SurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              StatusChip(
                label: UserPlans.displayName(current.plan),
                color: AppColors.violet,
                background: AppColors.violet.withValues(alpha: 0.12),
              ),
              const Spacer(),
              Text(
                current.definition.priceLabel.isNotEmpty
                    ? current.definition.priceLabel
                    : 'Current plan',
                style: Theme.of(context).textTheme.titleSmall,
              ),
            ],
          ),
          if (renews != null) ...[
            const SizedBox(height: AppSpacing.xs),
            Text(
              'Renews $renews',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppColors.textMuted,
                  ),
            ),
          ],
          const SizedBox(height: AppSpacing.sm),
          _UsageRow(
            label: 'Workspaces',
            value:
                '${usage.workspaces.used} / ${UserPlans.limitLabel(usage.workspaces.limit)}',
          ),
          _UsageRow(
            label: 'Members',
            value:
                '${usage.members.used} / ${UserPlans.limitLabel(usage.members.limit)}',
          ),
          _UsageRow(
            label: 'Storage',
            value:
                '${UserPlans.formatBytes(usage.storage.usedBytes)} / ${UserPlans.formatBytes(usage.storage.limitBytes)}',
          ),
        ],
      ),
    );
  }
}

class _UsageRow extends StatelessWidget {
  const _UsageRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 6),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppColors.textMuted,
                  ),
            ),
          ),
          Text(value, style: Theme.of(context).textTheme.bodySmall),
        ],
      ),
    );
  }
}

class _PlanCard extends StatelessWidget {
  const _PlanCard({
    required this.plan,
    required this.currentSlug,
    required this.upgrading,
    required this.validatingCoupon,
    required this.couponController,
    required this.appliedCoupon,
    required this.onApplyCoupon,
    required this.onUpgrade,
    this.storePriceLabel,
    this.hideCoupons = false,
  });

  final PlanListItem plan;
  final String currentSlug;
  final bool upgrading;
  final bool validatingCoupon;
  final TextEditingController couponController;
  final CouponValidation? appliedCoupon;
  final VoidCallback onApplyCoupon;
  final VoidCallback onUpgrade;
  final String? storePriceLabel;
  final bool hideCoupons;

  @override
  Widget build(BuildContext context) {
    final isCurrent = plan.slug == currentSlug;
    final canUpgrade = UserPlans.canUpgradeTo(currentSlug, plan.slug);
    final showCoupon =
        !hideCoupons && plan.allowCoupon && plan.slug != UserPlans.free && canUpgrade;
    final ctaEnabled = UserPlans.ctaEnabled(plan.slug, currentSlug);
    final ctaLabel = UserPlans.ctaLabel(plan.slug, currentSlug);
    final accent = switch (plan.slug) {
      UserPlans.gold => const Color(0xFFF59E0B),
      UserPlans.silver => const Color(0xFF64748B),
      _ => AppColors.violet,
    };

    return SurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                plan.slug == UserPlans.gold
                    ? Icons.star_rounded
                    : plan.slug == UserPlans.silver
                        ? Icons.workspace_premium_rounded
                        : Icons.auto_awesome_rounded,
                color: accent,
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Text(
                  plan.name,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                ),
              ),
              if (isCurrent)
                StatusChip(
                  label: 'Current',
                  color: AppColors.success,
                  background: AppColors.successSoft,
                ),
            ],
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            storePriceLabel ?? plan.priceLabel,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: accent,
                ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'Workspaces: ${UserPlans.limitLabel(plan.limits.maxWorkspaces)} · '
            'Members: ${UserPlans.limitLabel(plan.limits.maxMembersPerWorkspace)} · '
            'Storage: ${UserPlans.formatBytes(plan.limits.storageBytes)}',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: AppColors.textMuted,
                ),
          ),
          if (plan.benefits.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.sm),
            for (final benefit in plan.benefits.take(5))
              Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.check_circle_rounded, size: 16, color: accent),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        benefit,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ),
                  ],
                ),
              ),
          ],
          if (showCoupon) ...[
            const SizedBox(height: AppSpacing.sm),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: couponController,
                    decoration: const InputDecoration(
                      labelText: 'Coupon code',
                      isDense: true,
                    ),
                    textCapitalization: TextCapitalization.characters,
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                TextButton(
                  onPressed: validatingCoupon ? null : onApplyCoupon,
                  child: validatingCoupon
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Apply'),
                ),
              ],
            ),
            if (appliedCoupon?.valid == true)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Text(
                  'Coupon applied: ₹${appliedCoupon!.finalAmountInr} '
                  '(saved ₹${appliedCoupon!.savingsInr})',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppColors.success,
                        fontWeight: FontWeight.w600,
                      ),
                ),
              ),
          ],
          const SizedBox(height: AppSpacing.sm),
          PrimaryButton(
            label: ctaLabel,
            loading: upgrading,
            onPressed: ctaEnabled && !upgrading ? onUpgrade : null,
          ),
        ],
      ),
    );
  }
}
