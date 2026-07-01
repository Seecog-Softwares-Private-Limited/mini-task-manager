import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';

class CapturedLocation {
  const CapturedLocation({
    required this.latitude,
    required this.longitude,
    this.accuracyMeters,
  });

  final double latitude;
  final double longitude;
  final double? accuracyMeters;
}

class LocationService {
  static Future<bool> ensurePermission() async {
    if (kIsWeb) {
      final permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        final requested = await Geolocator.requestPermission();
        return requested == LocationPermission.always ||
            requested == LocationPermission.whileInUse;
      }
      return permission == LocationPermission.always ||
          permission == LocationPermission.whileInUse;
    }

    var serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return false;

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    return permission == LocationPermission.always ||
        permission == LocationPermission.whileInUse;
  }

  static Future<CapturedLocation> captureCurrent() async {
    final allowed = await ensurePermission();
    if (!allowed) {
      throw LocationCaptureException('Location permission is required to complete subtasks.');
    }

    final position = await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        timeLimit: Duration(seconds: 20),
      ),
    );

    return CapturedLocation(
      latitude: position.latitude,
      longitude: position.longitude,
      accuracyMeters: position.accuracy,
    );
  }
}

class LocationCaptureException implements Exception {
  LocationCaptureException(this.message);
  final String message;

  @override
  String toString() => message;
}
