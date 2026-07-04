import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../workspaces/workspace_switcher_sheet.dart';
import '../../core/theme/app_colors.dart';
import '../auth/session_controller.dart';
import '../notifications/notifications_providers.dart';
import '../notifications/notifications_screen.dart';
import '../profile/header_account_menu.dart';
import '../profile/profile_screen.dart';
import '../projects/create_project_sheet.dart';
import '../projects/projects_providers.dart';
import '../projects/projects_screen.dart';
import '../recurring/recurring_screen.dart';
import 'home_tab.dart';

class HomeShell extends ConsumerStatefulWidget {
  const HomeShell({super.key});

  @override
  ConsumerState<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends ConsumerState<HomeShell> {
  int _index = 0;

  Future<void> _openWorkspaceSwitcher() async {
    await showWorkspaceSwitcherSheet(context: context, ref: ref);
    ref.invalidate(projectsProvider);
  }

  void _openCreateProject() {
    final orgId = ref.read(sessionControllerProvider).orgId;
    if (orgId == null || orgId.isEmpty) return;
    showCreateProjectSheet(context: context, ref: ref, organizationId: orgId);
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(sessionControllerProvider);
    final orgId = session.orgId;
    final unread = ref.watch(unreadNotificationsCountProvider);
    final onProjectsTab = _index == 1;
    final canCreateProject = onProjectsTab && orgId != null && orgId.isNotEmpty;

    final pages = [
      HomeTab(orgId: orgId, onNavigateTab: (index) => setState(() => _index = index)),
      ProjectsScreen(orgId: orgId),
      const RecurringScreen(),
      const NotificationsScreen(),
      const ProfileScreen(),
    ];

    return Scaffold(
      appBar: AppBar(
        title: Text(_titleForIndex(_index)),
        actions: [
          if (canCreateProject)
            TextButton.icon(
              onPressed: _openCreateProject,
              icon: const Icon(Icons.add_rounded, size: 20),
              label: const Text('Create project'),
              style: TextButton.styleFrom(foregroundColor: AppColors.primary),
            ),
          IconButton(
            tooltip: 'Switch workspace',
            onPressed: _openWorkspaceSwitcher,
            icon: const Icon(Icons.swap_horiz_rounded),
          ),
          HeaderAccountMenu(
            onOpenProfileTab: () => setState(() => _index = 4),
          ),
        ],
      ),
      body: IndexedStack(index: _index, children: pages),
      floatingActionButton: canCreateProject
          ? Container(
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
                onPressed: _openCreateProject,
                icon: const Icon(Icons.add_rounded),
                label: const Text('Create project'),
              ),
            )
          : null,
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (value) => setState(() => _index = value),
        destinations: [
          const NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home_rounded),
            label: 'Home',
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
              label: Text('$unread'),
              child: const Icon(Icons.notifications_outlined),
            ),
            selectedIcon: Badge(
              isLabelVisible: unread > 0,
              label: Text('$unread'),
              child: const Icon(Icons.notifications_rounded),
            ),
            label: 'Alerts',
          ),
          const NavigationDestination(
            icon: Icon(Icons.person_outline_rounded),
            selectedIcon: Icon(Icons.person_rounded),
            label: 'Profile',
          ),
        ],
      ),
    );
  }

  String _titleForIndex(int index) {
    return switch (index) {
      0 => 'Home',
      1 => 'Projects',
      2 => 'Recurring planner',
      3 => 'Notifications',
      _ => 'Profile',
    };
  }
}
