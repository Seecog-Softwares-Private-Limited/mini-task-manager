import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:equatable/equatable.dart';
import 'package:flutter/foundation.dart';

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
    final path = error.requestOptions.path;
    final isAuthAttempt = path.contains('/auth/login') ||
        path.contains('/auth/signup') ||
        path.contains('/auth/forgot-password') ||
        path.contains('/auth/reset-password');

    if (error.type == DioExceptionType.connectionError ||
        error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.sendTimeout) {
      final target = error.requestOptions.uri.toString();
      final isLocal = target.contains('localhost') || target.contains('127.0.0.1');
      return ApiException(
        message: kIsWeb
            ? (isLocal
                ? 'Network error. Could not reach $target. For local Nest use http://localhost:3007, or set your VPS URL in Server settings (e.g. http://200.97.172.61:3000).'
                : 'Network error. Could not reach $target. Check Server settings URL, CORS on the API, and that the VPS is up.')
            : isLocal
                ? 'Network error. Could not reach $target. Start local API with: node app.js — or tap "Use production server" below.'
                : 'Network error. Could not reach $target. Open Server settings → Test connection.',
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
        (isAuthAttempt ? _friendlyAuthMessage(status) : null) ??
        _friendlyHttpMessage(status) ??
        'Something went wrong. Please try again.';

    return ApiException(message: message, statusCode: status);
  }

  static String? _friendlyAuthMessage(int? status) {
    return switch (status) {
      401 => 'Invalid email or password.',
      403 => 'You do not have permission to sign in.',
      _ => null,
    };
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
