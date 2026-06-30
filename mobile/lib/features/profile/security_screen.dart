import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/theme/app_spacing.dart';
import '../../shared/widgets/app_widgets.dart';
import '../auth/session_controller.dart';

class SecurityScreen extends ConsumerStatefulWidget {
  const SecurityScreen({super.key});

  @override
  ConsumerState<SecurityScreen> createState() => _SecurityScreenState();
}

class _SecurityScreenState extends ConsumerState<SecurityScreen> {
  final _currentController = TextEditingController();
  final _newController = TextEditingController();
  final _confirmController = TextEditingController();

  bool _hasPassword = true;
  bool _loadingStatus = true;
  bool _saving = false;
  bool _obscureCurrent = true;
  bool _obscureNew = true;
  bool _obscureConfirm = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    Future.microtask(_loadStatus);
  }

  @override
  void dispose() {
    _currentController.dispose();
    _newController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  Future<void> _loadStatus() async {
    try {
      final hasPassword = await ref.read(authRepositoryProvider).fetchHasPassword();
      if (mounted) {
        setState(() {
          _hasPassword = hasPassword;
          _loadingStatus = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _hasPassword = true;
          _loadingStatus = false;
        });
      }
    }
  }

  Future<void> _submit() async {
    final current = _currentController.text;
    final newPassword = _newController.text;
    final confirm = _confirmController.text;

    if (_hasPassword && current.isEmpty) {
      setState(() => _error = 'Enter your current password');
      return;
    }
    if (newPassword.length < 8) {
      setState(() => _error = 'Password must be at least 8 characters');
      return;
    }
    if (newPassword != confirm) {
      setState(() => _error = 'Passwords do not match');
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });

    try {
      final message = await ref.read(authRepositoryProvider).changePassword(
            currentPassword: _hasPassword ? current : null,
            newPassword: newPassword,
          );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
        _currentController.clear();
        _newController.clear();
        _confirmController.clear();
        setState(() => _hasPassword = true);
      }
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Security')),
      body: _loadingStatus
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(AppSpacing.md),
              children: [
                SurfaceCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Change password', style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: AppSpacing.sm),
                      Text(
                        _hasPassword
                            ? 'Update your account password. You will stay signed in on this device.'
                            : 'Set a password to sign in with email and password.',
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                      const SizedBox(height: AppSpacing.md),
                      if (_hasPassword) ...[
                        TextField(
                          controller: _currentController,
                          obscureText: _obscureCurrent,
                          decoration: InputDecoration(
                            labelText: 'Current password',
                            suffixIcon: IconButton(
                              onPressed: () => setState(() => _obscureCurrent = !_obscureCurrent),
                              icon: Icon(_obscureCurrent ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                            ),
                          ),
                        ),
                        const SizedBox(height: AppSpacing.sm),
                      ],
                      TextField(
                        controller: _newController,
                        obscureText: _obscureNew,
                        decoration: InputDecoration(
                          labelText: _hasPassword ? 'New password' : 'Password',
                          suffixIcon: IconButton(
                            onPressed: () => setState(() => _obscureNew = !_obscureNew),
                            icon: Icon(_obscureNew ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                          ),
                        ),
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      TextField(
                        controller: _confirmController,
                        obscureText: _obscureConfirm,
                        decoration: InputDecoration(
                          labelText: 'Confirm password',
                          suffixIcon: IconButton(
                            onPressed: () => setState(() => _obscureConfirm = !_obscureConfirm),
                            icon: Icon(_obscureConfirm ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                          ),
                        ),
                      ),
                      if (_error != null) ...[
                        const SizedBox(height: AppSpacing.sm),
                        Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                      ],
                      const SizedBox(height: AppSpacing.md),
                      PrimaryButton(
                        label: _hasPassword ? 'Change password' : 'Set password',
                        loading: _saving,
                        onPressed: _saving ? null : _submit,
                      ),
                    ],
                  ),
                ),
              ],
            ),
    );
  }
}
