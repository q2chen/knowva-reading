"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiClient, sendMessageStream } from "@/lib/api";
import { Reading, Session, ReadingStatus } from "@/lib/types";
import { QuickVoiceButton } from "@/components/quick-voice/QuickVoiceButton";

export default function QuickVoicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const readingId = searchParams.get("readingId");

  const [reading, setReading] = useState<Reading | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!readingId) {
      router.push("/home");
      return;
    }

    async function fetchReading() {
      try {
        const data = await apiClient<Reading>(`/api/readings/${readingId}`);
        setReading(data);
      } catch {
        setError("読書記録の取得に失敗しました");
      } finally {
        setLoading(false);
      }
    }
    fetchReading();
  }, [readingId, router]);

  const handleConfirm = useCallback(
    async (transcript: string) => {
      if (!reading || !readingId || sending) return;

      setSending(true);
      setError(null);

      try {
        // 1. セッション作成（Readingのstatusに基づいてsession_typeを決定）
        const sessionTypeMap: Record<ReadingStatus, Session["session_type"]> = {
          not_started: "before_reading",
          reading: "during_reading",
          completed: "after_reading",
        };
        const sessionType = sessionTypeMap[reading.status];

        const session = await apiClient<Session>(
          `/api/readings/${readingId}/sessions`,
          {
            method: "POST",
            body: JSON.stringify({ session_type: sessionType }),
          }
        );

        // 2. メッセージ送信（SSEストリーミング）
        await sendMessageStream(
          readingId,
          session.id,
          transcript,
          "voice",
          {
            onMessageDone: () => {
              // 3. 完了したらチャット画面に遷移
              router.push(`/readings/${readingId}/chat?sessionId=${session.id}`);
            },
            onError: (data) => {
              setError(data.message || "メッセージ送信に失敗しました");
              setSending(false);
            },
            onConnectionError: (err) => {
              setError(err.message || "接続エラーが発生しました");
              setSending(false);
            },
          }
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "エラーが発生しました");
        setSending(false);
      }
    },
    [reading, readingId, router, sending]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (!reading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-gray-500">{error || "読書記録が見つかりません"}</p>
        <Link href="/home" className="text-blue-600 hover:underline">
          ホームに戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex flex-col">
      {/* ヘッダー */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-gray-900 truncate">
            {reading.book.title}
          </h1>
          <p className="text-sm text-gray-500">{reading.book.author}</p>
        </div>
        <Link
          href="/home"
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="閉じる"
        >
          <CloseIcon className="w-6 h-6" />
        </Link>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {sending ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-gray-600">送信中...</p>
          </div>
        ) : (
          <>
            <p className="text-gray-600 text-center mb-8">
              読書中に感じたことを、話しかけてください
            </p>
            <QuickVoiceButton onConfirm={handleConfirm} disabled={sending} />
          </>
        )}

        {/* エラー表示 */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 rounded-lg max-w-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function CloseIcon({ className }: { className?: string }) {
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
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}
