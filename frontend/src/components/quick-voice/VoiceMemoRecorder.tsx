"use client";

import { useCallback, useRef, useEffect } from "react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

interface Props {
  onMemoComplete: (text: string) => void;
  disabled?: boolean;
}

export function VoiceMemoRecorder({ onMemoComplete, disabled }: Props) {
  const {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  // 前回のisListening状態を追跡
  const prevIsListeningRef = useRef(isListening);

  // 録音停止時にメモを確定
  useEffect(() => {
    const wasListening = prevIsListeningRef.current;
    prevIsListeningRef.current = isListening;

    if (wasListening && !isListening) {
      const fullText = (transcript + interimTranscript).trim();
      if (fullText) {
        onMemoComplete(fullText);
        resetTranscript();
      }
    }
  }, [isListening, transcript, interimTranscript, onMemoComplete, resetTranscript]);

  const handleToggle = useCallback(() => {
    if (disabled) return;

    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      startListening();
    }
  }, [isListening, startListening, stopListening, resetTranscript, disabled]);

  if (!isSupported) {
    return (
      <div className="text-center p-6">
        <p className="text-gray-500">
          お使いのブラウザは音声入力に対応していません。
          <br />
          Chrome または Edge をご利用ください。
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* 大きなマイクボタン */}
      <button
        onClick={handleToggle}
        disabled={disabled}
        className={`relative w-28 h-28 rounded-full flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
          isListening
            ? "bg-red-500 hover:bg-red-600 text-white"
            : "bg-gray-100 hover:bg-gray-200 text-gray-600"
        }`}
        aria-label={isListening ? "録音を一時停止" : "録音を開始"}
      >
        {/* パルスアニメーション（録音中） */}
        {isListening && (
          <>
            <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-25" />
            <span className="absolute inset-0 rounded-full bg-red-500 animate-pulse opacity-50" />
          </>
        )}
        {isListening ? (
          <PauseIcon className="w-12 h-12 relative z-10" />
        ) : (
          <MicIcon className="w-12 h-12 relative z-10" />
        )}
      </button>

      {/* ステータステキスト */}
      <p className="text-sm text-gray-500">
        {isListening ? (
          <span className="flex items-center gap-2 text-red-600 font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            録音中... タップで一時停止
          </span>
        ) : (
          "タップして録音開始"
        )}
      </p>

      {/* リアルタイム文字起こし表示 */}
      {(transcript || interimTranscript) && (
        <div className="w-full max-w-md bg-gray-50 rounded-lg p-4 min-h-[60px]">
          <p className="text-gray-800 text-base leading-relaxed">
            <span>{transcript}</span>
            <span className="text-blue-400">{interimTranscript}</span>
          </p>
        </div>
      )}

      {/* エラー表示 */}
      {error && (
        <div className="w-full max-w-md bg-red-50 rounded-lg p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
      />
    </svg>
  );
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
