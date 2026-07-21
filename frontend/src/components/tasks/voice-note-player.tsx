"use client";

import * as React from "react";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatRecordingElapsed } from "@/lib/voice-note-recording";

interface VoiceNotePlayerProps {
  src: string;
  className?: string;
  compact?: boolean;
}

export function VoiceNotePlayer({ src, className, compact }: VoiceNotePlayerProps) {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = React.useState(false);
  const [position, setPosition] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audioRef.current = audio;

    const onTime = () => setPosition(audio.currentTime);
    const onMeta = () => {
      if (Number.isFinite(audio.duration)) setDuration(audio.duration);
    };
    const onEnded = () => {
      setPlaying(false);
      setPosition(0);
    };
    const onError = () => {
      setError("Could not play this voice note.");
      setPlaying(false);
    };

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    audio.src = src;
    void audio.load();

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audioRef.current = null;
    };
  }, [src]);

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    setError(null);
    try {
      if (playing) {
        audio.pause();
        setPlaying(false);
        return;
      }
      await audio.play();
      setPlaying(true);
    } catch {
      setError("Could not play this voice note.");
      setPlaying(false);
    }
  };

  const progress = duration > 0 ? Math.min(1, position / duration) : 0;

  return (
    <div
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5",
        compact && "gap-2 px-2.5 py-2",
        className
      )}
    >
      <Button
        type="button"
        size="icon"
        variant="default"
        className={cn("h-9 w-9 shrink-0 rounded-full", compact && "h-8 w-8")}
        onClick={() => void toggle()}
        aria-label={playing ? "Pause voice note" : "Play voice note"}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-px" />}
      </Button>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="h-1.5 overflow-hidden rounded-full bg-border/70">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-150"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] tabular-nums text-muted-foreground">
          <span>{formatRecordingElapsed(position)}</span>
          <span>{formatRecordingElapsed(duration || 0)}</span>
        </div>
        {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
      </div>
    </div>
  );
}
