class SubtaskCompletionRecord {
  const SubtaskCompletionRecord({
    required this.completedAt,
    required this.employeeId,
    required this.employeeName,
    required this.latitude,
    required this.longitude,
    required this.geofenceValid,
    required this.deviceInfo,
    this.employeeEmail,
    this.accuracyMeters,
    this.geofenceDistanceMeters,
    this.geofenceRadiusMeters,
    this.geofenceSiteId,
    this.notes,
    this.beforePhotoFileNames = const [],
    this.afterPhotoFileNames = const [],
    this.voiceNoteFileName,
    this.videoFileName,
  });

  final String completedAt;
  final String employeeId;
  final String employeeName;
  final String? employeeEmail;
  final double latitude;
  final double longitude;
  final double? accuracyMeters;
  final bool geofenceValid;
  final double? geofenceDistanceMeters;
  final double? geofenceRadiusMeters;
  final String? geofenceSiteId;
  final Map<String, dynamic> deviceInfo;
  final String? notes;
  final List<String> beforePhotoFileNames;
  final List<String> afterPhotoFileNames;
  final String? voiceNoteFileName;
  final String? videoFileName;

  factory SubtaskCompletionRecord.fromJson(Map<String, dynamic> json) {
    return SubtaskCompletionRecord(
      completedAt: json['completedAt'] as String? ?? '',
      employeeId: json['employeeId'] as String? ?? '',
      employeeName: json['employeeName'] as String? ?? '',
      employeeEmail: json['employeeEmail'] as String?,
      latitude: (json['latitude'] as num?)?.toDouble() ?? 0,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0,
      accuracyMeters: (json['accuracyMeters'] as num?)?.toDouble(),
      geofenceValid: json['geofenceValid'] as bool? ?? false,
      geofenceDistanceMeters: (json['geofenceDistanceMeters'] as num?)?.toDouble(),
      geofenceRadiusMeters: (json['geofenceRadiusMeters'] as num?)?.toDouble(),
      geofenceSiteId: json['geofenceSiteId'] as String?,
      deviceInfo: Map<String, dynamic>.from(
        json['deviceInfo'] as Map? ?? const {},
      ),
      notes: json['notes'] as String?,
      beforePhotoFileNames: (json['beforePhotoFileNames'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          const [],
      afterPhotoFileNames: (json['afterPhotoFileNames'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          const [],
      voiceNoteFileName: json['voiceNoteFileName'] as String?,
      videoFileName: json['videoFileName'] as String?,
    );
  }

  /// Lightweight stamp for planner checklist taps (time-only, no site proof).
  factory SubtaskCompletionRecord.timestampOnly({
    required DateTime completedAt,
    String employeeId = '',
    String employeeName = '',
  }) {
    return SubtaskCompletionRecord(
      completedAt: completedAt.toUtc().toIso8601String(),
      employeeId: employeeId,
      employeeName: employeeName,
      latitude: 0,
      longitude: 0,
      geofenceValid: false,
      deviceInfo: const {},
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'completedAt': completedAt,
      'employeeId': employeeId,
      'employeeName': employeeName,
      if (employeeEmail != null) 'employeeEmail': employeeEmail,
      'latitude': latitude,
      'longitude': longitude,
      if (accuracyMeters != null) 'accuracyMeters': accuracyMeters,
      'geofenceValid': geofenceValid,
      if (geofenceDistanceMeters != null) 'geofenceDistanceMeters': geofenceDistanceMeters,
      if (geofenceRadiusMeters != null) 'geofenceRadiusMeters': geofenceRadiusMeters,
      if (geofenceSiteId != null) 'geofenceSiteId': geofenceSiteId,
      'deviceInfo': deviceInfo,
      if (notes != null && notes!.isNotEmpty) 'notes': notes,
      if (beforePhotoFileNames.isNotEmpty) 'beforePhotoFileNames': beforePhotoFileNames,
      if (afterPhotoFileNames.isNotEmpty) 'afterPhotoFileNames': afterPhotoFileNames,
      if (voiceNoteFileName != null) 'voiceNoteFileName': voiceNoteFileName,
      if (videoFileName != null) 'videoFileName': videoFileName,
    };
  }
}
