import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/api/api_exception.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/models/login_response.dart';
import '../../data/repositories/users_repository.dart';
import '../../shared/widgets/app_widgets.dart';
import '../../shared/widgets/user_avatar.dart';
import '../../shared/widgets/workspace_avatar.dart';
import '../auth/session_controller.dart';

class MyProfileScreen extends ConsumerStatefulWidget {
  const MyProfileScreen({super.key});

  @override
  ConsumerState<MyProfileScreen> createState() => _MyProfileScreenState();
}

class _MyProfileScreenState extends ConsumerState<MyProfileScreen> {
  final _nameController = TextEditingController();
  bool _loading = false;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final user = ref.read(sessionControllerProvider).user;
    _nameController.text = _editableName(user?.fullName, user?.email);
    Future.microtask(_refreshProfile);
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  String _editableName(String? fullName, String? email) {
    if (fullName != null && fullName.trim().isNotEmpty && fullName != email) {
      return fullName;
    }
    return '';
  }

  Future<void> _refreshProfile() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final user = await ref.read(usersRepositoryProvider).fetchCurrentUser();
      await ref.read(sessionControllerProvider.notifier).updateUser(user);
      _nameController.text = _editableName(user.fullName, user.email);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _pickAvatar() async {
    final picker = ImagePicker();
    final file = await picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 512,
      maxHeight: 512,
      imageQuality: 85,
    );
    if (file == null) return;

    setState(() => _saving = true);
    try {
      final bytes = await file.readAsBytes();
      final updated = await ref.read(usersRepositoryProvider).uploadAvatar(
            bytes: bytes,
            filename: file.name.isNotEmpty ? file.name : 'avatar.jpg',
            mimeType: file.mimeType,
          );
      await ref.read(sessionControllerProvider.notifier).updateUser(updated);
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _removeAvatar() async {
    setState(() => _saving = true);
    try {
      await ref.read(usersRepositoryProvider).deleteAvatar();
      final user = ref.read(sessionControllerProvider).user;
      if (user != null) {
        await ref.read(sessionControllerProvider.notifier).updateUser(
              AuthUser(
                id: user.id,
                email: user.email,
                fullName: user.fullName,
              ),
            );
      }
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _saveName() async {
    final name = _nameController.text.trim();
    if (name.isEmpty) return;

    setState(() => _saving = true);
    try {
      final updated = await ref.read(usersRepositoryProvider).updateProfile(fullName: name);
      await ref.read(sessionControllerProvider.notifier).updateUser(updated);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Profile updated')),
        );
      }
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(sessionControllerProvider);
    final user = session.user;
    final orgId = session.orgId;
    final organizations = session.organizations;

    final dirty = _nameController.text.trim().isNotEmpty &&
        _nameController.text.trim() != (user?.fullName ?? '');

    return Scaffold(
      appBar: AppBar(title: const Text('My Profile')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(AppSpacing.md),
              children: [
                SurfaceCard(
                  child: Row(
                    children: [
                      GestureDetector(
                        onTap: _saving ? null : _pickAvatar,
                        child: Stack(
                          children: [
                            UserAvatar(user: user, size: 72),
                            if (_saving)
                              const Positioned.fill(
                                child: ColoredBox(
                                  color: Color(0x66000000),
                                  child: Center(
                                    child: CircularProgressIndicator(strokeWidth: 2),
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              user == null
                                  ? '—'
                                  : (user.fullName.trim().isNotEmpty &&
                                          user.fullName != user.email
                                      ? user.fullName
                                      : user.email),
                              style: Theme.of(context).textTheme.titleLarge,
                            ),
                            const SizedBox(height: 4),
                            Text(user?.email ?? '—', style: Theme.of(context).textTheme.bodyMedium),
                            const SizedBox(height: AppSpacing.sm),
                            Text(
                              'Tap the avatar to upload or change your photo.',
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: AppColors.textMuted,
                                  ),
                            ),
                            if (user?.avatarUrl != null && user!.avatarUrl!.isNotEmpty)
                              TextButton(
                                onPressed: _saving ? null : _removeAvatar,
                                child: const Text('Remove photo'),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                SurfaceCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Personal information', style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: AppSpacing.md),
                      TextField(
                        controller: _nameController,
                        decoration: const InputDecoration(labelText: 'Full name'),
                        onChanged: (_) => setState(() {}),
                      ),
                      const SizedBox(height: AppSpacing.md),
                      TextField(
                        enabled: false,
                        decoration: InputDecoration(
                          labelText: 'Email',
                          hintText: user?.email ?? '—',
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xs),
                      Text(
                        'Email is used to sign in and cannot be changed here.',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: AppColors.textMuted,
                            ),
                      ),
                      if (_error != null) ...[
                        const SizedBox(height: AppSpacing.sm),
                        Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                      ],
                      const SizedBox(height: AppSpacing.md),
                      Align(
                        alignment: Alignment.centerRight,
                        child: PrimaryButton(
                          label: 'Save changes',
                          expand: false,
                          loading: _saving,
                          onPressed: !dirty || _saving ? null : _saveName,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                SurfaceCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Workspaces', style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: AppSpacing.sm),
                      if (organizations.isEmpty)
                        Text(
                          'You are not a member of any workspace yet.',
                          style: Theme.of(context).textTheme.bodyMedium,
                        )
                      else
                        ...organizations.map((org) {
                          final active = org.id == orgId;
                          return Padding(
                            padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                            child: Row(
                              children: [
                                WorkspaceAvatar(
                                  logoUrl: org.logoUrl,
                                  name: org.name,
                                  size: 40,
                                ),
                                const SizedBox(width: AppSpacing.sm),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(org.name, style: Theme.of(context).textTheme.titleSmall),
                                      Text(
                                        _formatRole(org.myRole),
                                        style: Theme.of(context).textTheme.bodySmall,
                                      ),
                                    ],
                                  ),
                                ),
                                if (active)
                                  const StatusChip(label: 'Active', color: AppColors.violet),
                              ],
                            ),
                          );
                        }),
                    ],
                  ),
                ),
              ],
            ),
    );
  }

  String _formatRole(String? role) {
    if (role == null || role.isEmpty) return 'Member';
    return role[0].toUpperCase() + role.substring(1).toLowerCase();
  }
}
