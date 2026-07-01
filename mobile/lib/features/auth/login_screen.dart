import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_connection_service.dart';
import '../../core/api/api_exception.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';
import '../../core/config/api_base_url_controller.dart';
import '../../core/config/app_config.dart';
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
  final _serverUrlController = TextEditingController();

  bool _obscurePassword = true;
  bool _loading = false;
  bool _showServerSettings = false;
  bool _testingConnection = false;
  String? _error;
  String? _serverStatus;
  bool _serverStatusOk = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _syncServerField());
  }

  void _syncServerField() {
    final apiUrl = ref.read(apiBaseUrlProvider);
    _serverUrlController.text = _displayServerInput(apiUrl);
  }

  String _displayServerInput(String apiBaseUrl) {
    if (apiBaseUrl.endsWith('/api/v1')) {
      return apiBaseUrl.substring(0, apiBaseUrl.length - '/api/v1'.length);
    }
    return apiBaseUrl;
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _serverUrlController.dispose();
    super.dispose();
  }

  Future<void> _saveServerUrl() async {
    final raw = _serverUrlController.text.trim();
    if (raw.isEmpty) return;
    await ref.read(apiBaseUrlProvider.notifier).setBaseUrl(raw);
    if (!mounted) return;
    setState(() {
      _serverStatus = 'Saved: ${ref.read(apiBaseUrlProvider)}';
      _serverStatusOk = true;
      _error = null;
    });
  }

  Future<void> _testConnection() async {
    setState(() {
      _testingConnection = true;
      _serverStatus = null;
    });
    final candidate = AppConfig.normalizeBaseUrl(_serverUrlController.text.trim());
    final result = await ApiConnectionService.test(candidate);
    if (!mounted) return;
    setState(() {
      _testingConnection = false;
      _serverStatus = result.message;
      _serverStatusOk = result.ok;
    });
    if (result.ok) {
      await ref.read(apiBaseUrlProvider.notifier).setBaseUrl(candidate);
    }
  }

  Future<void> _useProductionServer() async {
    _serverUrlController.text = 'http://3.110.214.243:3000';
    await _saveServerUrl();
    await _testConnection();
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
    } on ApiException catch (error) {
      setState(() => _error = error.message);
    } catch (_) {
      setState(() => _error = 'Unable to sign in. Please try again.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final config = ref.watch(appConfigProvider);
    ref.listen(apiBaseUrlProvider, (previous, next) {
      if (previous != next) {
        _serverUrlController.text = _displayServerInput(next);
      }
    });

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
                        StatusChip(
                          label: 'Mobile',
                          color: AppColors.violet,
                          background: AppColors.violet.withValues(alpha: 0.1),
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          'Mini Task Manager',
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
                    onPressed: _loading ? null : () => context.push(AppRoutes.forgotPassword),
                    child: const Text('Forgot password?'),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  OutlinedButton.icon(
                    onPressed: _loading
                        ? null
                        : () => setState(() => _showServerSettings = !_showServerSettings),
                    icon: Icon(_showServerSettings
                        ? Icons.expand_less_rounded
                        : Icons.settings_ethernet_rounded),
                    label: Text(_showServerSettings ? 'Hide server settings' : 'Server settings'),
                  ),
                  if (_showServerSettings) ...[
                    const SizedBox(height: AppSpacing.sm),
                    TextFormField(
                      controller: _serverUrlController,
                      decoration: const InputDecoration(
                        labelText: 'Server URL',
                        hintText: 'http://3.110.214.243:3000',
                        helperText: 'Use port 3000 (web app). Port 3007 is not reachable on mobile.',
                      ),
                      keyboardType: TextInputType.url,
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: _testingConnection || _loading ? null : _testConnection,
                            child: Text(_testingConnection ? 'Testing...' : 'Test connection'),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        Expanded(
                          child: OutlinedButton(
                            onPressed: _loading ? null : _saveServerUrl,
                            child: const Text('Save'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: TextButton(
                        onPressed: _loading || _testingConnection ? null : _useProductionServer,
                        child: const Text('Use production server'),
                      ),
                    ),
                    if (_serverStatus != null) ...[
                      const SizedBox(height: AppSpacing.xs),
                      Text(
                        _serverStatus!,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: _serverStatusOk ? AppColors.success : AppColors.danger,
                            ),
                      ),
                    ],
                  ],
                  const SizedBox(height: AppSpacing.lg),
                  Text(
                    'API: ${config.apiBaseUrl}',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.labelMedium,
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
