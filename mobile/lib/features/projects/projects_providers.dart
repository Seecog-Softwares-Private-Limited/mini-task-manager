import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/cache/offline_cache.dart';
import '../../data/models/project.dart';
import '../../data/repositories/projects_repository.dart';
import '../auth/session_controller.dart';

final projectsRepositoryProvider = Provider<ProjectsRepository>((ref) {
  return ProjectsRepository(apiClient: ref.watch(apiClientProvider));
});

final projectsProvider = FutureProvider.autoDispose<List<Project>>((ref) async {
  final session = ref.watch(sessionControllerProvider);
  final orgId = session.orgId;
  if (orgId == null || orgId.isEmpty) return const [];

  final repository = ref.watch(projectsRepositoryProvider);
  final cache = ref.watch(offlineCacheProvider);

  try {
    final projects = await repository.fetchProjects(organizationId: orgId);
    await cache.saveProjects(
      orgId,
      projects
          .map(
            (p) => {
              'id': p.id,
              'organizationId': p.organizationId,
              'name': p.name,
              'description': p.description,
              'iconUrl': p.iconUrl,
              'visibility': p.visibility,
              'isArchived': p.isArchived,
              'createdBy': p.createdBy,
              'createdAt': p.createdAt,
              'updatedAt': p.updatedAt,
            },
          )
          .toList(),
    );
    return projects;
  } catch (_) {
    final cached = cache.readProjects(orgId);
    if (cached != null) {
      return cached.map(Project.fromJson).toList();
    }
    rethrow;
  }
});
