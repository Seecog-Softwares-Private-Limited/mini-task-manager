"use client";

import * as React from "react";
import { Mic } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  buildVoiceNoteFileName,
  formatRecordingElapsed,
  pickVoiceNoteMimeType,
} from "@/lib/voice-note-recording";

interface VoiceNoteRecorderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecorded: (file: File) => void;
}

const BAR_COUNT = 28;

export function VoiceNoteRecorderDialog({
  open,
  onOpenChange,
  onRecorded,
}: VoiceNoteRecorderDialogProps) {
  const [starting, setStarting] = React.useState(false);
  const [recording, setRecording] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [elapsed, setElapsed] = React.useState(0);
  const [level, setLevel] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const chunksRef = React.useRef<BlobPart[]>([]);
  const mimeRef = React.useRef({ mimeType: "audio/webm", extension: "webm" });
  const startedAtRef = React.useRef<number>(0);
  const timerRef = React.useRef<number | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const analyserRef = React.useRef<AnalyserNode | null>(null);
  const audioCtxRef = React.useRef<AudioContext | null>(null);

  const cleanup = React.useCallback(() => {
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (rafRef.current != null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    try {
      mediaRecorderRef.current?.stop();
    } catch {
      /* already stopped */
    }
    mediaRecorderRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void audioCtxRef.current?.close().catch(() => undefined);
    audioCtxRef.current = null;
    analyserRef.current = null;
    chunksRef.current = [];
  }, []);

  React.useEffect(() => {
    if (!open) {
      cleanup();
      setStarting(false);
      setRecording(false);
      setSaving(false);
      setElapsed(0);
      setLevel(0);
      setError(null);
      return;
    }

    let cancelled = false;

    const start = async () => {
      setStarting(true);
      setError(null);
      try {
        if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
          throw new Error("Microphone recording is not supported in this browser.");
        }
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        const picked = pickVoiceNoteMimeType();
        mimeRef.current = {
          mimeType: picked.mimeType || "audio/webm",
          extension: picked.extension,
        };

        const recorder = picked.mimeType
          ? new MediaRecorder(stream, { mimeType: picked.mimeType })
          : new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        chunksRef.current = [];

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunksRef.current.push(event.data);
        };

        const AudioContextCtor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioContextCtor) {
          const ctx = new AudioContextCtor();
          audioCtxRef.current = ctx;
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          analyserRef.current = analyser;

          const data = new Uint8Array(analyser.frequencyBinCount);
          const tick = () => {
            analyser.getByteFrequencyData(data);
            let sum = 0;
            for (let i = 0; i < data.length; i++) sum += data[i]!;
            const next = Math.min(1, sum / (data.length * 180));
            setLevel(next);
            rafRef.current = window.requestAnimationFrame(tick);
          };
          rafRef.current = window.requestAnimationFrame(tick);
        }

        recorder.start(250);
        startedAtRef.current = Date.now();
        timerRef.current = window.setInterval(() => {
          setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
        }, 250);

        if (!cancelled) {
          setStarting(false);
          setRecording(true);
        }
      } catch (err) {
        if (cancelled) return;
        cleanup();
        setStarting(false);
        setRecording(false);
        setError(
          err instanceof Error
            ? err.message
            : "Could not start recording. Check microphone permissions."
        );
      }
    };

    void start();
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [open, cleanup]);

  const handleCancel = () => {
    cleanup();
    onOpenChange(false);
  };

  const handleDone = async () => {
    if (saving) return;
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      setError("No recording was captured.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        recorder.onstop = () => {
          const type =
            recorder.mimeType || mimeRef.current.mimeType || "audio/webm";
          const parts = chunksRef.current;
          if (!parts.length) {
            reject(new Error("Recording was empty."));
            return;
          }
          resolve(new Blob(parts, { type: type.split(";")[0] }));
        };
        recorder.onerror = () => reject(new Error("Recording failed."));
        try {
          recorder.stop();
        } catch (err) {
          reject(err instanceof Error ? err : new Error("Could not stop recording."));
        }
      });

      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;

      if (blob.size === 0) {
        setSaving(false);
        setError("Recording was empty.");
        return;
      }

      const ext =
        blob.type.includes("mp4") || blob.type.includes("aac")
          ? "m4a"
          : blob.type.includes("ogg")
            ? "ogg"
            : mimeRef.current.extension || "webm";
      const file = new File([blob], buildVoiceNoteFileName(ext), {
        type: blob.type || `audio/${ext === "m4a" ? "mp4" : ext}`,
      });

      cleanup();
      onRecorded(file);
      onOpenChange(false);
    } catch (err) {
      setSaving(false);
      setError(err instanceof Error ? err.message : "Could not save recording.");
    }
  };

  const bars = Array.from({ length: BAR_COUNT }, (_, i) => {
    const wave = Math.sin(i * 0.55 + elapsed * 2.2);
    const height = recording
      ? 18 + Math.abs(wave) * 22 + level * 36
      : 14 + (i % 3) * 4;
    return height;
  });

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? handleCancel() : onOpenChange(next))}>
      <DialogContent className="sm:max-w-md" showClose={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span
              className={cn(
                "inline-block h-2.5 w-2.5 rounded-full",
                recording ? "bg-destructive animate-pulse" : "bg-muted-foreground/50"
              )}
            />
            {starting ? "Starting…" : recording ? "Recording happening" : "Voice note"}
            <span className="ml-auto text-sm font-medium tabular-nums text-muted-foreground">
              {formatRecordingElapsed(elapsed)}
            </span>
          </DialogTitle>
          <DialogDescription>
            Speak into your microphone, then tap Done to attach the voice note.
          </DialogDescription>
        </DialogHeader>

        <div className="flex h-20 items-end justify-center gap-1 rounded-xl bg-muted/30 px-3 py-3">
          {bars.map((height, index) => (
            <span
              key={index}
              className="w-1.5 rounded-full bg-primary/80 transition-[height] duration-100"
              style={{ height }}
            />
          ))}
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={handleCancel} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleDone()}
            disabled={starting || !recording || saving}
          >
            <Mic className="mr-1.5 h-4 w-4" />
            {saving ? "Saving…" : "Done"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
