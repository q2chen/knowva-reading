"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api";
import { Reading, Session, ReadingStatus } from "@/lib/types";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { ToastContainer, useToast } from "@/components/ui/Toast";
import { StatusUpdateResult } from "@/hooks/useStreamingChat";

// コンポーネント外に定義してdepsを安定させる
const STATUS_LABELS: Record<ReadingStatus, string> = {
  not_started: "📖 読書前",
  reading: "📚 読書中",
  completed: "✨ 読了",
};

export default function ChatPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const readingId = params.readingId as string;
  const sessionId = searchParams.get("sessionId");

  const [reading, setReading] = useState<Reading | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // トースト通知
  const { toasts, showToast, dismissToast } = useToast();

  useEffect(() => {
    if (!sessionId) {
      router.push(`/readings/${readingId}`);
      return;
    }
    async function fetchData() {
      try {
        const [readingData, sessionsData] = await Promise.all([
          apiClient<Reading>(`/api/readings/${readingId}`),
          apiClient<Session[]>(`/api/readings/${readingId}/sessions`),
        ]);
        setReading(readingData);

        // 現在のセッションを取得
        const currentSession = sessionsData.find((s) => s.id === sessionId);
        setSession(currentSession || null);
      } catch {
        router.push("/home");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [readingId, sessionId, router]);

  // ステータスラベル（readingのステータスを優先、なければセッションタイプから推測）
  const currentStatusLabel = reading
    ? STATUS_LABELS[reading.status]
    : session
    ? {
        before_reading: "📖 読書前",
        during_reading: "📚 読書中",
        after_reading: "✨ 読了後",
      }[session.session_type]
    : "";

  // ステータス更新時のハンドラー
  const handleStatusUpdate = useCallback(
    (result: StatusUpdateResult) => {
      const newStatusLabel = STATUS_LABELS[result.new_status];
      showToast(`ステータスを「${newStatusLabel}」に更新しました`, "success", 3000);

      // readingの状態を更新
      setReading((prev) =>
        prev ? { ...prev, status: result.new_status } : prev
      );
    },
    [showToast]
  );

  if (loading || !reading || !sessionId) {
    return <div className="text-center py-8 text-gray-500">読み込み中...</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* トースト通知 */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <Link
            href={`/readings/${readingId}`}
            className="text-sm text-blue-600 hover:underline"
          >
            &larr; 戻る
          </Link>
          <span className="text-sm font-medium text-gray-700">
            {reading.book.title}
          </span>
          {(reading || session) && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {currentStatusLabel}
            </span>
          )}
        </div>
      </div>

      <ChatInterface
        readingId={readingId}
        sessionId={sessionId}
        onStatusUpdate={handleStatusUpdate}
      />
    </div>
  );
}
