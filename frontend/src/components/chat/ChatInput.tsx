"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

interface Props {
  onSend: (message: string, inputType: "text" | "voice") => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: Props) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  // 録音終了時に入力欄に反映するための前回状態を追跡
  const prevIsListeningRef = useRef(isListening);

  // 録音が終了したときに入力欄に反映（外部システムからの同期）
  useEffect(() => {
    // 録音中→停止への変化を検出
    const wasListening = prevIsListeningRef.current;
    prevIsListeningRef.current = isListening;

    if (wasListening && !isListening && transcript) {
      // requestAnimationFrameで次のフレームに遅延させてカスケード回避
      requestAnimationFrame(() => {
        setText((prev) => prev + transcript);
        resetTranscript();
      });
    }
  }, [isListening, transcript, resetTranscript]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed, "text");
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInput = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handleMicToggle = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // 音声確定して送信
  const handleVoiceSend = useCallback(() => {
    stopListening();
    const allText = (text + transcript).trim();
    if (allText) {
      onSend(allText, "voice");
      setText("");
      resetTranscript();
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  }, [text, transcript, onSend, stopListening, resetTranscript]);

  return (
    <div className="border-t border-gray-200 bg-white">
      {/* リアルタイム文字起こし表示 */}
      {isListening && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span className="text-xs text-blue-600 font-medium">録音中</span>
          </div>
          <p className="text-sm text-gray-700 min-h-[1.5em]">
            <span className="text-gray-800">{transcript}</span>
            <span className="text-blue-400">{interimTranscript}</span>
            {!transcript && !interimTranscript && (
              <span className="text-gray-400 italic">話しかけてください...</span>
            )}
          </p>
        </div>
      )}

      {/* エラー表示 */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-100">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* 入力フォーム */}
      <form onSubmit={handleSubmit} className="flex gap-2 items-end p-4">
        <textarea
          ref={textareaRef}
          value={isListening ? text + transcript + interimTranscript : text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          disabled={disabled || isListening}
          placeholder="メッセージを入力..."
          rows={1}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-32 disabled:opacity-50 disabled:bg-gray-50 bg-white text-gray-900 placeholder:text-gray-500"
        />

        {/* 音声入力ボタン */}
        {isSupported && (
          <>
            {isListening ? (
              <button
                type="button"
                onClick={handleVoiceSend}
                disabled={disabled}
                className="px-3 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="音声を確定して送信"
              >
                <CheckIcon className="w-5 h-5" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleMicToggle}
              disabled={disabled}
              className={`px-3 py-2 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isListening
                  ? "bg-red-500 text-white hover:bg-red-600"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              title={isListening ? "録音を停止" : "音声入力（1回ずつ送信）"}
            >
              {isListening ? (
                <StopIcon className="w-5 h-5" />
              ) : (
                <MicIcon className="w-5 h-5" />
              )}
            </button>
          </>
        )}

        {/* 送信ボタン */}
        <button
          type="submit"
          disabled={disabled || !text.trim() || isListening}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          送信
        </button>
      </form>
    </div>
  );
}

// アイコンコンポーネント
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

function StopIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <rect x="6" y="6" width="12" height="12" rx="2" />
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
