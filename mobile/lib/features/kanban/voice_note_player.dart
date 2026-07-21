import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import 'attachment_blob_url.dart';

/// WhatsApp-style voice note player for audio attachment bytes.
class VoiceNotePlayer extends StatefulWidget {
  const VoiceNotePlayer({
    super.key,
    required this.bytes,
    required this.mimeType,
    required this.fileName,
    this.compact = false,
  });

  final Uint8List bytes;
  final String mimeType;
  final String fileName;
  final bool compact;

  @override
  State<VoiceNotePlayer> createState() => _VoiceNotePlayerState();
}

class _VoiceNotePlayerState extends State<VoiceNotePlayer> {
  final _player = AudioPlayer();
  Duration _position = Duration.zero;
  Duration _duration = Duration.zero;
  bool _playing = false;
  bool _ready = false;
  String? _error;
  String? _blobUrl;

  @override
  void initState() {
    super.initState();
    _init();
  }

  @override
  void dispose() {
    _player.dispose();
    revokeAttachmentBlobUrl(_blobUrl);
    super.dispose();
  }

  List<String> get _mimeCandidates {
    final primary = widget.mimeType.trim().isEmpty
        ? 'audio/webm'
        : widget.mimeType.trim();
    final lowerName = widget.fileName.toLowerCase();
    final fromName = lowerName.endsWith('.webm')
        ? 'audio/webm'
        : lowerName.endsWith('.ogg')
            ? 'audio/ogg'
            : lowerName.endsWith('.wav')
                ? 'audio/wav'
                : lowerName.endsWith('.mp3')
                    ? 'audio/mpeg'
                    : lowerName.endsWith('.m4a') || lowerName.endsWith('.aac')
                        ? 'audio/mp4'
                        : null;

    return <String>{
      primary,
      if (fromName != null) fromName,
      'audio/webm',
      'audio/webm;codecs=opus',
      'audio/ogg',
      'audio/mp4',
      'audio/mpeg',
      'audio/wav',
    }.toList();
  }

  Future<void> _init() async {
    try {
      await _player.setReleaseMode(ReleaseMode.stop);
      _player.onDurationChanged.listen((d) {
        if (mounted) setState(() => _duration = d);
      });
      _player.onPositionChanged.listen((p) {
        if (mounted) setState(() => _position = p);
      });
      _player.onPlayerComplete.listen((_) {
        if (mounted) {
          setState(() {
            _playing = false;
            _position = Duration.zero;
          });
        }
      });
      _player.onPlayerStateChanged.listen((state) {
        if (!mounted) return;
        setState(() => _playing = state == PlayerState.playing);
      });

      Object? lastError;
      for (final mime in _mimeCandidates) {
        try {
          await _loadWithMime(mime);
          if (!mounted) return;
          setState(() {
            _ready = true;
            _error = null;
          });
          return;
        } catch (e) {
          lastError = e;
          revokeAttachmentBlobUrl(_blobUrl);
          _blobUrl = null;
        }
      }

      if (!mounted) return;
      setState(() {
        _error = kDebugMode
            ? 'Could not play this voice note. $lastError'
            : 'Could not play this voice note.';
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = kDebugMode
            ? 'Could not play this voice note. $e'
            : 'Could not play this voice note.';
      });
    }
  }

  Future<void> _loadWithMime(String mime) async {
    if (kIsWeb) {
      final url = createAttachmentBlobUrl(widget.bytes, mime);
      if (url == null) {
        throw StateError('Could not create audio blob URL');
      }
      _blobUrl = url;
      await _player.setSourceUrl(url, mimeType: mime);
      return;
    }

    await _player.setSourceBytes(widget.bytes, mimeType: mime);
  }

  Future<void> _toggle() async {
    if (!_ready) return;
    if (_playing) {
      await _player.pause();
      return;
    }
    // After setSource, resume may not start on web — use play/resume safely.
    try {
      await _player.resume();
    } catch (_) {
      if (_blobUrl != null) {
        await _player.play(UrlSource(_blobUrl!));
      } else {
        await _player.play(BytesSource(widget.bytes, mimeType: widget.mimeType));
      }
    }
  }

  String _fmt(Duration d) {
    final m = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final s = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null) {
      return Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Text(
          _error!,
          style: TextStyle(
            color: widget.compact ? AppColors.danger : Colors.white70,
          ),
        ),
      );
    }

    final totalMs = _duration.inMilliseconds <= 0 ? 1 : _duration.inMilliseconds;
    final progress = (_position.inMilliseconds / totalMs).clamp(0.0, 1.0);
    final surface = widget.compact ? const Color(0xFFF1F5F9) : const Color(0xFF1F2C34);
    final secondary = widget.compact ? AppColors.textMuted : Colors.white70;
    final trackInactive = widget.compact ? AppColors.border : Colors.white24;
    final thumb = widget.compact ? AppColors.primary : Colors.white;

    return Padding(
      padding: EdgeInsets.all(widget.compact ? 0 : AppSpacing.lg),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: surface,
          borderRadius: BorderRadius.circular(18),
        ),
        child: Row(
          children: [
            Material(
              color: AppColors.primary,
              shape: const CircleBorder(),
              child: InkWell(
                customBorder: const CircleBorder(),
                onTap: _ready ? _toggle : null,
                child: SizedBox(
                  width: 48,
                  height: 48,
                  child: !_ready
                      ? const Padding(
                          padding: EdgeInsets.all(12),
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : Icon(
                          _playing ? Icons.pause_rounded : Icons.play_arrow_rounded,
                          color: Colors.white,
                          size: 28,
                        ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SliderTheme(
                    data: SliderTheme.of(context).copyWith(
                      trackHeight: 3,
                      thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 6),
                      overlayShape: const RoundSliderOverlayShape(overlayRadius: 12),
                      activeTrackColor: AppColors.primary,
                      inactiveTrackColor: trackInactive,
                      thumbColor: thumb,
                    ),
                    child: Slider(
                      value: progress,
                      onChanged: !_ready
                          ? null
                          : (v) {
                              final next = Duration(
                                milliseconds: (v * totalMs).round(),
                              );
                              _player.seek(next);
                              setState(() => _position = next);
                            },
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    child: Row(
                      children: [
                        Text(
                          _fmt(_position),
                          style: TextStyle(color: secondary, fontSize: 12),
                        ),
                        const Spacer(),
                        Text(
                          _fmt(_duration),
                          style: TextStyle(color: secondary, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Icon(Icons.mic_rounded, color: secondary, size: 22),
          ],
        ),
      ),
    );
  }
}
