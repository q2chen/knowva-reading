"use client";

import { useEffect, useRef, useState } from "react";
import { apiClient, initializeReadingSession, SSECallbacks } from "@/lib/api";
import { Message, OptionsState } from "@/lib/types";
import { MessageBubble } from "./MessageBubble";
import { StreamingMessageBubble } from "./StreamingMessageBubble";
import { ChatInput } from "./ChatInput";
import { OptionsSelector } from "./OptionsSelector";
import { useStreamingChat, StatusUpdateResult } from "@/hooks/useStreamingChat";

interface Props {
  readingId: string;
  sessionId: string;
  useStreaming?: boolean;
  onStatusUpdate?: (result: StatusUpdateResult) => void;
}

export function ChatInterface({
  readingId,
  sessionId,
  useStreaming = true,
  onStatusUpdate,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentOptions, setCurrentOptions] = useState<OptionsState | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initAbortControllerRef = useRef<AbortController | null>(null);

  // ストリーミングフック
  const {
    streamingState,
    sendMessage: sendStreamingMessage,
    isStreaming,
    clearOptionsRequest,
  } = useStreamingChat({
    readingId,
    sessionId,
    onMessageComplete: (message) => {
      setMessages((prev) => [...prev, message]);
    },
    onError: (errorMessage) => {
      setError(errorMessage);
      // ユーザーメッセージも削除（楽観的更新の取り消し）
      setMessages((prev) => prev.filter((m) => !m.id.startsWith("temp-")));
    },
    onStatusUpdate,
    onOptionsRequest: (options) => {
      setCurrentOptions(options);
    },
  });

  // 初期化用のストリーミング状態
  const [initStreamingState, setInitStreamingState] = useState({
    isStreaming: false,
    currentText: "",
  });

  // 初期化開始済みフラグ（StrictModeでの2回実行対策）
  const initStartedRef = useRef(false);

  useEffect(() => {
    // StrictModeでの2回実行対策
    if (initStartedRef.current) {
      return;
    }
    initStartedRef.current = true;

    async function fetchMessages() {
      try {
        const data = await apiClient<Message[]>(
          `/api/readings/${readingId}/sessions/${sessionId}/messages`
        );
        setMessages(data);
        
        // メッセージがない場合は自動でセッション初期化を行う
        if (data.length === 0) {
          initializeSession();
        }
      } catch {
        // 新しいセッションの場合はメッセージなし、初期化を行う
        initializeSession();
      } finally {
        setInitialLoading(false);
      }
    }

    async function initializeSession() {
      setIsInitializing(true);
      setInitStreamingState({ isStreaming: true, currentText: "" });
      
      initAbortControllerRef.current?.abort();
      initAbortControllerRef.current = new AbortController();

      const callbacks: SSECallbacks = {
        onMessageStart: () => {
          // 初期化開始
        },
        onTextDelta: (data) => {
          setInitStreamingState((prev) => ({
            ...prev,
            currentText: prev.currentText + data.delta,
          }));
        },
        onOptionsRequest: (data) => {
          setCurrentOptions({
            prompt: data.prompt,
            options: data.options,
            allowMultiple: data.allow_multiple,
            allowFreeform: data.allow_freeform,
          });
        },
        onMessageDone: (data) => {
          setMessages((prev) => [...prev, data.message]);
          setInitStreamingState({ isStreaming: false, currentText: "" });
          setIsInitializing(false);
        },
        onError: (data) => {
          setError(data.message);
          setInitStreamingState({ isStreaming: false, currentText: "" });
          setIsInitializing(false);
        },
        onConnectionError: (err) => {
          // AbortErrorは無視（正常なキャンセル）
          if (err.name === "AbortError") {
            return;
          }
          setError(err.message);
          setInitStreamingState({ isStreaming: false, currentText: "" });
          setIsInitializing(false);
        },
      };

      try {
        await initializeReadingSession(
          readingId,
          sessionId,
          callbacks,
          initAbortControllerRef.current.signal
        );
      } catch (err) {
        // AbortErrorは無視（正常なキャンセル）
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        // "Session already initialized" エラーは無視
        if (err instanceof Error && !err.message.includes("already initialized")) {
          setError(err.message);
        }
        setInitStreamingState({ isStreaming: false, currentText: "" });
        setIsInitializing(false);
      }
    }

    fetchMessages();

    return () => {
      initAbortControllerRef.current?.abort();
    };
  }, [readingId, sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingState.currentText, initStreamingState.currentText]);

  const handleSend = async (
    text: string,
    inputType: "text" | "voice" = "text"
  ) => {
    setError(null);
    setCurrentOptions(null); // 選択肢をクリア
    clearOptionsRequest();

    // ユーザーメッセージを即時表示（楽観的更新）
    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      message: text,
      input_type: inputType,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    if (useStreaming) {
      // ストリーミングモード
      await sendStreamingMessage(text, inputType);
    } else {
      // 従来モード（フォールバック）
      setIsLoading(true);
      try {
        const aiResponse = await apiClient<Message>(
          `/api/readings/${readingId}/sessions/${sessionId}/messages`,
          {
            method: "POST",
            body: JSON.stringify({ message: text, input_type: inputType }),
          }
        );
        setMessages((prev) => [...prev, aiResponse]);
      } catch (e) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
        setError(e instanceof Error ? e.message : "エラーが発生しました");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleOptionsSelect = (selectedOptions: string[]) => {
    // 選択肢を結合してメッセージとして送信
    const text = selectedOptions.join("、");
    handleSend(text, "text");
  };

  const handleOptionsDismiss = () => {
    setCurrentOptions(null);
    clearOptionsRequest();
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  // 初期化中かどうか（メッセージもストリーミングもない状態）
  const showInitializing = isInitializing && messages.length === 0 && !isStreaming;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !isStreaming && !isInitializing && (
          <div className="text-center text-gray-400 py-8">
            <p>AIとの対話を始めましょう</p>
            <p className="text-sm mt-1">
              読んだ本について感じたことを自由に話してください
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* 初期化中のストリーミング表示 */}
        {initStreamingState.isStreaming && initStreamingState.currentText && (
          <div className="flex justify-start">
            <div className="max-w-[80%] px-4 py-2 bg-gray-100 rounded-2xl rounded-bl-md">
              <p className="whitespace-pre-wrap text-gray-800">
                {initStreamingState.currentText}
                <span className="inline-block w-1 h-4 ml-0.5 bg-gray-400 animate-pulse" />
              </p>
            </div>
          </div>
        )}

        {/* 初期化中のローディング表示（テキストがまだない場合） */}
        {showInitializing && !initStreamingState.currentText && (
          <div className="flex justify-start">
            <div className="bg-gray-100 px-4 py-2 rounded-2xl rounded-bl-md">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              </div>
            </div>
          </div>
        )}

        {/* ストリーミング中のメッセージ表示 */}
        <StreamingMessageBubble streamingState={streamingState} />

        {/* 従来モードのローディング表示 */}
        {isLoading && !useStreaming && (
          <div className="flex justify-start">
            <div className="bg-gray-100 px-4 py-2 rounded-2xl rounded-bl-md">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              </div>
            </div>
          </div>
        )}

        {/* エラー表示 */}
        {error && (
          <div className="text-center text-red-500 text-sm py-2">{error}</div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 選択肢表示 */}
      {currentOptions && (
        <div className="px-4 py-2 border-t border-gray-100">
          <OptionsSelector
            options={currentOptions}
            onSelect={handleOptionsSelect}
            onDismiss={handleOptionsDismiss}
            disabled={isLoading || isStreaming || isInitializing}
          />
        </div>
      )}

      <ChatInput onSend={handleSend} disabled={isLoading || isStreaming || isInitializing} />
    </div>
  );
}
