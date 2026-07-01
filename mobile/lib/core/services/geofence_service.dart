import 'dart:convert';

import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';

class GeofenceConfig {
  const GeofenceConfig({
    required this.projectId,
    required this.latitude,
    required this.longitude,
    required this.radiusMeters,
    this.label,
  });

  final String projectId;
  final double latitude;
  final double longitude;
  final double radiusMeters;
  final String? label;

  factory GeofenceConfig.fromJson(Map<String, dynamic> json) {
    return GeofenceConfig(
      projectId: json['projectId'] as String? ?? '',
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
      radiusMeters: (json['radiusMeters'] as num?)?.toDouble() ?? 1000,
      label: json['label'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'projectId': projectId,
        'latitude': latitude,
        'longitude': longitude,
        'radiusMeters': radiusMeters,
        if (label != null) 'label': label,
      };
}

class GeofenceValidation {
  const GeofenceValidation({
    required this.valid,
    required this.distanceMeters,
    required this.radiusMeters,
    required this.configured,
    this.config,
  });

  final bool valid;
  final double distanceMeters;
  final double radiusMeters;
  final bool configured;
  final GeofenceConfig? config;
}

class GeofenceService {
  static const _prefix = 'project_geofence_';
  static const defaultRadiusMeters = 1000.0;

  static Future<GeofenceConfig?> readConfig(String projectId) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString('$_prefix$projectId');
    if (raw == null || raw.isEmpty) return null;
    return GeofenceConfig.fromJson(jsonDecode(raw) as Map<String, dynamic>);
  }

  static Future<void> saveConfig(GeofenceConfig config) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      '$_prefix${config.projectId}',
      jsonEncode(config.toJson()),
    );
  }

  /// Validates position against the project geofence. If none exists yet, seeds
  /// the site from the current position (1 km radius) so field teams can start.
  static Future<GeofenceValidation> validate({
    required String projectId,
    required double latitude,
    required double longitude,
  }) async {
    var config = await readConfig(projectId);
    if (config == null) {
      config = GeofenceConfig(
        projectId: projectId,
        latitude: latitude,
        longitude: longitude,
        radiusMeters: defaultRadiusMeters,
        label: 'Work site',
      );
      await saveConfig(config);
    }

    final distance = Geolocator.distanceBetween(
      latitude,
      longitude,
      config.latitude,
      config.longitude,
    );

    return GeofenceValidation(
      valid: distance <= config.radiusMeters,
      distanceMeters: distance,
      radiusMeters: config.radiusMeters,
      configured: true,
      config: config,
    );
  }
}
