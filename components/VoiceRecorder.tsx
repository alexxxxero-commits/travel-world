"use client";

import { useEffect, useRef, useState } from "react";

type VoiceRecorderProps = {
  onRecordingComplete?: (file: File, duration: number) => void;
};

export default function VoiceRecorder({
  onRecordingComplete,
}: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
      }

      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  function formatDuration(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  }

  async function startRecording() {
    setError("");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Audio recording is not supported by this browser."
        );
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        /*
         * Calculate the final duration directly from the recording
         * start time instead of relying on React state.
         */
        const finalDuration = Math.max(
          0,
          Math.floor(
            (Date.now() - startTimeRef.current) / 1000
          )
        );

        setDuration(finalDuration);

        const file = new File(
          [blob],
          `voice-${Date.now()}.webm`,
          {
            type: blob.type,
          }
        );

        onRecordingComplete?.(
          file,
          finalDuration
        );

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => {
            track.stop();
          });

          streamRef.current = null;
        }

        mediaRecorderRef.current = null;
      };

      recorder.start();

      startTimeRef.current = Date.now();

      setDuration(0);
      setRecording(true);

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor(
          (Date.now() - startTimeRef.current) / 1000
        );

        setDuration(elapsed);
      }, 1000);
    } catch (error) {
      console.error(
        "START RECORDING ERROR:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Could not access your microphone."
      );
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;

    if (!recorder) {
      return;
    }

    if (recorder.state !== "inactive") {
      recorder.stop();
    }

    setRecording(false);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function deleteRecording() {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    setAudioUrl(null);
    setDuration(0);
    chunksRef.current = [];
    mediaRecorderRef.current = null;
  }

  return (
    <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-white/30">
            Voice Journal
          </p>

          <h2 className="mt-2 text-2xl font-light">
            {recording
              ? "Recording..."
              : audioUrl
                ? "Voice memory"
                : "Say it instead"}
          </h2>
        </div>

        {recording && (
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />

            <span className="font-mono text-sm text-white/60">
              {formatDuration(duration)}
            </span>
          </div>
        )}
      </div>

      {!recording && !audioUrl && (
        <button
          type="button"
          onClick={startRecording}
          className="mt-6 w-full rounded-full bg-white px-6 py-4 text-sm uppercase tracking-widest text-black transition hover:bg-white/80"
        >
          🎙 Start Recording
        </button>
      )}

      {recording && (
        <button
          type="button"
          onClick={stopRecording}
          className="mt-6 w-full rounded-full border border-red-400/30 bg-red-400/10 px-6 py-4 text-sm uppercase tracking-widest text-red-200 transition hover:bg-red-400/20"
        >
          Stop Recording
        </button>
      )}

      {audioUrl && !recording && (
        <div className="mt-6">
          <audio
            controls
            src={audioUrl}
            className="w-full"
          />

          <div className="mt-3 text-xs text-white/30">
            Duration: {formatDuration(duration)}
          </div>

          <button
            type="button"
            onClick={deleteRecording}
            className="mt-4 text-xs text-white/30 underline underline-offset-4 transition hover:text-white"
          >
            Record again
          </button>
        </div>
      )}

      {error && (
        <p className="mt-4 text-sm text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}