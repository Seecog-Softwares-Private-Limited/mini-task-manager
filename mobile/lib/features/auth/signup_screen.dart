import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_exception.dart';
import '../../core/router/app_router.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../shared/widgets/app_widgets.dart';
import 'session_controller.dart';

class SignupScreen extends ConsumerStatefulWidget {
  const SignupScreen({super.key});

  @override
  ConsumerState<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends ConsumerState<SignupScreen> {
  final _formKey = GlobalKey<FormState>();
  final _fullNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _codeController = TextEditingController();

  bool _obscurePassword = true;
  bool _obscureConfirm = true;
  bool _loading = false;
  bool _awaitingVerification = false;
  bool _resending = false;
  String? _error;
  String? _info;
  String? _signedUpEmail;
  String? _devCode;

  @override
  void dispose() {
    _fullNameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _goAfterAuth() async {
    if (!mounted) return;
    final status = ref.read(sessionControllerProvider).status;
    if (status == SessionStatus.authenticated) {
      context.go(AppRoutes.home);
    } else if (status == SessionStatus.needsWorkspace) {
      context.go(AppRoutes.workspaces);
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _loading = true;
      _error = null;
      _info = null;
    });

    try {
      final result = await ref.read(authRepositoryProvider).signup(
            email: _emailController.text,
            fullName: _fullNameController.text,
            password: _passwordController.text,
          );

      if (result.login != null) {
        await ref
            .read(sessionControllerProvider.notifier)
            .completeAuthenticatedSession(result.login!);
        await _goAfterAuth();
        return;
      }

      if (!mounted) return;
      setState(() {
        _awaitingVerification = true;
        _signedUpEmail = _emailController.text.trim().toLowerCase();
        _info = result.message;
        _devCode = result.devVerificationCode;
      });
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (e) {
      setState(() => _error = 'Unable to create account. Please try again.');
      debugPrint('Signup failed: $e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _verifyCode() async {
    final code = _codeController.text.trim();
    if (code.isEmpty) {
      setState(() => _error = 'Enter the verification code from your email');
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final login = await ref.read(authRepositoryProvider).verifyEmail(code);
      await ref
          .read(sessionControllerProvider.notifier)
          .completeAuthenticatedSession(login);
      await _goAfterAuth();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (e) {
      setState(() => _error = 'Unable to verify email. Please try again.');
      debugPrint('Verify email failed: $e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _resend() async {
    final email = _signedUpEmail;
    if (email == null || email.isEmpty) return;

    setState(() {
      _resending = true;
      _error = null;
      _info = null;
    });

    try {
      final message =
          await ref.read(authRepositoryProvider).resendVerificationEmail(email);
      if (!mounted) return;
      setState(() => _info = message);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Unable to resend verification email.');
    } finally {
      if (mounted) setState(() => _resending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Create account'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: _loading ? null : () => context.go(AppRoutes.login),
        ),
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: _awaitingVerification
                  ? _buildVerificationStep(context)
                  : _buildSignupForm(context),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSignupForm(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Join OpsPick',
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: AppSpacing.xs),
        Text(
          'Create an account to start managing projects from your phone.',
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        const SizedBox(height: AppSpacing.lg),
        Form(
          key: _formKey,
          child: Column(
            children: [
              TextFormField(
                controller: _fullNameController,
                textCapitalization: TextCapitalization.words,
                autofillHints: const [AutofillHints.name],
                decoration: const InputDecoration(
                  labelText: 'Full name',
                  hintText: 'Jane Doe',
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Name is required';
                  }
                  return null;
                },
              ),
              const SizedBox(height: AppSpacing.sm),
              TextFormField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                autofillHints: const [AutofillHints.email],
                decoration: const InputDecoration(
                  labelText: 'Email',
                  hintText: 'you@company.com',
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Email is required';
                  }
                  if (!value.contains('@')) return 'Enter a valid email';
                  return null;
                },
              ),
              const SizedBox(height: AppSpacing.sm),
              TextFormField(
                controller: _passwordController,
                obscureText: _obscurePassword,
                autofillHints: const [AutofillHints.newPassword],
                decoration: InputDecoration(
                  labelText: 'Password',
                  helperText: 'At least 8 characters',
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
                controller: _confirmPasswordController,
                obscureText: _obscureConfirm,
                autofillHints: const [AutofillHints.newPassword],
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
                  if (value != _passwordController.text) {
                    return 'Passwords do not match';
                  }
                  return null;
                },
                onFieldSubmitted: (_) => _submit(),
              ),
            ],
          ),
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
          label: 'Create account',
          loading: _loading,
          onPressed: _submit,
        ),
        const SizedBox(height: AppSpacing.sm),
        TextButton(
          onPressed: _loading ? null : () => context.go(AppRoutes.login),
          child: const Text('Already have an account? Sign in'),
        ),
      ],
    );
  }

  Widget _buildVerificationStep(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Icon(Icons.mark_email_read_outlined, size: 48, color: AppColors.primary),
        const SizedBox(height: AppSpacing.md),
        Text(
          'Check your email',
          style: Theme.of(context).textTheme.headlineSmall,
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: AppSpacing.sm),
        Text(
          _info ??
              'We sent a verification link to ${_signedUpEmail ?? 'your email'}. '
                  'You can also enter the 6-digit code below.',
          style: Theme.of(context).textTheme.bodyMedium,
          textAlign: TextAlign.center,
        ),
        if (_devCode != null) ...[
          const SizedBox(height: AppSpacing.sm),
          Text(
            'Dev code: $_devCode',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.labelLarge?.copyWith(
                  color: AppColors.violet,
                ),
          ),
        ],
        const SizedBox(height: AppSpacing.lg),
        TextField(
          controller: _codeController,
          keyboardType: TextInputType.number,
          textInputAction: TextInputAction.done,
          decoration: const InputDecoration(
            labelText: 'Verification code',
            hintText: '6-digit code',
          ),
          onSubmitted: (_) => _verifyCode(),
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
          label: 'Verify & continue',
          loading: _loading,
          onPressed: _verifyCode,
        ),
        const SizedBox(height: AppSpacing.sm),
        TextButton(
          onPressed: _loading || _resending ? null : _resend,
          child: Text(_resending ? 'Sending…' : 'Resend verification email'),
        ),
        TextButton(
          onPressed: _loading ? null : () => context.go(AppRoutes.login),
          child: const Text('Back to sign in'),
        ),
      ],
    );
  }
}
