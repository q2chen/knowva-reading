"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiClient, sendMessageStream } from "@/lib/api";
import { Reading, Session, ReadingStatus } from "@/lib/types";
import { VoiceMemoRecorder } from "@/components/quick-voice/VoiceMemoRecorder";
import { VoiceMemoList, VoiceMemo } from "@/components/quick-voice/VoiceMemoList";
import { useWakeLock } from "@/hooks/useWakeLock";

export default function QuickVoicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const readingId = searchParams.get("readingId");
  const sessionIdParam = searchParams.get("sessionId");

  const [reading, setReading] = useState<Reading | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memos, setMemos] = useState<VoiceMemo[]>([]);
  const wakeLock = useWakeLock();

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

  // メモ追加
  const addMemo = useCallback((text: string) => {
    setMemos((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        text,
        createdAt: new Date(),
      },
    ]);
  }, []);

  // メモ削除
  const deleteMemo = useCallback((id: string) => {
    setMemos((prev) => prev.filter((m) => m.id !== id));
  }, []);

  // メモを箇条書き形式に整形
  const formatMemos = useCallback((memoList: VoiceMemo[]): string => {
    const bulletPoints = memoList.map((m) => `・${m.text}`).join("\n");
    return `気づきメモ：\n${bulletPoints}`;
  }, []);

  // 送信処理
  const handleSubmit = useCallback(async () => {
    if (!reading || !readingId || sending || memos.length === 0) return;

    setSending(true);
    setError(null);

    try {
      const formattedMessage = formatMemos(memos);
      let sessionId = sessionIdParam;

      // sessionIdがなければ新規セッション作成
      if (!sessionId) {
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
        sessionId = session.id;
      }

      // メッセージ送信（SSEストリーミング）
      await sendMessageStream(
        readingId,
        sessionId,
        formattedMessage,
        "voice",
        {
          onMessageDone: () => {
            // 完了したらチャット画面に遷移
            router.push(`/readings/${readingId}/chat?sessionId=${sessionId}`);
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
  }, [reading, readingId, router, sending, memos, sessionIdParam, formatMemos]);

  // 戻るボタンの遷移先
  const backHref = sessionIdParam
    ? `/readings/${readingId}/chat?sessionId=${sessionIdParam}`
    : "/home";

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
          href={backHref}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="閉じる"
        >
          <CloseIcon className="w-6 h-6" />
        </Link>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 flex flex-col p-6">
        {sending ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-gray-600">送信中...</p>
          </div>
        ) : (
          <>
            {/* 案内テキスト */}
            <p className="text-gray-600 text-center mb-6">
              読書中の気づきを、何回でも録音できます
            </p>

            {/* 録音コンポーネント */}
            <div className="flex justify-center mb-6">
              <VoiceMemoRecorder onMemoComplete={addMemo} disabled={sending} />
            </div>

            {/* 画面スリープ防止チェックボックス */}
            {wakeLock.isSupported && (
              <div className="flex justify-center mb-6">
                <label className="flex flex-col items-start cursor-pointer">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={wakeLock.isActive}
                      onChange={(e) => {
                        if (e.target.checked) {
                          wakeLock.request();
                        } else {
                          wakeLock.release();
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">
                      画面をオフにしない
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 ml-6">
                    画面ロックが行われると録音が停止します
                  </p>
                </label>
              </div>
            )}

            {/* メモリスト */}
            <div className="flex-1 mb-6">
              <VoiceMemoList memos={memos} onDelete={deleteMemo} />
            </div>

            {/* 送信ボタン */}
            <div className="flex justify-center">
              <button
                onClick={handleSubmit}
                disabled={memos.length === 0 || sending}
                className={`flex items-center gap-2 px-8 py-3 rounded-full font-medium transition-colors ${
                  memos.length > 0
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                <SendIcon className="w-5 h-5" />
                送信する（{memos.length}件）
              </button>
            </div>
          </>
        )}

        {/* エラー表示 */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 rounded-lg max-w-md mx-auto">
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

function SendIcon({ className }: { className?: string }) {
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
        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
      />
    </svg>
  );
}
