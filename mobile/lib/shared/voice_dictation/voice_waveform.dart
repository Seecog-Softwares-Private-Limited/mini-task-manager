import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';

/// Animated audio waveform driven by microphone sound level (0.0–1.0).
class VoiceWaveform extends StatefulWidget {
  const VoiceWaveform({
    super.key,
    required this.level,
    required this.active,
    this.barCount = 32,
    this.height = 72,
  });

  final double level;
  final bool active;
  final int barCount;
  final double height;

  @override
  State<VoiceWaveform> createState() => _VoiceWaveformState();
}

class _VoiceWaveformState extends State<VoiceWaveform> with SingleTickerProviderStateMixin {
  late final AnimationController _pulse;

  @override
  void initState() {
    super.initState();
    _pulse = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat();
  }

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _pulse,
      builder: (context, _) {
        return SizedBox(
          height: widget.height,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: List.generate(widget.barCount, (index) {
              final phase = (index / widget.barCount) * math.pi * 2;
              final idle = widget.active
                  ? 0.12 + 0.08 * math.sin(_pulse.value * math.pi * 2 + phase)
                  : 0.08;
              final driven = widget.active ? widget.level * (0.55 + 0.45 * math.sin(phase)) : 0;
              final normalized = (idle + driven).clamp(0.06, 1.0);
              return Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 1.5),
                  child: Align(
                    alignment: Alignment.center,
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 80),
                      curve: Curves.easeOut,
                      height: widget.height * normalized,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(999),
                        gradient: LinearGradient(
                          begin: Alignment.bottomCenter,
                          end: Alignment.topCenter,
                          colors: widget.active
                              ? [
                                  AppColors.primary.withValues(alpha: 0.55),
                                  AppColors.primary,
                                  AppColors.primaryGradientEnd,
                                ]
                              : [
                                  AppColors.border,
                                  AppColors.textMuted.withValues(alpha: 0.45),
                                ],
                        ),
                      ),
                    ),
                  ),
                ),
              );
            }),
          ),
        );
      },
    );
  }
}
