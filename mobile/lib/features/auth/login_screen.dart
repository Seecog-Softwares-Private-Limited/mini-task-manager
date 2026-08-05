import 'package:flutter/material.dart';
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

  bool _obscurePassword = true;
  bool _loading = false;
  String? _error;

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
    super.dispose();
  }

  Future<void> _submit() async {
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
        if (after != before && mounted) {
          try {
            await ref.read(sessionControllerProvider.notifier).login(
                  email: _emailController.text,
                  password: _passwordController.text,
                );
            if (!mounted) return;
            final status = ref.read(sessionControllerProvider).status;
            if (status == SessionStatus.authenticated) {
              context.go(AppRoutes.home);
              return;
            }
            if (status == SessionStatus.needsWorkspace) {
              context.go(AppRoutes.workspaces);
              return;
            }
          } on ApiException catch (retryError) {
            setState(() => _error = retryError.message);
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
                        ),                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          'OpsPick',
                          style: Theme.of(context).textTheme.displaySmall,
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        Text(
                          'Sign in to your workspace and manage projects on the go.',
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),
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
                          autofillHints: const [AutofillHints.password],
                          decoration: InputDecoration(
                            labelText: 'Password',
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
                    label: 'Sign in',
                    loading: _loading,
                    onPressed: _submit,
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  TextButton(
                    onPressed: _loading ? null : () => context.push(AppRoutes.signup),
                    child: const Text('New here? Create an account'),
                  ),
                  TextButton(
                    onPressed: _loading ? null : () => context.push(AppRoutes.forgotPassword),
                    child: const Text('Forgot password?'),
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
