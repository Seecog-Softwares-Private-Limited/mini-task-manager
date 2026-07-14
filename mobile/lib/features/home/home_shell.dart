import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../workspaces/workspace_switcher_sheet.dart';
import '../../core/services/push_nav.dart';
import '../../core/theme/app_colors.dart';
import '../auth/session_controller.dart';
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

class _HomeShellState extends ConsumerState<HomeShell> {
  int _index = 0;
  final Set<int> _mountedTabs = {0};
  bool _enableUnreadBadge = false;

  @override
  void initState() {
    super.initState();
    // Defer notification fetch so the first tab paints quickly.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      setState(() => _enableUnreadBadge = true);
    });
  }

  void _selectTab(int value, {MyWorkFilter? tasksFilter}) {
    if (value != _index) HapticFeedback.selectionClick();
    if (value == 1 && tasksFilter != null) {
      ref.read(myWorkFilterProvider.notifier).state = tasksFilter;
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
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Select a project first.')),
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
      return _GradientFab(
        label: 'Add planner',
        onPressed: _openCreatePlanner,
      );
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    // Phase 11: push tap / cold start → Alerts tab.
    ref.listen<int>(openAlertsTabTickProvider, (_, __) {
      _selectTab(kAlertsTabIndex);
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
        title: Text(_titleForIndex(_index)),
        actions: [
          IconButton(
            tooltip: 'Switch workspace',
            onPressed: _openWorkspaceSwitcher,
            icon: const Icon(Icons.swap_horiz_rounded),
          ),
          const HeaderAccountMenu(),
        ],
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
