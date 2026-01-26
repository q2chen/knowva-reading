"use client";

import { useState, useCallback, useRef } from "react";
import { sendMessageStream, SSECallbacks } from "@/lib/api";
import type { Message, StreamingState } from "@/lib/types";

interface UseStreamingChatOptions {
  readingId: string;
  sessionId: string;
  onMessageComplete?: (message: Message) => void;
  onError?: (error: string) => void;
}

export function useStreamingChat({
  readingId,
  sessionId,
  onMessageComplete,
  onError,
}: UseStreamingChatOptions) {
  const [streamingState, setStreamingState] = useState<StreamingState>({
    isStreaming: false,
    currentText: "",
    messageId: null,
    toolCalls: [],
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (text: string, inputType: "text" | "voice" = "text") => {
      // 既存のストリーミングをキャンセル
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      setStreamingState({
        isStreaming: true,
        currentText: "",
        messageId: null,
        toolCalls: [],
      });

      const callbacks: SSECallbacks = {
        onMessageStart: (data) => {
          setStreamingState((prev) => ({
            ...prev,
            messageId: data.message_id,
          }));
        },
        onTextDelta: (data) => {
          setStreamingState((prev) => ({
            ...prev,
            currentText: prev.currentText + data.delta,
          }));
        },
        onToolCallStart: (data) => {
          setStreamingState((prev) => ({
            ...prev,
            toolCalls: [
              ...prev.toolCalls,
              { name: data.tool_name, id: data.tool_call_id },
            ],
          }));
        },
        onToolCallDone: (data) => {
          setStreamingState((prev) => ({
            ...prev,
            toolCalls: prev.toolCalls.map((tc) =>
              tc.id === data.tool_call_id ? { ...tc, result: data.result } : tc
            ),
          }));
        },
        onMessageDone: (data) => {
          setStreamingState({
            isStreaming: false,
            currentText: "",
            messageId: null,
            toolCalls: [],
          });
          onMessageComplete?.(data.message);
        },
        onError: (data) => {
          setStreamingState({
            isStreaming: false,
            currentText: "",
            messageId: null,
            toolCalls: [],
          });
          onError?.(data.message);
        },
        onConnectionError: (error) => {
          setStreamingState({
            isStreaming: false,
            currentText: "",
            messageId: null,
            toolCalls: [],
          });
          onError?.(error.message);
        },
      };

      try {
        await sendMessageStream(
          readingId,
          sessionId,
          text,
          inputType,
          callbacks,
          abortControllerRef.current.signal
        );
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          onError?.(error.message);
          setStreamingState({
            isStreaming: false,
            currentText: "",
            messageId: null,
            toolCalls: [],
          });
        }
      }
    },
    [readingId, sessionId, onMessageComplete, onError]
  );

  const cancelStream = useCallback(() => {
    abortControllerRef.current?.abort();
    setStreamingState({
      isStreaming: false,
      currentText: "",
      messageId: null,
      toolCalls: [],
    });
  }, []);

  return {
    streamingState,
    sendMessage,
    cancelStream,
    isStreaming: streamingState.isStreaming,
  };
}
