import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:equatable/equatable.dart';

class ApiException extends Equatable implements Exception {
  const ApiException({
    required this.message,
    this.statusCode,
    this.isNetwork = false,
    this.isRateLimited = false,
  });

  final String message;
  final int? statusCode;
  final bool isNetwork;
  final bool isRateLimited;

  factory ApiException.fromDio(DioException error) {
    final status = error.response?.statusCode;
    final data = error.response?.data;

    if (error.type == DioExceptionType.connectionError ||
        error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.sendTimeout) {
      return const ApiException(
        message: 'Network error. Check your connection and API URL.',
        isNetwork: true,
      );
    }

    if (status == 429) {
      return const ApiException(
        message: 'Too many requests. Please wait and try again.',
        statusCode: 429,
        isRateLimited: true,
      );
    }

    final message = _extractMessage(data) ??
        _extractMessageFromBytes(data) ??
        _friendlyHttpMessage(status) ??
        'Something went wrong. Please try again.';

    return ApiException(message: message, statusCode: status);
  }

  static String? _friendlyHttpMessage(int? status) {
    return switch (status) {
      400 => 'Could not open this attachment.',
      401 => 'Your session expired. Please sign in again.',
      403 => 'You do not have permission to view this attachment.',
      404 => 'Attachment not found.',
      _ => null,
    };
  }

  static String? _extractMessageFromBytes(Object? data) {
    if (data is Uint8List) {
      return _extractMessageFromText(String.fromCharCodes(data));
    }
    if (data is List<int>) {
      return _extractMessageFromText(String.fromCharCodes(data));
    }
    return null;
  }

  static String? _extractMessageFromText(String raw) {
    final trimmed = raw.trim();
    if (!trimmed.startsWith('{')) return null;
    try {
      final decoded = jsonDecode(trimmed);
      return _extractMessage(decoded);
    } catch (_) {
      final match = RegExp(r'"message"\s*:\s*"([^"]+)"').firstMatch(trimmed);
      return match?.group(1);
    }
  }

  static String? _extractMessage(Object? data) {
    if (data is Map<String, dynamic>) {
      final raw = data['message'];
      if (raw is String && raw.trim().isNotEmpty) return raw;
      if (raw is List && raw.isNotEmpty) {
        final first = raw.first;
        if (first is String && first.trim().isNotEmpty) return first;
      }
    }
    return null;
  }

  @override
  List<Object?> get props => [message, statusCode, isNetwork, isRateLimited];

  @override
  String toString() => message;
}
