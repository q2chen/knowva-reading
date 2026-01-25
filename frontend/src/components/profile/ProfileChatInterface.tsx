"use client";

import { useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/api";
import { Message } from "@/lib/types";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ChatInput } from "@/components/chat/ChatInput";

interface Props {
  onEntryAdded?: () => void;
}

export function ProfileChatInterface({ onEntryAdded }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text: string, inputType: "text" | "voice" = "text") => {
    setIsLoading(true);

    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      message: text,
      input_type: inputType,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const aiResponse = await apiClient<Message>("/api/profile/chat", {
        method: "POST",
        body: JSON.stringify({ message: text, input_type: inputType }),
      });
      setMessages((prev) => [...prev, aiResponse]);

      // エントリが追加された可能性があるので再取得
      onEntryAdded?.();
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    try {
      await apiClient("/api/profile/chat/reset", { method: "POST" });
      setMessages([]);
    } catch {
      // エラーは無視
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 border rounded-lg bg-gray-50 min-h-[300px] max-h-[400px]">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            <p>AIとの対話を始めましょう</p>
            <p className="text-sm mt-1">
              目標や興味について自由に話してください
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isLoading && (
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
        <div ref={messagesEndRef} />
      </div>
      <div className="mt-4">
        <ChatInput onSend={handleSend} disabled={isLoading} />
      </div>
      {messages.length > 0 && (
        <button
          onClick={handleReset}
          className="mt-2 text-sm text-gray-500 hover:text-gray-700"
        >
          対話をリセットする
        </button>
      )}
    </div>
  );
}
