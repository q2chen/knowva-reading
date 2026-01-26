"use client";

import { useState, useCallback, useRef } from "react";
import { sendMessageStream, SSECallbacks } from "@/lib/api";
import type { Message, StreamingState, OptionsState } from "@/lib/types";

export interface StatusUpdateResult {
  new_status: "not_started" | "reading" | "completed";
}

interface UseStreamingChatOptions {
  readingId: string;
  sessionId: string;
  onMessageComplete?: (message: Message) => void;
  onError?: (error: string) => void;
  onStatusUpdate?: (result: StatusUpdateResult) => void;
  onOptionsRequest?: (options: OptionsState) => void;
}

export function useStreamingChat({
  readingId,
  sessionId,
  onMessageComplete,
  onError,
  onStatusUpdate,
  onOptionsRequest,
}: UseStreamingChatOptions) {
  const [streamingState, setStreamingState] = useState<StreamingState>({
    isStreaming: false,
    currentText: "",
    messageId: null,
    toolCalls: [],
    optionsRequest: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  // ツールコールのマップ（ID -> 名前）をrefで保持してクロージャ問題を回避
  const toolCallMapRef = useRef<Map<string, string>>(new Map());

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
        optionsRequest: null,
      });
      toolCallMapRef.current.clear();

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
          // refにツール名を記録（onToolCallDoneで参照するため）
          toolCallMapRef.current.set(data.tool_call_id, data.tool_name);
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

          // ステータス更新ツールの完了を検知（refから取得）
          const toolName = toolCallMapRef.current.get(data.tool_call_id);
          if (
            toolName === "update_reading_status" &&
            data.result &&
            typeof data.result === "object" &&
            "status" in data.result &&
            data.result.status === "success" &&
            "new_status" in data.result
          ) {
            onStatusUpdate?.({
              new_status: data.result.new_status as StatusUpdateResult["new_status"],
            });
          }
        },
        onOptionsRequest: (data) => {
          const optionsState: OptionsState = {
            prompt: data.prompt,
            options: data.options,
            allowMultiple: data.allow_multiple,
            allowFreeform: data.allow_freeform,
          };
          setStreamingState((prev) => ({
            ...prev,
            optionsRequest: optionsState,
          }));
          onOptionsRequest?.(optionsState);
        },
        onMessageDone: (data) => {
          setStreamingState({
            isStreaming: false,
            currentText: "",
            messageId: null,
            toolCalls: [],
            optionsRequest: null,
          });
          onMessageComplete?.(data.message);
        },
        onError: (data) => {
          setStreamingState({
            isStreaming: false,
            currentText: "",
            messageId: null,
            toolCalls: [],
            optionsRequest: null,
          });
          onError?.(data.message);
        },
        onConnectionError: (error) => {
          setStreamingState({
            isStreaming: false,
            currentText: "",
            messageId: null,
            toolCalls: [],
            optionsRequest: null,
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
            optionsRequest: null,
          });
        }
      }
    },
    [readingId, sessionId, onMessageComplete, onError, onStatusUpdate, onOptionsRequest]
  );

  const cancelStream = useCallback(() => {
    abortControllerRef.current?.abort();
    setStreamingState({
      isStreaming: false,
      currentText: "",
      messageId: null,
      toolCalls: [],
      optionsRequest: null,
    });
  }, []);

  const clearOptionsRequest = useCallback(() => {
    setStreamingState((prev) => ({
      ...prev,
      optionsRequest: null,
    }));
  }, []);

  return {
    streamingState,
    sendMessage,
    cancelStream,
    clearOptionsRequest,
    isStreaming: streamingState.isStreaming,
    optionsRequest: streamingState.optionsRequest,
  };
}
