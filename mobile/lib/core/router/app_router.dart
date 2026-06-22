import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../features/auth/forgot_password_screen.dart';
import '../../features/auth/login_screen.dart';
import '../../features/auth/session_controller.dart';
import '../../features/home/home_shell.dart';
import '../../features/kanban/project_board_screen.dart';
import '../../features/workspaces/workspace_picker_screen.dart';

abstract final class AppRoutes {
  static const login = '/login';
  static const forgotPassword = '/forgot-password';
  static const workspaces = '/workspaces';
  static const home = '/';
  static String projectBoard(String projectId) => '/projects/$projectId/board';
}

final appRouterProvider = Provider<GoRouter>((ref) {
  final session = ref.watch(sessionControllerProvider);

  return GoRouter(
    initialLocation: AppRoutes.login,
    refreshListenable: _RouterRefresh(ref),
    redirect: (context, state) {
      final path = state.uri.path;
      final status = session.status;

      if (status == SessionStatus.loading) {
        return null;
      }

      if (status == SessionStatus.unauthenticated) {
        if (path == AppRoutes.login || path == AppRoutes.forgotPassword) return null;
        return AppRoutes.login;
      }

      if (status == SessionStatus.needsWorkspace) {
        return path == AppRoutes.workspaces ? null : AppRoutes.workspaces;
      }

      if (status == SessionStatus.authenticated) {
        if (path == AppRoutes.login) {
          return AppRoutes.home;
        }
        return null;
      }

      return null;
    },
    routes: [
      GoRoute(
        path: AppRoutes.login,
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: AppRoutes.forgotPassword,
        builder: (context, state) => const ForgotPasswordScreen(),
      ),
      GoRoute(
        path: AppRoutes.workspaces,
        builder: (context, state) => const WorkspacePickerScreen(),
      ),
      GoRoute(
        path: AppRoutes.home,
        builder: (context, state) => const HomeShell(),
      ),
      GoRoute(
        path: '/projects/:projectId/board',
        builder: (context, state) {
          final projectId = state.pathParameters['projectId']!;
          return ProjectBoardScreen(projectId: projectId);
        },
      ),
    ],
  );
});

class _RouterRefresh extends ChangeNotifier {
  _RouterRefresh(this.ref) {
    ref.listen<SessionState>(sessionControllerProvider, (_, __) {
      notifyListeners();
    });
    ref.listen<int>(sessionExpiredTickProvider, (_, __) {
      notifyListeners();
    });
  }

  final Ref ref;
}
