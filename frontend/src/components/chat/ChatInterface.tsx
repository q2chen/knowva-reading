"use client";

import { useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/api";
import { Message } from "@/lib/types";
import { MessageBubble } from "./MessageBubble";
import { StreamingMessageBubble } from "./StreamingMessageBubble";
import { ChatInput } from "./ChatInput";
import { useStreamingChat } from "@/hooks/useStreamingChat";

interface Props {
  readingId: string;
  sessionId: string;
  useStreaming?: boolean;
}

export function ChatInterface({
  readingId,
  sessionId,
  useStreaming = true,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ストリーミングフック
  const {
    streamingState,
    sendMessage: sendStreamingMessage,
    isStreaming,
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
  });

  useEffect(() => {
    async function fetchMessages() {
      try {
        const data = await apiClient<Message[]>(
          `/api/readings/${readingId}/sessions/${sessionId}/messages`
        );
        setMessages(data);
      } catch {
        // 新しいセッションの場合はメッセージなし
      } finally {
        setInitialLoading(false);
      }
    }
    fetchMessages();
  }, [readingId, sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingState.currentText]);

  const handleSend = async (
    text: string,
    inputType: "text" | "voice" = "text"
  ) => {
    setError(null);

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

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !isStreaming && (
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
      <ChatInput onSend={handleSend} disabled={isLoading || isStreaming} />
    </div>
  );
}
