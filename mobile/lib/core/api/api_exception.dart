import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:equatable/equatable.dart';

/// Maps any thrown value to a short, non-technical message for the UI.
String userFacingError(
  Object? error, {
  String fallback = 'Something went wrong. Please try again.',
}) {
  if (error == null) return fallback;
  if (error is ApiException) return error.message;
  if (error is DioException) return ApiException.fromDio(error).message;
  if (error is FormatException) {
    return 'We could not read the server response. Please try again.';
  }
  final raw = error is Exception || error is Error
      ? error.toString()
      : '$error';
  return ApiException.sanitizeMessage(raw) ?? fallback;
}

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
      return const ApiException(
        message:
            'Cannot reach the server. Check your connection and try again.',
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

    final extracted = _extractMessage(data) ?? _extractMessageFromBytes(data);
    final sanitized = sanitizeMessage(extracted, statusCode: status);
    final message = sanitized ??
        (isAuthAttempt ? _friendlyAuthMessage(status) : null) ??
        _friendlyHttpMessage(status) ??
        'Something went wrong. Please try again.';

    return ApiException(message: message, statusCode: status);
  }

  /// Turn Nest / validator / SQL text into plain language, or null if unusable.
  static String? sanitizeMessage(String? raw, {int? statusCode}) {
    if (raw == null) return null;
    var text = raw.trim();
    if (text.isEmpty) return null;

    // Strip common Exception prefixes.
    text = text
        .replaceFirst(RegExp(r'^(ApiException|Exception|Error):\s*'), '')
        .trim();
    if (text.isEmpty) return null;

    final lower = text.toLowerCase();

    if (_looksTechnical(lower, text)) {
      return _friendlyHttpMessage(statusCode) ??
          'Something went wrong. Please try again.';
    }

    // Soften blunt HTTP phrases Nest sometimes returns.
    switch (lower) {
      case 'bad request':
      case 'bad request.':
        return 'Please check your input and try again.';
      case 'unauthorized':
      case 'unauthorized.':
        return 'Your session expired. Please sign in again.';
      case 'forbidden':
      case 'forbidden.':
        return 'You do not have permission to do that.';
      case 'not found':
      case 'not found.':
        return 'We could not find what you were looking for.';
      case 'internal server error':
      case 'internal server error.':
        return 'Something went wrong on our side. Please try again.';
    }

    // Already readable Nest messages (keep, but trim length).
    if (text.length > 180) {
      return '${text.substring(0, 177).trimRight()}…';
    }
    return text;
  }

  static bool _looksTechnical(String lower, String original) {
    if (original.contains('Instance of ')) return true;
    if (lower.contains('socketexception')) return true;
    if (lower.contains('dioexception')) return true;
    if (lower.contains('econnrefused') || lower.contains('econnreset')) {
      return true;
    }
    if (lower.contains('xmlhttprequest')) return true;
    if (lower.contains('queryfailed') || lower.contains('databaseerror')) {
      return true;
    }
    if (lower.contains('unknown column') || lower.contains('er_')) return true;
    if (lower.contains('sqlmessage') || lower.contains(' sql ')) return true;
    if (lower.contains('duplicate entry') && lower.contains('for key')) {
      return true;
    }
    if (RegExp(r'\bat\s+Object\.|\.dart:\d+|\.ts:\d+|stack trace', caseSensitive: false)
        .hasMatch(original)) {
      return true;
    }
    // class-validator style
    if (RegExp(
      r'\bmust be a (uuid|string|number|boolean|email|date)\b',
      caseSensitive: false,
    ).hasMatch(original)) {
      return true;
    }
    if (RegExp(
      r'\bshould not exist\b|\bmust be an? (array|object|integer)\b',
      caseSensitive: false,
    ).hasMatch(original)) {
      return true;
    }
    if (RegExp(r'^[a-zA-Z0-9_.\[\]]+\s+(must|should)\b').hasMatch(original)) {
      return true;
    }
    if (lower.startsWith('cannot get ') ||
        lower.startsWith('cannot post ') ||
        lower.startsWith('cannot patch ') ||
        lower.startsWith('cannot delete ')) {
      return true;
    }
    if (lower.contains('x-organization-id')) {
      return true;
    }
    if (lower.contains('nestjs') || lower.contains('typeorm')) return true;
    return false;
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
      400 => 'Please check your input and try again.',
      401 => 'Your session expired. Please sign in again.',
      403 => 'You do not have permission to do that.',
      404 => 'We could not find what you were looking for.',
      408 || 504 => 'The request timed out. Please try again.',
      409 => 'That conflicts with existing data. Please refresh and try again.',
      413 => 'That file is too large to upload.',
      422 => 'Please check your input and try again.',
      500 || 502 || 503 => 'Something went wrong on our side. Please try again.',
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
    if (data is Map) {
      final raw = data['message'];
      if (raw is String && raw.trim().isNotEmpty) return raw.trim();
      if (raw is List && raw.isNotEmpty) {
        final first = raw.first;
        if (first is String && first.trim().isNotEmpty) return first.trim();
        final joined = raw
            .whereType<String>()
            .map((s) => s.trim())
            .where((s) => s.isNotEmpty)
            .take(2)
            .join(' ');
        if (joined.isNotEmpty) return joined;
      }
    }
    return null;
  }

  @override
  List<Object?> get props => [message, statusCode, isNetwork, isRateLimited];

  @override
  String toString() => message;
}
