import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_exception.dart';
import '../../core/branding/opspick_logo.dart';
import '../../core/router/app_router.dart';
import '../../core/theme/app_spacing.dart';
import '../../shared/widgets/app_widgets.dart';
import 'session_controller.dart';

class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  ConsumerState<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  final _emailController = TextEditingController();
  bool _loading = false;
  bool _sent = false;
  String? _error;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final email = _emailController.text.trim();
    if (email.isEmpty || !email.contains('@')) {
      setState(() => _error = 'Enter a valid email');
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      await ref.read(authRepositoryProvider).forgotPassword(email);
      setState(() => _sent = true);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Unable to send reset email.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Forgot password')),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: _sent ? _buildSent(context) : _buildForm(context),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSent(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'If an account exists for that email, reset instructions were sent.',
          style: Theme.of(context).textTheme.bodyLarge,
        ),
        const SizedBox(height: AppSpacing.sm),
        Text(
          'Open the link in the email, or paste the link/token here to set a new password in the app.',
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        const SizedBox(height: AppSpacing.lg),
        PrimaryButton(
          label: 'Enter reset link',
          onPressed: () => context.push(AppRoutes.resetPassword),
        ),
        const SizedBox(height: AppSpacing.sm),
        SecondaryButton(
          label: 'Back to sign in',
          onPressed: () => context.go(AppRoutes.login),
        ),
      ],
    );
  }

  Widget _buildForm(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const OpsPickLogo(size: 52),
        const SizedBox(height: AppSpacing.md),
        Text(
          'Enter your email and we will send reset instructions.',
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        const SizedBox(height: AppSpacing.md),
        TextField(
          controller: _emailController,
          keyboardType: TextInputType.emailAddress,
          autofillHints: const [AutofillHints.email],
          textInputAction: TextInputAction.done,
          decoration: const InputDecoration(
            labelText: 'Email',
            hintText: 'you@company.com',
          ),
          onSubmitted: (_) => _submit(),
        ),
        if (_error != null) ...[
          const SizedBox(height: AppSpacing.sm),
          Text(
            _error!,
            style: TextStyle(color: Theme.of(context).colorScheme.error),
          ),
        ],
        const SizedBox(height: AppSpacing.md),
        PrimaryButton(
          label: 'Send reset link',
          loading: _loading,
          onPressed: _loading ? null : _submit,
        ),
        const SizedBox(height: AppSpacing.sm),
        TextButton(
          onPressed: _loading
              ? null
              : () => context.push(AppRoutes.resetPassword),
          child: const Text('Already have a reset link?'),
        ),
      ],
    );
  }
}
