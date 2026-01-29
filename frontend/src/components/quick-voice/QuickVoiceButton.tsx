"use client";

import { useCallback } from "react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

interface Props {
  onConfirm: (transcript: string) => void;
  disabled?: boolean;
}

export function QuickVoiceButton({ onConfirm, disabled }: Props) {
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

  const handleMicToggle = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      startListening();
    }
  }, [isListening, startListening, stopListening, resetTranscript]);

  const handleConfirm = useCallback(() => {
    const allText = (transcript + interimTranscript).trim();
    if (allText) {
      stopListening();
      onConfirm(allText);
      resetTranscript();
    }
  }, [transcript, interimTranscript, onConfirm, stopListening, resetTranscript]);

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

  const hasTranscript = (transcript + interimTranscript).trim().length > 0;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* 大きなマイクボタン */}
      <button
        onClick={handleMicToggle}
        disabled={disabled}
        className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
          isListening
            ? "bg-red-500 hover:bg-red-600 text-white"
            : "bg-gray-100 hover:bg-gray-200 text-gray-600"
        }`}
        aria-label={isListening ? "録音を停止" : "音声入力を開始"}
      >
        {/* パルスアニメーション（録音中） */}
        {isListening && (
          <>
            <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-25" />
            <span className="absolute inset-0 rounded-full bg-red-500 animate-pulse opacity-50" />
          </>
        )}
        <MicIcon className="w-10 h-10 relative z-10" />
      </button>

      {/* ステータステキスト */}
      <p className="text-sm text-gray-500">
        {isListening ? (
          <span className="flex items-center gap-2 text-red-600 font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            録音中...
          </span>
        ) : (
          "マイクをタップして話しかけてください"
        )}
      </p>

      {/* リアルタイム文字起こし表示 */}
      {(transcript || interimTranscript) && (
        <div className="w-full max-w-md bg-gray-50 rounded-lg p-4 min-h-[80px]">
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

      {/* 確定ボタン */}
      {hasTranscript && (
        <button
          onClick={handleConfirm}
          disabled={disabled}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-full font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CheckIcon className="w-5 h-5" />
          送信する
        </button>
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

function CheckIcon({ className }: { className?: string }) {
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
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}
