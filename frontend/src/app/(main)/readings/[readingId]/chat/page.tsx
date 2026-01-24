"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api";
import { Reading } from "@/lib/types";
import { ChatInterface } from "@/components/chat/ChatInterface";

export default function ChatPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const readingId = params.readingId as string;
  const sessionId = searchParams.get("sessionId");

  const [reading, setReading] = useState<Reading | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      router.push(`/readings/${readingId}`);
      return;
    }
    async function fetchReading() {
      try {
        const data = await apiClient<Reading>(`/api/readings/${readingId}`);
        setReading(data);
      } catch {
        router.push("/home");
      } finally {
        setLoading(false);
      }
    }
    fetchReading();
  }, [readingId, sessionId, router]);

  const handleEndSession = async () => {
    if (!confirm("このセッションを終了しますか？")) return;
    try {
      await apiClient(`/api/readings/${readingId}/sessions/${sessionId}/end`, {
        method: "POST",
      });
      router.push(`/readings/${readingId}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "エラーが発生しました");
    }
  };

  if (loading || !reading || !sessionId) {
    return <div className="text-center py-8 text-gray-500">読み込み中...</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
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
        </div>
        <button
          onClick={handleEndSession}
          className="px-3 py-1 text-sm border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50"
        >
          セッション終了
        </button>
      </div>
      <ChatInterface readingId={readingId} sessionId={sessionId} />
    </div>
  );
}
