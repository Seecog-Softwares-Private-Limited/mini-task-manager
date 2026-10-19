import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/api/api_exception.dart';
import '../../core/messaging/app_messenger.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/models/login_response.dart';
import '../../data/models/org_invitation.dart';
import '../../data/models/project.dart';
import '../../data/models/project_member.dart';
import '../../data/repositories/invitations_repository.dart';
import '../../shared/widgets/app_widgets.dart';
import '../../shared/widgets/user_avatar.dart';
import '../auth/session_controller.dart';
import '../projects/projects_providers.dart';

final invitationsRepositoryProvider = Provider<InvitationsRepository>((ref) {
  return InvitationsRepository(apiClient: ref.watch(apiClientProvider));
});

class MembersSheet extends ConsumerStatefulWidget {
  const MembersSheet({
    super.key,
    required this.organizationId,
    this.organizationName,
    this.ownerId,
    this.myRole,
  });

  final String organizationId;
  final String? organizationName;
  final String? ownerId;
  final String? myRole;

  @override
  ConsumerState<MembersSheet> createState() => _MembersSheetState();
}

class _MembersSheetState extends ConsumerState<MembersSheet>
    with SingleTickerProviderStateMixin {
  final _emailController = TextEditingController();
  late final TabController _tabController;

  String _role = 'member';
  bool _sending = false;
  bool _inviteWithoutProjects = false;
  bool _loadingPending = true;
  bool _loadingMembers = true;
  bool _loadingProjects = true;
  String? _error;
  List<OrgInvitation> _pending = const [];
  List<ProjectMember> _members = const [];
  List<Project> _projects = const [];
  final Set<String> _inviteProjectIds = {};
  String? _busyInvitationId;
  String? _busyMemberId;

  bool get _canSendInvite {
    if (_sending || _role.trim().isEmpty || _loadingProjects) return false;
    if (_inviteWithoutProjects || _projects.isEmpty) return true;
    return _inviteProjectIds.isNotEmpty;
  }

  bool get _canManageProjectAccess {
    // Only the workspace owner controls which projects each user can see.
    return (widget.myRole ?? '').toLowerCase() == 'owner';
  }

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    Future.microtask(() async {
      await Future.wait([_loadPending(), _loadMembers(), _loadProjects()]);
    });
  }

  @override
  void dispose() {
    _emailController.dispose();
    _tabController.dispose();
    super.dispose();
  }

  String get workspaceId => widget.organizationId;

  Future<void> _loadPending() async {
    setState(() {
      _loadingPending = true;
      _error = null;
    });
    try {
      final all = await ref
          .read(invitationsRepositoryProvider)
          .fetchInvitations(workspaceId);
      if (!mounted) return;
      setState(() {
        _pending = all.where((i) => i.isPending).toList();
        _loadingPending = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _loadingPending = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Could not load invitations';
        _loadingPending = false;
      });
    }
  }

  Future<void> _loadMembers() async {
    setState(() {
      _loadingMembers = true;
      _error = null;
    });
    try {
      final members = await ref
          .read(organizationsRepositoryProvider)
          .fetchOrgMembers(workspaceId);
      if (!mounted) return;
      setState(() {
        _members = members;
        _loadingMembers = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _loadingMembers = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Could not load members';
        _loadingMembers = false;
      });
    }
  }

  Future<void> _loadProjects() async {
    setState(() => _loadingProjects = true);
    try {
      final projects = await ref
          .read(projectsRepositoryProvider)
          .fetchProjects(organizationId: workspaceId);
      if (!mounted) return;
      setState(() {
        _projects = projects;
        _loadingProjects = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _loadingProjects = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Could not load projects';
        _loadingProjects = false;
      });
    }
  }

  Future<void> _send() async {
    final email = _emailController.text.trim();
    if (email.isEmpty || !email.contains('@')) {
      setState(() => _error = 'Enter a valid email');
      return;
    }
    if (_role.trim().isEmpty) {
      setState(() => _error = 'Select a role');
      return;
    }
    final workspaceOnly =
        _inviteWithoutProjects || _projects.isEmpty;
    if (!workspaceOnly && _inviteProjectIds.isEmpty) {
      setState(
        () => _error =
            'Select at least one project, or check “Invite without project”',
      );
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
            projectIds: workspaceOnly ? const [] : _inviteProjectIds.toList(),
          );
      if (!mounted) return;
      _emailController.clear();
      setState(() {
        _role = 'member';
        _inviteWithoutProjects = false;
        _inviteProjectIds.clear();
      });
      showAppMessage('Invitation sent to $email');
      // Pending Invitations is the second tab.
      _tabController.animateTo(1);
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

  bool _isOwner(ProjectMember member) {
    final ownerId = widget.ownerId?.trim();
    if (ownerId == null || ownerId.isEmpty) {
      return member.role.toLowerCase() == 'owner';
    }
    return member.userId == ownerId || member.role.toLowerCase() == 'owner';
  }

  Future<void> _confirmRemove(ProjectMember member) async {
    final fullName = member.user?.fullName.trim() ?? '';
    final name = fullName.isNotEmpty
        ? fullName
        : (member.user?.email ?? 'this member');
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Remove member'),
        content: Text(
          'Remove $name from this workspace? They will lose access to all projects and tasks.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: TextButton.styleFrom(foregroundColor: AppColors.danger),
            child: const Text('Remove'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    setState(() {
      _busyMemberId = member.id;
      _error = null;
    });
    try {
      await ref.read(organizationsRepositoryProvider).removeMember(
            organizationId: workspaceId,
            memberId: member.id,
          );
      if (!mounted) return;
      showAppMessage('Member removed');
      await _loadMembers();
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'Could not remove member');
    } finally {
      if (mounted) setState(() => _busyMemberId = null);
    }
  }

  Future<void> _changeRole(ProjectMember member) async {
    var selected = member.role.toLowerCase() == 'admin' ? 'admin' : 'member';
    final result = await showDialog<String>(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setLocal) {
            return AlertDialog(
              title: const Text('Change role'),
              content: DropdownButtonFormField<String>(
                key: ValueKey(selected),
                initialValue: selected,
                decoration: const InputDecoration(labelText: 'Role'),
                items: const [
                  DropdownMenuItem(value: 'member', child: Text('Member')),
                  DropdownMenuItem(value: 'admin', child: Text('Admin')),
                ],
                onChanged: (value) {
                  if (value == null) return;
                  setLocal(() => selected = value);
                },
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(ctx).pop(),
                  child: const Text('Cancel'),
                ),
                TextButton(
                  onPressed: () => Navigator.of(ctx).pop(selected),
                  child: const Text('Save'),
                ),
              ],
            );
          },
        );
      },
    );
    if (result == null || !mounted) return;
    if (result.toLowerCase() == member.role.toLowerCase()) return;

    setState(() {
      _busyMemberId = member.id;
      _error = null;
    });
    try {
      await ref.read(organizationsRepositoryProvider).updateMemberRole(
            organizationId: workspaceId,
            memberId: member.id,
            role: result,
          );
      if (!mounted) return;
      showAppMessage('Role updated');
      await _loadMembers();
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'Could not update role');
    } finally {
      if (mounted) setState(() => _busyMemberId = null);
    }
  }

  Future<void> _updateProjects(ProjectMember member) async {
    if (!_canManageProjectAccess) return;
    final projectsRepo = ref.read(projectsRepositoryProvider);
    final projects = _projects.isNotEmpty
        ? _projects
        : await projectsRepo.fetchProjects(organizationId: workspaceId);
    if (!mounted) return;
    if (projects.isEmpty) {
      showAppMessage('No projects in this workspace yet');
      return;
    }

    setState(() {
      _busyMemberId = member.id;
      _error = null;
    });
    late final Set<String> currentAccess;
    try {
      final ids = await projectsRepo.fetchUserProjectAccess(
        organizationId: workspaceId,
        userId: member.userId,
      );
      currentAccess = ids.toSet();
    } on ApiException catch (e) {
      if (mounted) {
        setState(() {
          _error = e.message;
          _busyMemberId = null;
        });
      }
      return;
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = 'Could not load project access';
          _busyMemberId = null;
        });
      }
      return;
    } finally {
      if (mounted) setState(() => _busyMemberId = null);
    }
    if (!mounted) return;

    final saved = await showProjectAccessPicker(
      context: context,
      projects: projects,
      initiallySelected: currentAccess,
      title: 'Update project access',
    );
    if (saved == null || !mounted) return;
    if (saved.length == currentAccess.length && saved.containsAll(currentAccess)) {
      return;
    }

    setState(() {
      _busyMemberId = member.id;
      _error = null;
    });
    try {
      await projectsRepo.setUserProjectAccess(
        organizationId: workspaceId,
        userId: member.userId,
        projectIds: saved,
      );
      if (!mounted) return;
      showAppMessage('Project access updated');
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'Could not update project access');
    } finally {
      if (mounted) setState(() => _busyMemberId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surface = isDark ? const Color(0xFF1E293B) : AppColors.surface;
    final workspaceLabel = widget.organizationName?.trim().isNotEmpty == true
        ? widget.organizationName!
        : 'this workspace';

    final tabBar = TabBar(
      controller: _tabController,
      labelColor: AppColors.primary,
      unselectedLabelColor: AppColors.textMuted,
      indicatorColor: AppColors.primary,
      tabs: [
        Tab(text: 'Existing Members (${_members.length})'),
        Tab(text: 'Pending Invitations (${_pending.length})'),
      ],
    );

    return Material(
      color: surface,
      borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      clipBehavior: Clip.antiAlias,
      child: Padding(
        padding: EdgeInsets.only(
          left: AppSpacing.md,
          right: AppSpacing.md,
          top: AppSpacing.sm,
          bottom: MediaQuery.viewInsetsOf(context).bottom + AppSpacing.md,
        ),
        child: NestedScrollView(
          headerSliverBuilder: (context, innerBoxIsScrolled) {
            return [
              SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
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
                    Text('Members', style: Theme.of(context).textTheme.titleLarge),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      'Invite teammates to $workspaceLabel, manage roles, and project access.',
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
                    const SizedBox(height: AppSpacing.md),
                    Text(
                      'PROJECT ACCESS',
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                            color: AppColors.textMuted,
                            letterSpacing: 0.8,
                            fontWeight: FontWeight.w600,
                          ),
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      _projects.isEmpty
                          ? 'No projects yet — invite will be workspace-only until you grant access later.'
                          : 'Select at least one project. Or use the option below for a workspace-only invite.',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppColors.textMuted,
                          ),
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    _ProjectAccessDropdown(
                      projects: _projects,
                      selectedIds: _inviteProjectIds,
                      loading: _loadingProjects,
                      enabled: !_sending &&
                          !_inviteWithoutProjects &&
                          _projects.isNotEmpty,
                      requiredSelection: !_inviteWithoutProjects,
                      onChanged: (ids) {
                        setState(() {
                          _inviteProjectIds
                            ..clear()
                            ..addAll(ids);
                          if (ids.isNotEmpty) {
                            _inviteWithoutProjects = false;
                          }
                        });
                      },
                    ),
                    if (_projects.isNotEmpty) ...[
                      const SizedBox(height: AppSpacing.xs),
                      CheckboxListTile(
                        contentPadding: EdgeInsets.zero,
                        dense: true,
                        controlAffinity: ListTileControlAffinity.leading,
                        value: _inviteWithoutProjects,
                        onChanged: _sending
                            ? null
                            : (value) {
                                setState(() {
                                  _inviteWithoutProjects = value ?? false;
                                  if (_inviteWithoutProjects) {
                                    _inviteProjectIds.clear();
                                  }
                                });
                              },
                        title: Text(
                          'Invite without project',
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                        subtitle: Text(
                          'Workspace only — they won’t see projects until you grant access.',
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: AppColors.textMuted,
                              ),
                        ),
                      ),
                    ],
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
                      onPressed: _canSendInvite ? _send : null,
                    ),
                    const SizedBox(height: AppSpacing.md),
                  ],
                ),
              ),
              SliverOverlapAbsorber(
                handle: NestedScrollView.sliverOverlapAbsorberHandleFor(context),
                sliver: SliverPersistentHeader(
                  pinned: true,
                  delegate: _PinnedTabBarDelegate(
                    tabBar: tabBar,
                    backgroundColor: surface,
                  ),
                ),
              ),
            ];
          },
          body: TabBarView(
            controller: _tabController,
            children: [
              _buildMembersTab(),
              _buildPendingTab(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPendingTab() {
    return Builder(
      builder: (context) {
        return CustomScrollView(
          key: const PageStorageKey<String>('pending-invitations'),
          slivers: [
            SliverOverlapInjector(
              handle: NestedScrollView.sliverOverlapAbsorberHandleFor(context),
            ),
            if (_loadingPending)
              const SliverFillRemaining(
                hasScrollBody: false,
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_pending.isEmpty)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.only(top: AppSpacing.sm),
                  child: Text(
                    'No pending invitations.',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppColors.textMuted,
                        ),
                  ),
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.only(
                  top: AppSpacing.xs,
                  bottom: AppSpacing.md,
                ),
                sliver: SliverList.separated(
                  itemCount: _pending.length,
                  separatorBuilder: (_, __) =>
                      const SizedBox(height: AppSpacing.sm),
                  itemBuilder: (context, index) {
                    final invite = _pending[index];
                    return _PendingInviteRow(
                      invite: invite,
                      busy: _busyInvitationId == invite.id,
                      onResend: () => _resend(invite),
                      onCancel: () => _cancel(invite),
                    );
                  },
                ),
              ),
          ],
        );
      },
    );
  }

  Widget _buildMembersTab() {
    return Builder(
      builder: (context) {
        return CustomScrollView(
          key: const PageStorageKey<String>('existing-members'),
          slivers: [
            SliverOverlapInjector(
              handle: NestedScrollView.sliverOverlapAbsorberHandleFor(context),
            ),
            if (_loadingMembers)
              const SliverFillRemaining(
                hasScrollBody: false,
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_members.isEmpty)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.only(top: AppSpacing.sm),
                  child: Text(
                    'No members yet.',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppColors.textMuted,
                        ),
                  ),
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.only(
                  top: AppSpacing.xs,
                  bottom: AppSpacing.md,
                ),
                sliver: SliverList.separated(
                  itemCount: _members.length,
                  separatorBuilder: (_, __) =>
                      const SizedBox(height: AppSpacing.sm),
                  itemBuilder: (context, index) {
                    final member = _members[index];
                    final isOwner = _isOwner(member);
                    final busy = _busyMemberId == member.id;
                    return _ExistingMemberRow(
                      member: member,
                      isOwner: isOwner,
                      busy: busy,
                      onChangeRole: isOwner ? null : () => _changeRole(member),
                      onUpdateProjects: _canManageProjectAccess
                          ? () => _updateProjects(member)
                          : null,
                      onRemove: isOwner ? null : () => _confirmRemove(member),
                    );
                  },
                ),
              ),
          ],
        );
      },
    );
  }
}

/// Dropdown-styled multi-select for project access (opens a picker sheet).
class _ProjectAccessDropdown extends StatelessWidget {
  const _ProjectAccessDropdown({
    required this.projects,
    required this.selectedIds,
    required this.onChanged,
    this.loading = false,
    this.enabled = true,
    this.requiredSelection = true,
  });

  final List<Project> projects;
  final Set<String> selectedIds;
  final ValueChanged<Set<String>> onChanged;
  final bool loading;
  final bool enabled;
  final bool requiredSelection;

  String get _label {
    if (loading) return 'Loading projects…';
    if (projects.isEmpty) return 'No projects yet';
    if (selectedIds.isEmpty) {
      return requiredSelection ? 'Select projects…' : 'No projects';
    }
    final names = projects
        .where((p) => selectedIds.contains(p.id))
        .map((p) => p.name)
        .toList();
    if (names.length == 1) return names.first;
    if (names.length == 2) return '${names[0]}, ${names[1]}';
    return '${names.length} projects selected';
  }

  Future<void> _openPicker(BuildContext context) async {
    if (!enabled || loading || projects.isEmpty) return;
    final result = await showProjectAccessPicker(
      context: context,
      projects: projects,
      initiallySelected: selectedIds,
      title: 'Select projects',
    );
    if (result != null) onChanged(result);
  }

  @override
  Widget build(BuildContext context) {
    final muted = !enabled || loading || projects.isEmpty;
    return InkWell(
      onTap: muted ? null : () => _openPicker(context),
      borderRadius: BorderRadius.circular(12),
      child: InputDecorator(
        decoration: const InputDecoration(
          suffixIcon: Icon(Icons.arrow_drop_down),
        ),
        isEmpty: selectedIds.isEmpty && !loading,
        child: Text(
          _label,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                color: muted && selectedIds.isEmpty
                    ? AppColors.textMuted
                    : null,
              ),
        ),
      ),
    );
  }
}

Future<Set<String>?> showProjectAccessPicker({
  required BuildContext context,
  required List<Project> projects,
  required Iterable<String> initiallySelected,
  String title = 'Select projects',
}) {
  final selected = Set<String>.from(initiallySelected);
  return showModalBottomSheet<Set<String>>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: Colors.transparent,
    builder: (ctx) {
      final isDark = Theme.of(ctx).brightness == Brightness.dark;
      final surface = isDark ? const Color(0xFF1E293B) : AppColors.surface;
      return StatefulBuilder(
        builder: (ctx, setLocal) {
          return Material(
            color: surface,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
            child: Padding(
              padding: EdgeInsets.only(
                left: AppSpacing.md,
                right: AppSpacing.md,
                top: AppSpacing.sm,
                bottom: MediaQuery.viewInsetsOf(ctx).bottom + AppSpacing.md,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
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
                  Text(title, style: Theme.of(ctx).textTheme.titleMedium),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    'Select one or more projects.',
                    style: Theme.of(ctx).textTheme.bodySmall?.copyWith(
                          color: AppColors.textMuted,
                        ),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  ConstrainedBox(
                    constraints: BoxConstraints(
                      maxHeight: MediaQuery.sizeOf(ctx).height * 0.45,
                    ),
                    child: ListView.builder(
                      shrinkWrap: true,
                      itemCount: projects.length,
                      itemBuilder: (_, index) {
                        final project = projects[index];
                        final checked = selected.contains(project.id);
                        return CheckboxListTile(
                          value: checked,
                          title: Text(project.name),
                          controlAffinity: ListTileControlAffinity.leading,
                          contentPadding: EdgeInsets.zero,
                          onChanged: (value) {
                            setLocal(() {
                              if (value == true) {
                                selected.add(project.id);
                              } else {
                                selected.remove(project.id);
                              }
                            });
                          },
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Row(
                    children: [
                      Expanded(
                        child: SecondaryButton(
                          label: 'Cancel',
                          onPressed: () => Navigator.of(ctx).pop(),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: PrimaryButton(
                          label: 'Done',
                          onPressed: () =>
                              Navigator.of(ctx).pop(Set<String>.from(selected)),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      );
    },
  );
}

class _PinnedTabBarDelegate extends SliverPersistentHeaderDelegate {
  _PinnedTabBarDelegate({
    required this.tabBar,
    required this.backgroundColor,
  });

  final TabBar tabBar;
  final Color backgroundColor;

  @override
  double get minExtent => tabBar.preferredSize.height;

  @override
  double get maxExtent => tabBar.preferredSize.height;

  @override
  Widget build(
    BuildContext context,
    double shrinkOffset,
    bool overlapsContent,
  ) {
    return Material(
      color: backgroundColor,
      elevation: overlapsContent || shrinkOffset > 0 ? 1 : 0,
      child: tabBar,
    );
  }

  @override
  bool shouldRebuild(covariant _PinnedTabBarDelegate oldDelegate) {
    return tabBar != oldDelegate.tabBar ||
        backgroundColor != oldDelegate.backgroundColor;
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

class _ExistingMemberRow extends StatelessWidget {
  const _ExistingMemberRow({
    required this.member,
    required this.isOwner,
    required this.busy,
    this.onChangeRole,
    this.onUpdateProjects,
    this.onRemove,
  });

  final ProjectMember member;
  final bool isOwner;
  final bool busy;
  final VoidCallback? onChangeRole;
  final VoidCallback? onUpdateProjects;
  final VoidCallback? onRemove;

  @override
  Widget build(BuildContext context) {
    final fullName = member.user?.fullName.trim() ?? '';
    final name = fullName.isNotEmpty ? fullName : (member.user?.email ?? 'Member');
    final email = member.user?.email ?? '';
    final roleRaw = member.role.trim().isEmpty ? 'member' : member.role.trim();
    final roleLabel = isOwner
        ? 'Owner'
        : '${roleRaw[0].toUpperCase()}${roleRaw.substring(1).toLowerCase()}';

    final avatarUser = AuthUser(
      id: member.user?.id ?? member.userId,
      email: email,
      fullName: name,
      avatarUrl: member.user?.avatarUrl,
    );

    return SurfaceCard(
      padding: const EdgeInsets.all(AppSpacing.sm),
      child: Row(
        children: [
          UserAvatar(user: avatarUser, size: 44),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: Theme.of(context).textTheme.titleSmall),
                if (email.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    email,
                    style: Theme.of(context).textTheme.labelMedium?.copyWith(
                          color: AppColors.textMuted,
                        ),
                  ),
                ],
                const SizedBox(height: 2),
                Text(
                  roleLabel,
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                        color: AppColors.primary,
                        fontWeight: FontWeight.w600,
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
          else
            PopupMenuButton<_MemberAction>(
              tooltip: 'Member actions',
              onSelected: (action) {
                switch (action) {
                  case _MemberAction.changeRole:
                    onChangeRole?.call();
                  case _MemberAction.updateProjects:
                    onUpdateProjects?.call();
                  case _MemberAction.remove:
                    onRemove?.call();
                }
              },
              itemBuilder: (context) => [
                if (onChangeRole != null)
                  const PopupMenuItem(
                    value: _MemberAction.changeRole,
                    child: Text('Change role'),
                  ),
                if (onUpdateProjects != null)
                  const PopupMenuItem(
                    value: _MemberAction.updateProjects,
                    child: Text('Update project access'),
                  ),
                if (onRemove != null)
                  const PopupMenuItem(
                    value: _MemberAction.remove,
                    child: Text(
                      'Remove member',
                      style: TextStyle(color: AppColors.danger),
                    ),
                  ),
              ],
            ),
        ],
      ),
    );
  }
}

enum _MemberAction { changeRole, updateProjects, remove }

Future<void> showMembersSheet({
  required BuildContext context,
  required String organizationId,
  String? organizationName,
  String? ownerId,
  String? myRole,
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
        child: MembersSheet(
          organizationId: organizationId,
          organizationName: organizationName,
          ownerId: ownerId,
          myRole: myRole,
        ),
      );
    },
  );
}

/// Kept for any older call sites.
Future<void> showInviteMemberSheet({
  required BuildContext context,
  required String organizationId,
  String? organizationName,
  String? ownerId,
  String? myRole,
}) {
  return showMembersSheet(
    context: context,
    organizationId: organizationId,
    organizationName: organizationName,
    ownerId: ownerId,
    myRole: myRole,
  );
}
