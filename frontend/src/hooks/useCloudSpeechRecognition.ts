"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { auth } from "@/lib/firebase";

export interface UseCloudSpeechRecognitionResult {
  // State
  isListening: boolean;
  isConnecting: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;

  // Operations
  startListening: () => Promise<void>;
  stopListening: () => void;
  resetTranscript: () => void;
}

// Audio Configuration
const AUDIO_MIME_TYPE = "audio/webm;codecs=opus";

function getErrorMessage(code: string, message?: string): string {
  const errorMessages: Record<string, string> = {
    auth_required: "認証が必要です",
    invalid_token: "認証トークンが無効です",
    auth_timeout: "認証がタイムアウトしました",
    recognition_error: "音声認識エラーが発生しました",
    processing_error: "処理中にエラーが発生しました",
    timeout: "セッションがタイムアウトしました",
  };
  return errorMessages[code] || message || `エラー: ${code}`;
}

export function useCloudSpeechRecognition(): UseCloudSpeechRecognitionResult {
  const [isListening, setIsListening] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cleanup = useCallback(() => {
    // Stop MediaRecorder
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current = null;
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "stop" }));
      }
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsListening(false);
    setIsConnecting(false);
    setInterimTranscript("");
  }, []);

  const startRecording = useCallback(
    (stream: MediaStream, ws: WebSocket) => {
      // Check if MIME type is supported
      const mimeType = MediaRecorder.isTypeSupported(AUDIO_MIME_TYPE)
        ? AUDIO_MIME_TYPE
        : "audio/webm";

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          ws.send(event.data);
        }
      };

      mediaRecorder.onerror = () => {
        setError("録音中にエラーが発生しました");
        cleanup();
      };

      // Send audio chunks every 100ms for low latency
      mediaRecorder.start(100);
    },
    [cleanup]
  );

  const startListening = useCallback(async () => {
    if (isListening || isConnecting) return;

    setIsConnecting(true);
    setError(null);

    try {
      // Get auth token
      const user = auth.currentUser;
      if (!user) {
        throw new Error("ログインが必要です");
      }
      const token = await user.getIdToken();

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      // Connect WebSocket
      // Use the backend URL directly for WebSocket
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const wsProtocol = apiUrl.startsWith("https") ? "wss:" : "ws:";
      const wsHost = apiUrl.replace(/^https?:\/\//, "");
      const wsUrl = `${wsProtocol}//${wsHost}/api/ws/speech`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        // Send auth message
        ws.send(JSON.stringify({ type: "auth", token }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case "auth_success":
              // Start recording after auth
              startRecording(stream, ws);
              setIsConnecting(false);
              setIsListening(true);
              break;

            case "transcript":
              if (data.is_final) {
                setTranscript((prev) => prev + data.transcript);
                setInterimTranscript("");
              } else {
                setInterimTranscript(data.transcript);
              }
              break;

            case "error":
              setError(getErrorMessage(data.code, data.message));
              cleanup();
              break;

            case "stopped":
              setIsListening(false);
              break;
          }
        } catch {
          console.error("Failed to parse WebSocket message");
        }
      };

      ws.onerror = () => {
        setError("WebSocket接続エラーが発生しました");
        setIsConnecting(false);
        cleanup();
      };

      ws.onclose = () => {
        setIsListening(false);
        setIsConnecting(false);
      };
    } catch (err) {
      setIsConnecting(false);
      if (err instanceof Error) {
        if (err.name === "NotAllowedError") {
          setError("マイクの使用が許可されていません");
        } else if (err.name === "NotFoundError") {
          setError("マイクが見つかりません");
        } else {
          setError(err.message);
        }
      }
      cleanup();
    }
  }, [isListening, isConnecting, startRecording, cleanup]);

  const stopListening = useCallback(() => {
    cleanup();
  }, [cleanup]);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
  }, []);

  return {
    isListening,
    isConnecting,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}
