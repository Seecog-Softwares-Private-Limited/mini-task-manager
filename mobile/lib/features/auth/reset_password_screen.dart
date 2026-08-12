import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_exception.dart';
import '../../core/branding/opspick_logo.dart';
import '../../core/router/app_router.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../shared/widgets/app_widgets.dart';
import 'session_controller.dart';

/// Pulls a reset token from a bare token or a full reset URL.
String? extractPasswordResetToken(String raw) {
  final text = raw.trim();
  if (text.isEmpty) return null;

  final uri = Uri.tryParse(text);
  if (uri != null && uri.hasScheme) {
    final fromQuery = uri.queryParameters['token']?.trim();
    if (fromQuery != null && fromQuery.isNotEmpty) return fromQuery;
  }

  // Handle pasted query fragments like "token=abc" or "?token=abc".
  final match = RegExp(r'(?:\?|&|^)token=([^&\s#]+)', caseSensitive: false)
      .firstMatch(text);
  if (match != null) {
    final value = Uri.decodeComponent(match.group(1) ?? '').trim();
    if (value.isNotEmpty) return value;
  }

  return text;
}

class ResetPasswordScreen extends ConsumerStatefulWidget {
  const ResetPasswordScreen({super.key, this.initialToken});

  final String? initialToken;

  @override
  ConsumerState<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends ConsumerState<ResetPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _tokenController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();

  bool _obscurePassword = true;
  bool _obscureConfirm = true;
  bool _loading = false;
  bool _success = false;
  String? _error;

  bool get _hasInitialToken =>
      widget.initialToken != null && widget.initialToken!.trim().isNotEmpty;

  @override
  void initState() {
    super.initState();
    final token = widget.initialToken?.trim();
    if (token != null && token.isNotEmpty) {
      _tokenController.text = token;
    }
  }

  @override
  void dispose() {
    _tokenController.dispose();
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final token = extractPasswordResetToken(_tokenController.text);
    if (token == null || token.isEmpty) {
      setState(() => _error = 'Paste the reset link or token from your email.');
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      await ref.read(authRepositoryProvider).resetPassword(
            token: token,
            password: _passwordController.text,
          );
      if (!mounted) return;
      setState(() => _success = true);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Unable to reset password. Please try again.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Reset password')),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: _success ? _buildSuccess(context) : _buildForm(context),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSuccess(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Icon(Icons.check_circle_outline, size: 56, color: AppColors.success),
        const SizedBox(height: AppSpacing.md),
        Text(
          'Password reset',
          style: Theme.of(context).textTheme.headlineSmall,
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: AppSpacing.sm),
        Text(
          'Your password has been updated. You can now sign in with your new password.',
          style: Theme.of(context).textTheme.bodyMedium,
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: AppSpacing.lg),
        PrimaryButton(
          label: 'Sign in',
          onPressed: () => context.go(AppRoutes.login),
        ),
      ],
    );
  }

  Widget _buildForm(BuildContext context) {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const OpsPickLogo(size: 52),
          const SizedBox(height: AppSpacing.md),
          Text(
            _hasInitialToken
                ? 'Choose a new password for your account.'
                : 'Paste the reset link from your email, then choose a new password.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: AppSpacing.md),
          if (!_hasInitialToken) ...[
            TextFormField(
              controller: _tokenController,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                labelText: 'Reset link or token',
                hintText: 'Paste from email',
              ),
              validator: (value) {
                final token = extractPasswordResetToken(value ?? '');
                if (token == null || token.isEmpty) {
                  return 'Paste the reset link or token from your email';
                }
                return null;
              },
            ),
            const SizedBox(height: AppSpacing.sm),
          ],
          TextFormField(
            controller: _passwordController,
            obscureText: _obscurePassword,
            autofillHints: const [AutofillHints.newPassword],
            textInputAction: TextInputAction.next,
            decoration: InputDecoration(
              labelText: 'New password',
              hintText: 'At least 8 characters',
              suffixIcon: IconButton(
                onPressed: () {
                  setState(() => _obscurePassword = !_obscurePassword);
                },
                icon: Icon(
                  _obscurePassword
                      ? Icons.visibility_outlined
                      : Icons.visibility_off_outlined,
                ),
              ),
            ),
            validator: (value) {
              if (value == null || value.isEmpty) {
                return 'Password is required';
              }
              if (value.length < 8) {
                return 'Password must be at least 8 characters';
              }
              return null;
            },
          ),
          const SizedBox(height: AppSpacing.sm),
          TextFormField(
            controller: _confirmController,
            obscureText: _obscureConfirm,
            autofillHints: const [AutofillHints.newPassword],
            textInputAction: TextInputAction.done,
            decoration: InputDecoration(
              labelText: 'Confirm password',
              suffixIcon: IconButton(
                onPressed: () {
                  setState(() => _obscureConfirm = !_obscureConfirm);
                },
                icon: Icon(
                  _obscureConfirm
                      ? Icons.visibility_outlined
                      : Icons.visibility_off_outlined,
                ),
              ),
            ),
            validator: (value) {
              if (value == null || value.isEmpty) {
                return 'Please confirm your password';
              }
              if (value != _passwordController.text) {
                return 'Passwords do not match';
              }
              return null;
            },
            onFieldSubmitted: (_) => _submit(),
          ),
          if (_error != null) ...[
            const SizedBox(height: AppSpacing.sm),
            Text(
              _error!,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppColors.danger,
                  ),
            ),
          ],
          const SizedBox(height: AppSpacing.md),
          PrimaryButton(
            label: 'Reset password',
            loading: _loading,
            onPressed: _loading ? null : _submit,
          ),
          const SizedBox(height: AppSpacing.sm),
          TextButton(
            onPressed: _loading
                ? null
                : () => context.go(AppRoutes.forgotPassword),
            child: const Text('Request a new reset link'),
          ),
          TextButton(
            onPressed: _loading ? null : () => context.go(AppRoutes.login),
            child: const Text('Back to sign in'),
          ),
        ],
      ),
    );
  }
}
