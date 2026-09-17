import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_exception.dart';
import '../../core/branding/opspick_logo.dart';
import '../../core/config/api_base_url_controller.dart';
import '../../core/config/api_reachability_probe.dart';
import '../../core/preferences/app_preferences.dart';
import '../../core/router/app_router.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../shared/widgets/app_widgets.dart';
import 'session_controller.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _phoneController = TextEditingController();
  final _otpController = TextEditingController();

  bool _obscurePassword = true;
  bool _loading = false;
  String? _error;
  bool _usePhone = false;
  bool _otpSent = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await _reprobeApiUrl();
    });
  }

  Future<void> _reprobeApiUrl() async {
    final prefs = ref.read(sharedPreferencesProvider);
    final switched = await ApiReachabilityProbe.ensureReachable(prefs);
    if (switched != null) {
      ref.invalidate(apiBaseUrlProvider);
    }
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _phoneController.dispose();
    _otpController.dispose();
    super.dispose();
  }

  String get _e164Phone {
    final digits = _phoneController.text.replaceAll(RegExp(r'\D'), '');
    if (digits.length == 10) return '+91$digits';
    if (digits.startsWith('91') && digits.length == 12) return '+$digits';
    if (_phoneController.text.trim().startsWith('+')) {
      return '+$digits';
    }
    return digits.length >= 10 ? '+$digits' : '';
  }

  Future<void> _submitEmail() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      await ref.read(sessionControllerProvider.notifier).login(
            email: _emailController.text,
            password: _passwordController.text,
          );
      if (!mounted) return;

      final status = ref.read(sessionControllerProvider).status;
      if (status == SessionStatus.authenticated) {
        context.go(AppRoutes.home);
      } else if (status == SessionStatus.needsWorkspace) {
        context.go(AppRoutes.workspaces);
      }
    } on ApiException catch (error) {
      if (error.isNetwork) {
        final before = ref.read(apiBaseUrlProvider);
        await _reprobeApiUrl();
        final after = ref.read(apiBaseUrlProvider);
        if (after != before) {
          try {
            await ref.read(sessionControllerProvider.notifier).login(
                  email: _emailController.text,
                  password: _passwordController.text,
                );
            if (!mounted) return;
            final status = ref.read(sessionControllerProvider).status;
            if (status == SessionStatus.authenticated) {
              context.go(AppRoutes.home);
            } else if (status == SessionStatus.needsWorkspace) {
              context.go(AppRoutes.workspaces);
            }
            return;
          } catch (retryError) {
            setState(() => _error = 'Unable to sign in. Please try again.');
            debugPrint('Login retry failed: $retryError');
            return;
          }
        }
      }
      setState(() => _error = error.message);
    } on FormatException catch (error) {
      setState(() => _error = 'Unexpected server response. ${error.message}');
    } catch (error) {
      setState(() => _error = 'Unable to sign in. Please try again.');
      debugPrint('Login failed: $error');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _sendOtp() async {
    final phone = _e164Phone;
    if (phone.length < 12) {
      setState(() => _error = 'Enter a valid 10-digit mobile number');
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      await ref.read(authRepositoryProvider).sendOtp(phone);
      if (!mounted) return;
      setState(() => _otpSent = true);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Verification code sent')),
      );
    } on ApiException catch (error) {
      setState(() => _error = error.message);
    } catch (error) {
      setState(() => _error = 'Unable to send code. Please try again.');
      debugPrint('Send OTP failed: $error');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _verifyOtp() async {
    final phone = _e164Phone;
    final code = _otpController.text.trim();
    if (!RegExp(r'^\d{6}$').hasMatch(code)) {
      setState(() => _error = 'Enter the 6-digit code');
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      await ref.read(sessionControllerProvider.notifier).loginWithOtp(
            phone: phone,
            code: code,
          );
      if (!mounted) return;
      final status = ref.read(sessionControllerProvider).status;
      if (status == SessionStatus.authenticated) {
        context.go(AppRoutes.home);
      } else if (status == SessionStatus.needsWorkspace) {
        context.go(AppRoutes.workspaces);
      }
    } on ApiException catch (error) {
      setState(() => _error = error.message);
    } catch (error) {
      setState(() => _error = 'Unable to verify. Please try again.');
      debugPrint('Verify OTP failed: $error');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Container(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFFEEF2FF), Color(0xFFF5F3FF)],
                      ),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const OpsPickLogo(size: 52),
                            const SizedBox(width: AppSpacing.sm),
                            Flexible(
                              child: Align(
                                alignment: Alignment.centerLeft,
                                child: StatusChip(
                                  label: 'Mobile',
                                  color: AppColors.violet,
                                  background: AppColors.violet.withValues(alpha: 0.1),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          'OpsPick',
                          style: Theme.of(context).textTheme.displaySmall,
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        Text(
                          'Sign in with email or phone OTP.',
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  SegmentedButton<bool>(
                    segments: const [
                      ButtonSegment(value: false, label: Text('Email'), icon: Icon(Icons.mail_outline)),
                      ButtonSegment(value: true, label: Text('Phone OTP'), icon: Icon(Icons.smartphone)),
                    ],
                    selected: {_usePhone},
                    onSelectionChanged: _loading
                        ? null
                        : (value) {
                            setState(() {
                              _usePhone = value.first;
                              _error = null;
                              _otpSent = false;
                              _otpController.clear();
                            });
                          },
                  ),
                  const SizedBox(height: AppSpacing.md),
                  if (!_usePhone)
                    Form(
                      key: _formKey,
                      child: Column(
                        children: [
                          TextFormField(
                            controller: _emailController,
                            keyboardType: TextInputType.emailAddress,
                            autofillHints: const [AutofillHints.username, AutofillHints.email],
                            decoration: const InputDecoration(
                              labelText: 'Email',
                              prefixIcon: Icon(Icons.mail_outline),
                            ),
                            validator: (value) {
                              if (value == null || value.trim().isEmpty) {
                                return 'Email is required';
                              }
                              if (!value.contains('@')) return 'Enter a valid email';
                              return null;
                            },
                          ),
                          const SizedBox(height: AppSpacing.md),
                          TextFormField(
                            controller: _passwordController,
                            obscureText: _obscurePassword,
                            autofillHints: const [AutofillHints.password],
                            decoration: InputDecoration(
                              labelText: 'Password',
                              prefixIcon: const Icon(Icons.lock_outline),
                              suffixIcon: IconButton(
                                onPressed: () =>
                                    setState(() => _obscurePassword = !_obscurePassword),
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
                              return null;
                            },
                          ),
                          Align(
                            alignment: Alignment.centerRight,
                            child: TextButton(
                              onPressed:
                                  _loading ? null : () => context.push(AppRoutes.forgotPassword),
                              child: const Text('Forgot password?'),
                            ),
                          ),
                          if (_error != null) ...[
                            const SizedBox(height: AppSpacing.sm),
                            Text(_error!, style: const TextStyle(color: AppColors.danger)),
                          ],
                          const SizedBox(height: AppSpacing.md),
                          SizedBox(
                            width: double.infinity,
                            child: FilledButton(
                              onPressed: _loading ? null : _submitEmail,
                              child: Text(_loading ? 'Signing in…' : 'Sign in'),
                            ),
                          ),
                        ],
                      ),
                    )
                  else
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        if (!_otpSent) ...[
                          TextFormField(
                            controller: _phoneController,
                            keyboardType: TextInputType.phone,
                            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                            decoration: const InputDecoration(
                              labelText: 'Mobile number',
                              prefixText: '+91 ',
                              prefixIcon: Icon(Icons.smartphone_outlined),
                              helperText: 'New numbers create an account; existing numbers sign you in.',
                            ),
                          ),
                          if (_error != null) ...[
                            const SizedBox(height: AppSpacing.sm),
                            Text(_error!, style: const TextStyle(color: AppColors.danger)),
                          ],
                          const SizedBox(height: AppSpacing.md),
                          FilledButton(
                            onPressed: _loading ? null : _sendOtp,
                            child: Text(_loading ? 'Sending…' : 'Send verification code'),
                          ),
                        ] else ...[
                          Text(
                            'Code sent to $_e164Phone',
                            style: Theme.of(context).textTheme.bodyMedium,
                          ),
                          const SizedBox(height: AppSpacing.md),
                          TextFormField(
                            controller: _otpController,
                            keyboardType: TextInputType.number,
                            maxLength: 6,
                            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                            decoration: const InputDecoration(
                              labelText: 'Verification code',
                              counterText: '',
                            ),
                          ),
                          if (_error != null) ...[
                            const SizedBox(height: AppSpacing.sm),
                            Text(_error!, style: const TextStyle(color: AppColors.danger)),
                          ],
                          const SizedBox(height: AppSpacing.md),
                          FilledButton(
                            onPressed: _loading ? null : _verifyOtp,
                            child: Text(_loading ? 'Verifying…' : 'Verify & sign in'),
                          ),
                          TextButton(
                            onPressed: _loading
                                ? null
                                : () => setState(() {
                                      _otpSent = false;
                                      _otpController.clear();
                                      _error = null;
                                    }),
                            child: const Text('Use a different number'),
                          ),
                        ],
                      ],
                    ),
                  const SizedBox(height: AppSpacing.md),
                  TextButton(
                    onPressed: _loading ? null : () => context.push(AppRoutes.signup),
                    child: const Text("Don't have an account? Sign up"),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
