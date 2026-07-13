import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';

const double kAvatarCropViewport = 280;
const double kAvatarCropCircle = 240;
const int kAvatarCropOutput = 512;
const double _minZoom = 1;
const double _maxZoom = 3;

/// Full-screen crop route matching web avatar crop (drag to pan + zoom → 512 PNG).
Future<Uint8List?> showAvatarCropSheet({
  required BuildContext context,
  required Uint8List imageBytes,
}) {
  return Navigator.of(context).push<Uint8List>(
    PageRouteBuilder<Uint8List>(
      opaque: true,
      barrierDismissible: false,
      transitionDuration: const Duration(milliseconds: 220),
      reverseTransitionDuration: const Duration(milliseconds: 180),
      pageBuilder: (context, animation, secondaryAnimation) {
        return _AvatarCropSheet(imageBytes: imageBytes);
      },
      transitionsBuilder: (context, animation, secondaryAnimation, child) {
        return FadeTransition(
          opacity: animation,
          child: SlideTransition(
            position: Tween<Offset>(
              begin: const Offset(0, 0.04),
              end: Offset.zero,
            ).animate(CurvedAnimation(parent: animation, curve: Curves.easeOutCubic)),
            child: child,
          ),
        );
      },
    ),
  );
}

class _AvatarCropSheet extends StatefulWidget {
  const _AvatarCropSheet({required this.imageBytes});

  final Uint8List imageBytes;

  @override
  State<_AvatarCropSheet> createState() => _AvatarCropSheetState();
}

class _AvatarCropSheetState extends State<_AvatarCropSheet> {
  ui.Image? _image;
  double _zoom = 1;
  Offset _pan = Offset.zero;
  bool _saving = false;
  String? _error;

  /// Raw pointer tracking so one-finger drag always pans (sheet/scroll can't steal it).
  int? _panPointer;
  Offset? _lastPanLocal;
  final Map<int, Offset> _pointers = {};
  double? _pinchStartDistance;
  double _zoomAtPinchStart = 1;

  @override
  void initState() {
    super.initState();
    _decode();
  }

  @override
  void dispose() {
    _image?.dispose();
    super.dispose();
  }

  Future<void> _decode() async {
    try {
      final codec = await ui.instantiateImageCodec(widget.imageBytes);
      final frame = await codec.getNextFrame();
      if (!mounted) {
        frame.image.dispose();
        return;
      }
      setState(() {
        _image = frame.image;
        _zoom = 1;
        _pan = Offset.zero;
        _error = null;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = 'Could not load this image.');
    }
  }

  double get _baseScale {
    final image = _image;
    if (image == null) return 1;
    return math.min(
      kAvatarCropViewport / image.width,
      kAvatarCropViewport / image.height,
    );
  }

  double get _scale => _baseScale * _zoom;

  Size get _displaySize {
    final image = _image;
    if (image == null) return Size.zero;
    return Size(image.width * _scale, image.height * _scale);
  }

  void _onPointerDown(PointerDownEvent event) {
    _pointers[event.pointer] = event.localPosition;
    if (_pointers.length == 1) {
      _panPointer = event.pointer;
      _lastPanLocal = event.localPosition;
      _pinchStartDistance = null;
    } else if (_pointers.length == 2) {
      _panPointer = null;
      _lastPanLocal = null;
      final points = _pointers.values.toList();
      _pinchStartDistance = (points[0] - points[1]).distance;
      _zoomAtPinchStart = _zoom;
    }
  }

  void _onPointerMove(PointerMoveEvent event) {
    if (!_pointers.containsKey(event.pointer)) return;
    _pointers[event.pointer] = event.localPosition;

    if (_pointers.length == 1 &&
        _panPointer == event.pointer &&
        _lastPanLocal != null) {
      final delta = event.localPosition - _lastPanLocal!;
      _lastPanLocal = event.localPosition;
      setState(() => _pan += delta);
      return;
    }

    if (_pointers.length >= 2 && _pinchStartDistance != null) {
      final points = _pointers.values.toList();
      final distance = (points[0] - points[1]).distance;
      if (_pinchStartDistance! > 0) {
        final nextZoom = (_zoomAtPinchStart * (distance / _pinchStartDistance!))
            .clamp(_minZoom, _maxZoom);
        setState(() => _zoom = nextZoom);
      }
    }
  }

  void _onPointerUp(PointerEvent event) {
    _pointers.remove(event.pointer);
    if (_panPointer == event.pointer) {
      _panPointer = null;
      _lastPanLocal = null;
    }
    if (_pointers.length < 2) {
      _pinchStartDistance = null;
    }
    if (_pointers.length == 1) {
      final remaining = _pointers.entries.first;
      _panPointer = remaining.key;
      _lastPanLocal = remaining.value;
    }
  }

  Future<void> _confirm() async {
    final image = _image;
    if (image == null || _saving) return;
    setState(() => _saving = true);
    try {
      final bytes = await _exportCroppedPng(image);
      if (bytes.lengthInBytes > 2 * 1024 * 1024) {
        if (!mounted) return;
        setState(() {
          _saving = false;
          _error = 'Cropped image must be 2 MB or smaller.';
        });
        return;
      }
      if (!mounted) return;
      Navigator.of(context).pop(bytes);
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _saving = false;
        _error = 'Could not crop this image.';
      });
    }
  }

  Future<Uint8List> _exportCroppedPng(ui.Image image) async {
    final scale = _scale;
    final display = _displaySize;
    final left = kAvatarCropViewport / 2 - display.width / 2 + _pan.dx;
    final top = kAvatarCropViewport / 2 - display.height / 2 + _pan.dy;

    final sx = (0 - left) / scale;
    final sy = (0 - top) / scale;
    final sw = kAvatarCropViewport / scale;
    final sh = kAvatarCropViewport / scale;

    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder);
    final src = Rect.fromLTWH(sx, sy, sw, sh);
    final dst = Rect.fromLTWH(
      0,
      0,
      kAvatarCropOutput.toDouble(),
      kAvatarCropOutput.toDouble(),
    );
    canvas.drawImageRect(image, src, dst, Paint()..filterQuality = FilterQuality.high);
    final picture = recorder.endRecording();
    final out = await picture.toImage(kAvatarCropOutput, kAvatarCropOutput);
    final data = await out.toByteData(format: ui.ImageByteFormat.png);
    out.dispose();
    picture.dispose();
    if (data == null) {
      throw StateError('Failed to encode cropped image');
    }
    return data.buffer.asUint8List();
  }

  @override
  Widget build(BuildContext context) {
    final display = _displaySize;
    final imageLeft = kAvatarCropViewport / 2 - display.width / 2 + _pan.dx;
    final imageTop = kAvatarCropViewport / 2 - display.height / 2 + _pan.dy;

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: Scaffold(
        backgroundColor: const Color(0xFF0B1220),
        body: SafeArea(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 12, 12, 8),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Crop photo',
                            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w700,
                                ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Drag to reposition · pinch or use zoom',
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: Colors.white60,
                                ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      onPressed: _saving ? null : () => Navigator.of(context).pop(),
                      icon: const Icon(Icons.close_rounded, color: Colors.white70),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: Center(
                  child: _image == null
                      ? const CircularProgressIndicator(color: Colors.white)
                      : Listener(
                          behavior: HitTestBehavior.opaque,
                          onPointerDown: _onPointerDown,
                          onPointerMove: _onPointerMove,
                          onPointerUp: _onPointerUp,
                          onPointerCancel: _onPointerUp,
                          child: SizedBox(
                            width: kAvatarCropViewport,
                            height: kAvatarCropViewport,
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(20),
                              child: Stack(
                                clipBehavior: Clip.hardEdge,
                                children: [
                                  Container(color: const Color(0xFF111827)),
                                  Positioned(
                                    left: imageLeft,
                                    top: imageTop,
                                    width: display.width,
                                    height: display.height,
                                    child: RawImage(
                                      image: _image,
                                      fit: BoxFit.fill,
                                      filterQuality: FilterQuality.high,
                                    ),
                                  ),
                                  IgnorePointer(
                                    child: CustomPaint(
                                      size: const Size(
                                        kAvatarCropViewport,
                                        kAvatarCropViewport,
                                      ),
                                      painter: _CircleMaskPainter(
                                        circleSize: kAvatarCropCircle,
                                      ),
                                    ),
                                  ),
                                  IgnorePointer(
                                    child: Center(
                                      child: Container(
                                        width: kAvatarCropCircle,
                                        height: kAvatarCropCircle,
                                        decoration: BoxDecoration(
                                          shape: BoxShape.circle,
                                          border: Border.all(
                                            color: Colors.white.withValues(alpha: 0.95),
                                            width: 2,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 8),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: _saving
                          ? null
                          : () => setState(() {
                                _zoom = (_zoom - 0.1).clamp(_minZoom, _maxZoom);
                              }),
                      icon: const Icon(Icons.remove_circle_outline, color: Colors.white70),
                    ),
                    Expanded(
                      child: SliderTheme(
                        data: SliderTheme.of(context).copyWith(
                          activeTrackColor: AppColors.primary,
                          inactiveTrackColor: Colors.white24,
                          thumbColor: Colors.white,
                        ),
                        child: Slider(
                          value: _zoom,
                          min: _minZoom,
                          max: _maxZoom,
                          onChanged: _saving
                              ? null
                              : (value) => setState(() => _zoom = value),
                        ),
                      ),
                    ),
                    IconButton(
                      onPressed: _saving
                          ? null
                          : () => setState(() {
                                _zoom = (_zoom + 0.1).clamp(_minZoom, _maxZoom);
                              }),
                      icon: const Icon(Icons.add_circle_outline, color: Colors.white70),
                    ),
                  ],
                ),
              ),
              if (_error != null)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Text(
                    _error!,
                    style: const TextStyle(color: AppColors.danger),
                  ),
                ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
                child: Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: _saving ? null : () => Navigator.of(context).pop(),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.white,
                          side: const BorderSide(color: Colors.white24),
                          minimumSize: const Size.fromHeight(48),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        child: const Text('Cancel'),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: AppColors.primaryGradient,
                          borderRadius: BorderRadius.circular(14),
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.primary.withValues(alpha: 0.4),
                              blurRadius: 14,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: ElevatedButton(
                          onPressed: _image == null || _saving ? null : _confirm,
                          style: ElevatedButton.styleFrom(
                            elevation: 0,
                            backgroundColor: Colors.transparent,
                            shadowColor: Colors.transparent,
                            foregroundColor: Colors.white,
                            disabledBackgroundColor: Colors.transparent,
                            minimumSize: const Size.fromHeight(48),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                          ),
                          child: _saving
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : const Text(
                                  'Use photo',
                                  style: TextStyle(fontWeight: FontWeight.w700),
                                ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CircleMaskPainter extends CustomPainter {
  _CircleMaskPainter({required this.circleSize});

  final double circleSize;

  @override
  void paint(Canvas canvas, Size size) {
    final overlay = Path()..addRect(Offset.zero & size);
    final hole = Path()
      ..addOval(
        Rect.fromCenter(
          center: Offset(size.width / 2, size.height / 2),
          width: circleSize,
          height: circleSize,
        ),
      );
    final masked = Path.combine(PathOperation.difference, overlay, hole);
    canvas.drawPath(
      masked,
      Paint()..color = Colors.black.withValues(alpha: 0.55),
    );
  }

  @override
  bool shouldRepaint(covariant _CircleMaskPainter oldDelegate) =>
      oldDelegate.circleSize != circleSize;
}
