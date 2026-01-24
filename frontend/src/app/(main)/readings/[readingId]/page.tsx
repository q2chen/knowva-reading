"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/api";
import { Reading, Insight, Session } from "@/lib/types";
import { InsightCard } from "@/components/insights/InsightCard";

export default function ReadingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const readingId = params.readingId as string;

  const [reading, setReading] = useState<Reading | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [readingData, insightsData, sessionsData] = await Promise.all([
          apiClient<Reading>(`/api/readings/${readingId}`),
          apiClient<Insight[]>(`/api/readings/${readingId}/insights`),
          apiClient<Session[]>(`/api/readings/${readingId}/sessions`),
        ]);
        setReading(readingData);
        setInsights(insightsData);
        setSessions(sessionsData);
      } catch {
        router.push("/home");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [readingId, router]);

  const startSession = async (sessionType: Session["session_type"]) => {
    try {
      const session = await apiClient<Session>(
        `/api/readings/${readingId}/sessions`,
        {
          method: "POST",
          body: JSON.stringify({ session_type: sessionType }),
        }
      );
      router.push(`/readings/${readingId}/chat?sessionId=${session.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "セッション作成に失敗しました");
    }
  };

  if (loading || !reading) {
    return <div className="text-center py-8 text-gray-500">読み込み中...</div>;
  }

  return (
    <div>
      <Link href="/home" className="text-sm text-blue-600 hover:underline mb-4 inline-block">
        &larr; 読書一覧に戻る
      </Link>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{reading.book.title}</h1>
            <p className="text-gray-600 mt-1">{reading.book.author}</p>
          </div>
          <span
            className={`px-3 py-1 text-sm rounded-full ${
              reading.status === "completed"
                ? "bg-green-100 text-green-700"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            {reading.status === "completed" ? "読了" : "読書中"}
          </span>
        </div>

        {reading.reading_context?.motivation && (
          <p className="mt-4 text-sm text-gray-600">
            <span className="font-medium">読む動機: </span>
            {reading.reading_context.motivation}
          </p>
        )}

        <div className="mt-6 flex gap-2">
          <button
            onClick={() => startSession("during_reading")}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            読書中の対話を始める
          </button>
          <button
            onClick={() => startSession("after_completion")}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
          >
            読了後の振り返り
          </button>
          <button
            onClick={() => startSession("reflection")}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm"
          >
            再解釈
          </button>
        </div>
      </div>

      {/* Insights */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          気づき・学び ({insights.length})
        </h2>
        {insights.length === 0 ? (
          <p className="text-sm text-gray-500">
            AIとの対話を通じて気づきが記録されます
          </p>
        ) : (
          <div className="grid gap-3">
            {insights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        )}
      </div>

      {/* Sessions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          対話セッション ({sessions.length})
        </h2>
        {sessions.length === 0 ? (
          <p className="text-sm text-gray-500">まだ対話セッションがありません</p>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => (
              <Link
                key={session.id}
                href={`/readings/${readingId}/chat?sessionId=${session.id}`}
                className="block p-3 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {session.session_type === "during_reading" && "読書中"}
                    {session.session_type === "after_completion" && "読了後"}
                    {session.session_type === "reflection" && "再解釈"}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(session.started_at).toLocaleDateString("ja-JP")}
                    {session.ended_at && " (終了)"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
