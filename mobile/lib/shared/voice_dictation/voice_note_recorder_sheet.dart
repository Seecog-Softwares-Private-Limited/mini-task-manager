import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/utils/blob_url_bytes.dart';
import '../../core/utils/client_id.dart';
import '../../core/utils/read_file_bytes.dart';
import '../../data/models/pending_attachment.dart';
import '../../features/kanban/voice_note_player.dart';
import '../../shared/widgets/app_widgets.dart';
import 'voice_waveform.dart';

/// Popup recorder: shows recording status → Done attaches the audio.
Future<PendingAttachment?> showVoiceNoteRecorderSheet(BuildContext context) {
  FocusManager.instance.primaryFocus?.unfocus();
  return showDialog<PendingAttachment>(
    context: context,
    barrierDismissible: false,
    useRootNavigator: true,
    builder: (context) => const _VoiceNoteRecorderDialog(),
  );
}

/// Popup player for a pending (not yet uploaded) voice note.
Future<void> showPendingVoiceNotePlayerDialog(
  BuildContext context, {
  required PendingAttachment attachment,
  VoidCallback? onReRecord,
  VoidCallback? onRemove,
}) {
  FocusManager.instance.primaryFocus?.unfocus();
  final bytes = attachment.bytes;
  if (bytes == null || bytes.isEmpty) {
    return showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Voice note'),
        content: const Text('This voice note has no audio data to play.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  return showDialog<void>(
    context: context,
    builder: (context) => AlertDialog(
      title: const Text('Voice note'),
      content: VoiceNotePlayer(
        bytes: bytes,
        mimeType: attachment.mimeType ?? 'audio/mp4',
        fileName: attachment.fileName,
        compact: true,
      ),
      actions: [
        if (onRemove != null)
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              onRemove();
            },
            child: const Text('Remove'),
          ),
        if (onReRecord != null)
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              onReRecord();
            },
            child: const Text('Re-record'),
          ),
        FilledButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Close'),
        ),
      ],
    ),
  );
}

class _VoiceNoteRecorderDialog extends StatefulWidget {
  const _VoiceNoteRecorderDialog();

  @override
  State<_VoiceNoteRecorderDialog> createState() => _VoiceNoteRecorderDialogState();
}

class _VoiceNoteRecorderDialogState extends State<_VoiceNoteRecorderDialog> {
  final _recorder = AudioRecorder();

  Timer? _timer;
  StreamSubscription<Amplitude>? _ampSub;
  Duration _elapsed = Duration.zero;
  double _soundLevel = 0;
  bool _recording = false;
  bool _starting = true;
  bool _saving = false;
  String? _error;
  String? _path;

  @override
  void initState() {
    super.initState();
    _start();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _ampSub?.cancel();
    _recorder.dispose();
    super.dispose();
  }

  Future<void> _start() async {
    setState(() {
      _starting = true;
      _error = null;
    });

    try {
      final hasPermission = await _recorder.hasPermission();
      if (!hasPermission) {
        if (!mounted) return;
        setState(() {
          _starting = false;
          _error = 'Microphone permission is required to record voice notes.';
        });
        return;
      }

      final stamp = DateTime.now().toIso8601String().replaceAll(':', '-');
      // Chrome MediaRecorder supports opus/webm; AAC/m4a is for iOS/Android.
      final encoder = kIsWeb ? AudioEncoder.opus : AudioEncoder.aacLc;
      final ext = kIsWeb ? 'webm' : 'm4a';
      final String path;
      if (kIsWeb) {
        path = 'voice-$stamp.$ext';
      } else {
        final dir = await getTemporaryDirectory();
        path = '${dir.path}/voice-$stamp.$ext';
      }

      await _recorder.start(
        RecordConfig(encoder: encoder),
        path: path,
      );

      _path = path;
      _ampSub = _recorder
          .onAmplitudeChanged(const Duration(milliseconds: 80))
          .listen((amp) {
        if (!mounted) return;
        final normalized = ((amp.current + 45) / 45).clamp(0.0, 1.0);
        setState(() => _soundLevel = normalized);
      });

      _timer = Timer.periodic(const Duration(seconds: 1), (_) {
        if (!mounted) return;
        setState(() => _elapsed += const Duration(seconds: 1));
      });

      if (!mounted) return;
      setState(() {
        _starting = false;
        _recording = true;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _starting = false;
        _recording = false;
        _error = 'Could not start recording. Check microphone permissions.';
      });
    }
  }

  Future<void> _cancel() async {
    try {
      if (await _recorder.isRecording()) {
        await _recorder.stop();
      }
    } catch (_) {}
    if (!mounted) return;
    Navigator.pop(context);
  }

  Future<void> _done() async {
    if (_saving) return;
    setState(() => _saving = true);
    try {
      final path = await _recorder.stop() ?? _path;
      _timer?.cancel();
      await _ampSub?.cancel();

      if (path == null || path.isEmpty) {
        if (!mounted) return;
        setState(() {
          _saving = false;
          _error = 'No recording was captured.';
        });
        return;
      }

      final recorded = await _readRecording(path);
      if (recorded.bytes.isEmpty) {
        if (!mounted) return;
        setState(() {
          _saving = false;
          _error = 'Recording was empty.';
        });
        return;
      }

      final stamp = DateTime.now().toIso8601String().replaceAll(':', '-');
      final mime = recorded.mimeType;
      final ext = mime.contains('webm')
          ? 'webm'
          : mime.contains('wav')
              ? 'wav'
              : mime.contains('ogg')
                  ? 'ogg'
                  : 'm4a';
      final bytes = Uint8List.fromList(recorded.bytes);
      final attachment = PendingAttachment(
        clientId: generateClientId(),
        fileName: 'voice-$stamp.$ext',
        bytes: bytes,
        path: kIsWeb ? null : path,
        mimeType: mime,
      );

      if (!mounted) return;
      Navigator.pop(context, attachment);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _saving = false;
        _error = 'Could not save recording.';
      });
    }
  }

  Future<({Uint8List bytes, String mimeType})> _readRecording(String path) async {
    if (kIsWeb || path.startsWith('blob:')) {
      final data = await fetchBlobUrlAudio(path);
      return (bytes: data.bytes, mimeType: data.mimeType);
    }
    final bytes = await readFileBytes(path);
    return (bytes: bytes, mimeType: 'audio/mp4');
  }

  String _formatElapsed(Duration d) {
    final m = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final s = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Row(
        children: [
          Container(
            width: 12,
            height: 12,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: _recording ? AppColors.danger : AppColors.textMuted,
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Text(
              _starting
                  ? 'Starting...'
                  : _recording
                      ? 'Recording happening'
                      : 'Voice note',
            ),
          ),
          Text(
            _formatElapsed(_elapsed),
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  color: AppColors.textMuted,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
          ),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          VoiceWaveform(
            level: _soundLevel,
            active: _recording && !_starting,
            height: 56,
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            _recording
                ? 'Speak now. Tap Done to attach this voice note.'
                : (_error ?? 'Waiting for microphone...'),
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: _error != null ? AppColors.danger : AppColors.textMuted,
                ),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: _saving ? null : _cancel,
          child: const Text('Cancel'),
        ),
        PrimaryButton(
          label: _saving ? 'Saving...' : 'Done',
          expand: false,
          loading: _saving,
          onPressed: (_recording && !_starting && !_saving) ? _done : null,
        ),
      ],
    );
  }
}
