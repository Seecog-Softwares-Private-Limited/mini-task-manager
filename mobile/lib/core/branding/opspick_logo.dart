import 'package:flutter/material.dart';

import 'opspick_assets.dart';

/// Shared OpsPick mark — login, signup, and chrome.
class OpsPickLogo extends StatelessWidget {
  const OpsPickLogo({
    super.key,
    this.size = 52,
    this.borderRadius = 14,
  });

  final double size;
  final double borderRadius;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(borderRadius),
      child: Image.asset(
        OpsPickAssets.logo,
        width: size,
        height: size,
        fit: BoxFit.contain,
        filterQuality: FilterQuality.high,
        errorBuilder: (_, __, ___) => Image.asset(
          OpsPickAssets.logoAlias,
          width: size,
          height: size,
          fit: BoxFit.contain,
          filterQuality: FilterQuality.high,
          errorBuilder: (_, __, ___) => SizedBox(
            width: size,
            height: size,
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(borderRadius),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: const Icon(Icons.apps_rounded, color: Color(0xFF2563EB)),
            ),
          ),
        ),
      ),
    );
  }
}
