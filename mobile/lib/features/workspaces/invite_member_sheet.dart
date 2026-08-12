import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/api/api_exception.dart';
import '../../core/messaging/app_messenger.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/models/org_invitation.dart';
import '../../data/repositories/invitations_repository.dart';
import '../../shared/widgets/app_widgets.dart';

final invitationsRepositoryProvider = Provider<InvitationsRepository>((ref) {
  return InvitationsRepository(apiClient: ref.watch(apiClientProvider));
});

class InviteMemberSheet extends ConsumerStatefulWidget {
  const InviteMemberSheet({
    super.key,
    required this.organizationId,
    this.organizationName,
  });

  final String organizationId;
  final String? organizationName;

  @override
  ConsumerState<InviteMemberSheet> createState() => _InviteMemberSheetState();
}

class _InviteMemberSheetState extends ConsumerState<InviteMemberSheet> {
  final _emailController = TextEditingController();
  String _role = 'member';
  bool _sending = false;
  bool _loadingList = true;
  String? _error;
  List<OrgInvitation> _pending = const [];
  String? _busyInvitationId;

  @override
  void initState() {
    super.initState();
    Future.microtask(_loadPending);
  }

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _loadPending() async {
    setState(() {
      _loadingList = true;
      _error = null;
    });
    try {
      final all = await ref
          .read(invitationsRepositoryProvider)
          .fetchInvitations(workspaceId);
      if (!mounted) return;
      setState(() {
        _pending = all.where((i) => i.isPending).toList();
        _loadingList = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _loadingList = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Could not load invitations';
        _loadingList = false;
      });
    }
  }

  String get workspaceId => widget.organizationId;

  Future<void> _send() async {
    final email = _emailController.text.trim();
    if (email.isEmpty || !email.contains('@')) {
      setState(() => _error = 'Enter a valid email');
      return;
    }

    setState(() {
      _sending = true;
      _error = null;
    });

    try {
      await ref.read(invitationsRepositoryProvider).createInvitation(
            organizationId: workspaceId,
            email: email,
            role: _role,
          );
      if (!mounted) return;
      _emailController.clear();
      setState(() => _role = 'member');
      showAppMessage('Invitation sent to $email');
      await _loadPending();
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'Could not send invitation');
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _resend(OrgInvitation invite) async {
    setState(() {
      _busyInvitationId = invite.id;
      _error = null;
    });
    try {
      await ref.read(invitationsRepositoryProvider).resendInvitation(
            organizationId: workspaceId,
            invitationId: invite.id,
          );
      if (!mounted) return;
      showAppMessage('Invitation resent to ${invite.email}');
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'Could not resend invitation');
    } finally {
      if (mounted) setState(() => _busyInvitationId = null);
    }
  }

  Future<void> _cancel(OrgInvitation invite) async {
    setState(() {
      _busyInvitationId = invite.id;
      _error = null;
    });
    try {
      await ref.read(invitationsRepositoryProvider).cancelInvitation(
            organizationId: workspaceId,
            invitationId: invite.id,
          );
      if (!mounted) return;
      showAppMessage('Invitation cancelled');
      await _loadPending();
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'Could not cancel invitation');
    } finally {
      if (mounted) setState(() => _busyInvitationId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surface = isDark ? const Color(0xFF1E293B) : AppColors.surface;
    final workspaceLabel = widget.organizationName?.trim().isNotEmpty == true
        ? widget.organizationName!
        : 'this workspace';

    return Material(
      color: surface,
      borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      child: Padding(
        padding: EdgeInsets.only(
          left: AppSpacing.md,
          right: AppSpacing.md,
          top: AppSpacing.sm,
          bottom: MediaQuery.viewInsetsOf(context).bottom + AppSpacing.md,
        ),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: AppSpacing.md),
                  decoration: BoxDecoration(
                    color: AppColors.border,
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
              ),
              Text('Invite member', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: AppSpacing.xs),
              Text(
                'Send an email invitation to join $workspaceLabel. '
                'They can accept from the invite link or Workspaces after signing in.',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: AppSpacing.lg),
              Text(
                'EMAIL',
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: AppColors.textMuted,
                      letterSpacing: 0.8,
                      fontWeight: FontWeight.w600,
                    ),
              ),
              const SizedBox(height: AppSpacing.xs),
              TextField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                autofillHints: const [AutofillHints.email],
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(
                  hintText: 'colleague@example.com',
                ),
                enabled: !_sending,
              ),
              const SizedBox(height: AppSpacing.md),
              Text(
                'ROLE',
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: AppColors.textMuted,
                      letterSpacing: 0.8,
                      fontWeight: FontWeight.w600,
                    ),
              ),
              const SizedBox(height: AppSpacing.xs),
              DropdownButtonFormField<String>(
                key: ValueKey(_role),
                initialValue: _role,
                decoration: const InputDecoration(),
                items: const [
                  DropdownMenuItem(value: 'member', child: Text('Member')),
                  DropdownMenuItem(value: 'admin', child: Text('Admin')),
                ],
                onChanged: _sending
                    ? null
                    : (value) {
                        if (value == null) return;
                        setState(() => _role = value);
                      },
              ),
              if (_error != null) ...[
                const SizedBox(height: AppSpacing.sm),
                Text(
                  _error!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ],
              const SizedBox(height: AppSpacing.lg),
              PrimaryButton(
                label: 'Send invite',
                loading: _sending,
                onPressed: _sending ? null : _send,
              ),
              const SizedBox(height: AppSpacing.xl),
              Text(
                'Pending invites',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: AppSpacing.sm),
              if (_loadingList)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: AppSpacing.lg),
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (_pending.isEmpty)
                Text(
                  'No pending invitations.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppColors.textMuted,
                      ),
                )
              else
                for (final invite in _pending) ...[
                  _PendingInviteRow(
                    invite: invite,
                    busy: _busyInvitationId == invite.id,
                    onResend: () => _resend(invite),
                    onCancel: () => _cancel(invite),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                ],
            ],
          ),
        ),
      ),
    );
  }
}

class _PendingInviteRow extends StatelessWidget {
  const _PendingInviteRow({
    required this.invite,
    required this.busy,
    required this.onResend,
    required this.onCancel,
  });

  final OrgInvitation invite;
  final bool busy;
  final VoidCallback onResend;
  final VoidCallback onCancel;

  @override
  Widget build(BuildContext context) {
    final roleLabel = invite.role.isEmpty
        ? 'Member'
        : '${invite.role[0].toUpperCase()}${invite.role.substring(1)}';

    return SurfaceCard(
      padding: const EdgeInsets.all(AppSpacing.sm),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(invite.email, style: Theme.of(context).textTheme.titleSmall),
                const SizedBox(height: 2),
                Text(
                  roleLabel,
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                        color: AppColors.textMuted,
                      ),
                ),
              ],
            ),
          ),
          if (busy)
            const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          else ...[
            TextButton(
              onPressed: onResend,
              child: const Text('Resend'),
            ),
            TextButton(
              onPressed: onCancel,
              style: TextButton.styleFrom(foregroundColor: AppColors.danger),
              child: const Text('Cancel'),
            ),
          ],
        ],
      ),
    );
  }
}

Future<void> showInviteMemberSheet({
  required BuildContext context,
  required String organizationId,
  String? organizationName,
}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: Colors.transparent,
    builder: (_) {
      final height = MediaQuery.of(context).size.height * 0.92;
      return SizedBox(
        height: height,
        child: InviteMemberSheet(
          organizationId: organizationId,
          organizationName: organizationName,
        ),
      );
    },
  );
}
