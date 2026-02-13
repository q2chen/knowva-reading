"use client";

import { useEffect, useState } from "react";
import { getLatestMentorFeedback } from "@/lib/api";
import { MentorChatInterface, MentorFeedbackList } from "@/components/mentor";
import type { MentorFeedback } from "@/lib/types";

type TabType = "chat" | "history";

export default function MentorPage() {
  const [latestFeedback, setLatestFeedback] = useState<MentorFeedback | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<TabType>("chat");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    getLatestMentorFeedback()
      .then(setLatestFeedback)
      .catch(() => {
        // 初回はフィードバックがない可能性がある
      });
  }, [refreshTrigger]);

  const handleFeedbackGenerated = () => {
    // フィードバックが生成されたら最新情報を更新
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">🧭 振り返り</h1>
        <p className="text-sm text-gray-500 mt-1">
          あなたの読書生活をサポートします。振り返りや相談をしてみましょう。
        </p>
      </div>

      {/* タブ切り替え */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === "chat"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          💬 対話
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === "history"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          📋 振り返り履歴
        </button>
      </div>

      {/* タブコンテンツ */}
      {activeTab === "chat" ? (
        <MentorChatInterface
          latestFeedback={latestFeedback}
          onFeedbackGenerated={handleFeedbackGenerated}
        />
      ) : (
        <MentorFeedbackList refreshTrigger={refreshTrigger} />
      )}
    </div>
  );
}
