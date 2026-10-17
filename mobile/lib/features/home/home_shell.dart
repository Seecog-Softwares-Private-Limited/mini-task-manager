import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../workspaces/workspace_switcher_sheet.dart';
import '../../core/api/api_exception.dart';
import '../../core/branding/opspick_logo.dart';
import '../../core/messaging/app_messenger.dart';
import '../../core/services/push_nav.dart';
import '../../core/services/push_notification_service.dart';
import '../../core/theme/app_colors.dart';
import '../../data/models/workflow.dart';
import '../auth/session_controller.dart';
import '../kanban/kanban_providers.dart';
import '../kanban/task_detail_sheet.dart';
import '../notifications/notifications_providers.dart';
import '../notifications/notifications_screen.dart';
import '../profile/header_account_menu.dart';
import '../projects/create_project_sheet.dart';
import '../projects/projects_providers.dart';
import '../projects/projects_screen.dart';
import '../recurring/recurring_actions.dart';
import '../recurring/recurring_editor_sheet.dart';
import '../recurring/recurring_providers.dart';
import '../recurring/recurring_screen.dart';
import '../feedback/feedback_form_sheet.dart';
import 'home_tab.dart';
import 'my_work_providers.dart';
import 'my_work_screen.dart';

/// Alerts tab index inside the bottom navigation.
const int kAlertsTabIndex = 4;

class HomeShell extends ConsumerStatefulWidget {
  const HomeShell({super.key});

  @override
  ConsumerState<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends ConsumerState<HomeShell> with WidgetsBindingObserver {
  int _index = 0;
  final Set<int> _mountedTabs = {0};
  bool _enableUnreadBadge = false;
  bool _openingPushDeepLink = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    // Defer notification fetch so the first tab paints quickly.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      setState(() => _enableUnreadBadge = true);
      PushNotificationService.instance.flushPendingOpen();
      // Cold start / late FCM: retry until the task deep-link is opened.
      _schedulePushDeepLinkRetries();
    });
  }

  void _schedulePushDeepLinkRetries() {
    for (final delayMs in const [0, 400, 1200, 2500, 4500]) {
      Future<void>.delayed(Duration(milliseconds: delayMs), () {
        if (!mounted) return;
        _consumePendingPushDeepLink();
      });
    }
  }

  void _consumePendingPushDeepLink() {
    if (_openingPushDeepLink || !mounted) return;

    var link = ref.read(pendingPushDeepLinkProvider);
    if (link == null || !link.hasTask) {
      link = PushNotificationService.instance.takePendingOpenLink();
      if (link != null && link.hasTask) {
        ref.read(pendingPushDeepLinkProvider.notifier).state = link;
      }
    }
    if (link == null || !link.hasTask) return;

    ref.read(pendingPushDeepLinkProvider.notifier).state = null;
    unawaited(_openPushDeepLink(link));
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed || !mounted) return;
    // Refresh planner board so checklist done by others appears after app resume.
    ref.invalidate(recurringBoardTasksProvider);
    ref.invalidate(recurringSummaryProvider);
    ref.invalidate(notificationsProvider);
  }

  void _selectTab(int value, {MyWorkFilter? tasksFilter}) {
    if (value != _index) HapticFeedback.selectionClick();
    if (value == 1 && tasksFilter != null) {
      ref.read(myWorkFilterProvider.notifier).state = tasksFilter;
    }
    // Reset planner FAB visibility when leaving the Planner tab.
    if (_index == 3 && value != 3) {
      ref.read(recurringFabHiddenProvider.notifier).state = false;
    }
    // Entering Planner — refresh board so peer checklist updates are visible.
    if (value == 3 && _index != 3) {
      ref.invalidate(recurringBoardTasksProvider);
      ref.invalidate(recurringSummaryProvider);
    }
    setState(() {
      _mountedTabs.add(value);
      _index = value;
    });
  }

  Future<void> _openWorkspaceSwitcher() async {
    await showWorkspaceSwitcherSheet(context: context, ref: ref);
    ref.invalidate(projectsProvider);
  }

  void _openCreateProject() {
    final orgId = ref.read(sessionControllerProvider).orgId;
    if (orgId == null || orgId.isEmpty) return;
    showCreateProjectSheet(context: context, ref: ref, organizationId: orgId);
  }

  Future<void> _openCreatePlanner() async {
    final orgId = ref.read(sessionControllerProvider).orgId;
    if (orgId == null || orgId.isEmpty) return;

    if (!canManageRecurring(ref)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Only workspace owners and admins can create planners.'),
        ),
      );
      return;
    }

    final projectId = ref.read(recurringSelectedProjectIdProvider);
    if (projectId == null || projectId.isEmpty) {
      final projects = ref.read(projectsProvider).valueOrNull ?? const [];
      final hasProjects = projects.any((p) => !p.isArchived);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            hasProjects
                ? 'Select a project first.'
                : 'Create a project first, then add a planner.',
          ),
        ),
      );
      return;
    }

    await showRecurringEditorSheet(
      context: context,
      organizationId: orgId,
      projectId: projectId,
    );
  }

  Widget? _fabForTab({
    required bool onProjectsTab,
    required bool onPlannerTab,
    required bool canCreateProject,
  }) {
    if (onProjectsTab && canCreateProject) {
      return _GradientFab(
        label: 'Create project',
        onPressed: _openCreateProject,
      );
    }
    if (onPlannerTab) {
      final hideFab = ref.watch(recurringFabHiddenProvider);
      if (hideFab) return null;
      return _GradientFab(
        label: 'Add planner',
        onPressed: _openCreatePlanner,
      );
    }
    return null;
  }

  Future<void> _openPushDeepLink(PushDeepLink link) async {
    final taskId = link.taskId?.trim();
    if (taskId == null || taskId.isEmpty || !mounted) return;
    if (_openingPushDeepLink) return;
    _openingPushDeepLink = true;

    try {
      debugPrint(
        'Opening push deep link taskId=$taskId subtaskId=${link.subtaskId}',
      );
      final task = await ref.read(tasksRepositoryProvider).fetchTask(taskId);
      List<WorkflowStatus> statuses = const [];
      try {
        statuses =
            await ref.read(projectWorkflowStatusesProvider(task.projectId).future);
      } catch (_) {
        statuses = const [];
      }
      if (!mounted) return;
      final navContext = rootNavigatorKey.currentContext ?? context;
      await showModalBottomSheet<void>(
        context: navContext,
        useRootNavigator: true,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (_) {
          return TaskDetailSheet(
            task: task,
            statuses: statuses,
            projectId: task.projectId,
            initialSubtaskId: link.subtaskId,
            onUpdated: () {
              ref.invalidate(notificationsProvider);
              ref.invalidate(projectBoardProvider(task.projectId));
            },
            onDeleted: () {
              ref.invalidate(notificationsProvider);
              ref.invalidate(projectBoardProvider(task.projectId));
            },
          );
        },
      );
    } catch (error) {
      // Keep the deep link so a later retry (or Alerts tap) can still open it.
      PushNotificationService.instance.requeueOpenLink(link);
      ref.read(pendingPushDeepLinkProvider.notifier).state = link;
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(userFacingError(error))),
      );
    } finally {
      _openingPushDeepLink = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    // Push tap → open linked task/subtask (Alerts tab only when there is no task).
    ref.listen<int>(openAlertsTabTickProvider, (_, __) {
      final link = ref.read(pendingPushDeepLinkProvider) ??
          PushNotificationService.instance.pendingOpenLink;
      if (link != null && link.hasTask) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (!mounted) return;
          _consumePendingPushDeepLink();
        });
        return;
      }
      _selectTab(kAlertsTabIndex);
    });

    ref.listen<PushDeepLink?>(pendingPushDeepLinkProvider, (prev, next) {
      if (next == null || !next.hasTask) return;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        _consumePendingPushDeepLink();
      });
    });

    final orgId = ref.watch(
      sessionControllerProvider.select((session) => session.orgId),
    );
    final unread = _enableUnreadBadge ? ref.watch(unreadNotificationsCountProvider) : 0;
    final unreadLabel = unread > 99 ? '99+' : '$unread';
    final onProjectsTab = _index == 2;
    final onPlannerTab = _index == 3;
    final canCreateProject = onProjectsTab && orgId != null && orgId.isNotEmpty;

    final pages = List<Widget>.generate(5, (index) {
      if (!_mountedTabs.contains(index)) {
        return const SizedBox.shrink();
      }
      return switch (index) {
        0 => HomeTab(
            key: ValueKey('home-$orgId'),
            orgId: orgId,
            onNavigateTab: _selectTab,
          ),
        1 => MyWorkScreen(
            key: ValueKey('tasks-$orgId'),
            embedded: true,
          ),
        2 => ProjectsScreen(key: ValueKey('projects-$orgId'), orgId: orgId),
        3 => const RecurringScreen(),
        _ => const NotificationsScreen(),
      };
    });

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 12,
        title: Row(
          children: [
            if (_index == 0) ...[
              const OpsPickLogo(size: 28, borderRadius: 8),
              const SizedBox(width: 10),
            ],
            Flexible(child: Text(_titleForIndex(_index))),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Switch workspace',
            onPressed: _openWorkspaceSwitcher,
            icon: const Icon(Icons.swap_horiz_rounded),
          ),
          const HeaderAccountMenu(),
        ],
        flexibleSpace: SafeArea(
          child: Align(
            alignment: Alignment.center,
            child: IconButton(
              tooltip: 'Send feedback',
              onPressed: () => showFeedbackFormSheet(context: context, ref: ref),
              icon: ShaderMask(
                blendMode: BlendMode.srcIn,
                shaderCallback: (bounds) => const LinearGradient(
                  colors: [AppColors.primary, AppColors.primaryGradientEnd],
                ).createShader(bounds),
                child: const Icon(Icons.auto_awesome_rounded),
              ),
            ),
          ),
        ),
      ),
      body: IndexedStack(index: _index, children: pages),
      floatingActionButton: _fabForTab(
        onProjectsTab: onProjectsTab,
        onPlannerTab: onPlannerTab,
        canCreateProject: canCreateProject,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: _selectTab,
        destinations: [
          const NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home_rounded),
            label: 'Home',
          ),
          const NavigationDestination(
            icon: Icon(Icons.checklist_rounded),
            selectedIcon: Icon(Icons.checklist_rtl_rounded),
            label: 'Tasks',
          ),
          const NavigationDestination(
            icon: Icon(Icons.folder_outlined),
            selectedIcon: Icon(Icons.folder_rounded),
            label: 'Projects',
          ),
          const NavigationDestination(
            icon: Icon(Icons.event_repeat_outlined),
            selectedIcon: Icon(Icons.event_repeat_rounded),
            label: 'Planner',
          ),
          NavigationDestination(
            icon: Badge(
              isLabelVisible: unread > 0,
              label: Text(unreadLabel),
              child: const Icon(Icons.notifications_outlined),
            ),
            selectedIcon: Badge(
              isLabelVisible: unread > 0,
              label: Text(unreadLabel),
              child: const Icon(Icons.notifications_rounded),
            ),
            label: 'Alerts',
          ),
        ],
      ),
    );
  }

  String _titleForIndex(int index) {
    return switch (index) {
      0 => 'Home',
      1 => 'Tasks',
      2 => 'Projects',
      3 => 'Planner',
      _ => 'Alerts',
    };
  }
}

class _GradientFab extends StatelessWidget {
  const _GradientFab({
    required this.label,
    required this.onPressed,
  });

  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        gradient: const LinearGradient(
          colors: [AppColors.primary, AppColors.primaryGradientEnd],
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.4),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: FloatingActionButton.extended(
        elevation: 0,
        highlightElevation: 0,
        backgroundColor: Colors.transparent,
        foregroundColor: Colors.white,
        onPressed: onPressed,
        icon: const Icon(Icons.add_rounded),
        label: Text(label),
      ),
    );
  }
}
