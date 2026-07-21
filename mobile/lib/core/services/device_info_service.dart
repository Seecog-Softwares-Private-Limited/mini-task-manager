import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:package_info_plus/package_info_plus.dart';

class DeviceInfoService {
  static Future<Map<String, dynamic>> capture() async {
    final plugin = DeviceInfoPlugin();
    final packageInfo = await PackageInfo.fromPlatform();
    final base = <String, dynamic>{
      'appVersion': packageInfo.version,
      'buildNumber': packageInfo.buildNumber,
      'packageName': packageInfo.packageName,
      'platform': defaultTargetPlatform.name,
    };

    try {
      if (kIsWeb) {
        final web = await plugin.webBrowserInfo;
        return {
          ...base,
          'browserName': web.browserName.name,
          'userAgent': web.userAgent,
          'vendor': web.vendor,
        };
      }

      if (defaultTargetPlatform == TargetPlatform.android) {
        final android = await plugin.androidInfo;
        return {
          ...base,
          'deviceId': android.id,
          'model': android.model,
          'manufacturer': android.manufacturer,
          'osVersion': android.version.release,
          'sdkInt': android.version.sdkInt,
        };
      }

      if (defaultTargetPlatform == TargetPlatform.iOS) {
        final ios = await plugin.iosInfo;
        return {
          ...base,
          'deviceId': ios.identifierForVendor,
          'model': ios.model,
          'systemName': ios.systemName,
          'osVersion': ios.systemVersion,
        };
      }
    } catch (_) {
      // Fall through to base info so completion can still proceed.
    }

    return base;
  }
}
