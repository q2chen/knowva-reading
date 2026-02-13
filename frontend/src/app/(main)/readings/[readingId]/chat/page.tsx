"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { apiClient, endSession, updateReading } from "@/lib/api";
import { Reading, ReadingStatus } from "@/lib/types";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { ToastContainer, useToast } from "@/components/ui/Toast";
import { MicFAB } from "@/components/chat/MicFAB";
import { StatusUpdateResult } from "@/hooks/useStreamingChat";

// コンポーネント外に定義してdepsを安定させる
const STATUS_LABELS: Record<ReadingStatus, string> = {
  not_started: "📖 読書前",
  reading: "📚 読書中",
  completed: "✨ 読了",
};

const STATUS_OPTIONS: { value: ReadingStatus; label: string }[] = [
  { value: "not_started", label: "📖 読書前" },
  { value: "reading", label: "📚 読書中" },
  { value: "completed", label: "✨ 読了" },
];

export default function ChatPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const readingId = params.readingId as string;
  const sessionId = searchParams.get("sessionId");
  const initiator = (searchParams.get("initiator") as "ai" | "user") || "ai";

  const [reading, setReading] = useState<Reading | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // トースト通知
  const { toasts, showToast, dismissToast } = useToast();

  // セッション終了処理用のref（beforeunloadでも参照できるように）
  const sessionEndedRef = useRef(false);

  useEffect(() => {
    if (!sessionId) {
      router.push(`/readings/${readingId}`);
      return;
    }
    async function fetchData() {
      try {
        const readingData = await apiClient<Reading>(`/api/readings/${readingId}`);
        setReading(readingData);
      } catch {
        router.push("/home");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [readingId, sessionId, router]);

  // チャット画面離脱時にセッションを終了する
  useEffect(() => {
    if (!sessionId) return;

    const handleEndSession = async () => {
      if (sessionEndedRef.current) return;
      sessionEndedRef.current = true;
      try {
        await endSession(readingId, sessionId);
      } catch (error) {
        console.error("Failed to end session:", error);
      }
    };

    // beforeunloadでページを離れる前に終了処理
    const handleBeforeUnload = () => {
      if (sessionEndedRef.current) return;
      sessionEndedRef.current = true;
      // keepalive: trueでfetchを使用（api.tsのendSessionで対応済み）
      endSession(readingId, sessionId).catch(console.error);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    // クリーンアップ（Next.jsのルーティングで離脱する場合）
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      handleEndSession();
    };
  }, [readingId, sessionId]);

  // ステータスのスタイル
  const getStatusSelectStyle = (status: ReadingStatus): string => {
    switch (status) {
      case "not_started":
        return "bg-gray-100 text-gray-700 border-gray-300";
      case "reading":
        return "bg-blue-50 text-blue-700 border-blue-300";
      case "completed":
        return "bg-green-50 text-green-700 border-green-300";
    }
  };

  // ドロップダウンからのステータス変更ハンドラー
  const handleDropdownStatusChange = useCallback(
    async (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newStatus = e.target.value as ReadingStatus;
      if (newStatus === reading?.status || isUpdatingStatus) return;

      setIsUpdatingStatus(true);
      try {
        const updated = await updateReading(readingId, { status: newStatus });
        setReading(updated);
        const newStatusLabel = STATUS_LABELS[newStatus];
        showToast(`ステータスを「${newStatusLabel}」に更新しました`, "success", 3000);
      } catch (error) {
        console.error("Failed to update reading status:", error);
        showToast("ステータスの更新に失敗しました", "error", 3000);
      } finally {
        setIsUpdatingStatus(false);
      }
    },
    [reading?.status, isUpdatingStatus, readingId, showToast]
  );

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

  // Insight保存時のハンドラー
  const handleInsightSaved = useCallback(() => {
    showToast("気づきを保存しました", "success", 3000);
  }, [showToast]);

  // プロフィールエントリ保存時のハンドラー
  const handleProfileEntrySaved = useCallback(() => {
    showToast("プロフィール情報を保存しました", "success", 3000);
  }, [showToast]);

  if (loading || !reading || !sessionId) {
    return <div className="text-center py-8 text-gray-500">読み込み中...</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-128px)] md:h-[calc(100dvh-64px)] -mt-6 -mb-20 md:-mb-6">
      {/* トースト通知 */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      {/* ヘッダー: 2段レイアウト */}
      <div className="border-b border-gray-200 bg-white">
        {/* 上段: 書籍タイトル */}
        <div className="px-4 pt-2 pb-1">
          <h1 className="text-sm font-medium text-gray-700 truncate">
            {reading.book.title}
          </h1>
        </div>
        {/* 下段: 戻る / ステータスプルダウン / 音声メモ */}
        <div className="flex items-center px-4 pb-2 gap-2">
          <Link
            href={`/readings/${readingId}`}
            className="text-sm text-blue-600 hover:underline whitespace-nowrap flex-shrink-0"
          >
            &larr; 戻る
          </Link>
          <div className="flex-1" />
          <select
            value={reading.status}
            onChange={handleDropdownStatusChange}
            disabled={isUpdatingStatus}
            className={`text-xs font-medium rounded-lg border px-2 py-1 flex-shrink-0 ${getStatusSelectStyle(reading.status)} ${
              isUpdatingStatus ? "cursor-not-allowed opacity-60" : ""
            }`}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <MicFAB readingId={readingId} sessionId={sessionId} />
        </div>
      </div>

      <ChatInterface
        readingId={readingId}
        sessionId={sessionId}
        initiator={initiator}
        onStatusUpdate={handleStatusUpdate}
        onInsightSaved={handleInsightSaved}
        onProfileEntrySaved={handleProfileEntrySaved}
      />

    </div>
  );
}
