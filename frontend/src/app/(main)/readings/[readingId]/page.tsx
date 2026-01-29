"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiClient, getActionPlans } from "@/lib/api";
import {
  Reading,
  ReadingStatus,
  Insight,
  Session,
  MoodComparison,
  MoodData,
  ActionPlan,
} from "@/lib/types";
import { InsightCard } from "@/components/insights/InsightCard";
import { MoodChart } from "@/components/mood/MoodChart";
import { ActionPlanList } from "@/components/action-plan/ActionPlanList";

const STATUS_OPTIONS: { value: ReadingStatus; label: string; emoji: string }[] = [
  { value: "not_started", label: "読書前", emoji: "📖" },
  { value: "reading", label: "読書中", emoji: "📚" },
  { value: "completed", label: "読了", emoji: "✨" },
];

export default function ReadingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const readingId = params.readingId as string;

  const [reading, setReading] = useState<Reading | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [moodComparison, setMoodComparison] = useState<MoodComparison | null>(null);
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchMoodData = useCallback(async () => {
    try {
      const moods = await apiClient<MoodData[]>(`/api/readings/${readingId}/moods`);
      const before = moods.find((m) => m.mood_type === "before");
      const after = moods.find((m) => m.mood_type === "after");

      // 変化量を計算
      let changes = undefined;
      if (before && after) {
        changes = {
          energy: after.metrics.energy - before.metrics.energy,
          positivity: after.metrics.positivity - before.metrics.positivity,
          clarity: after.metrics.clarity - before.metrics.clarity,
          motivation: after.metrics.motivation - before.metrics.motivation,
          openness: after.metrics.openness - before.metrics.openness,
        };
      }

      setMoodComparison({
        reading_id: readingId,
        before_mood: before,
        after_mood: after,
        changes,
      });
    } catch {
      // 心境データがない場合は空の比較データを設定
      setMoodComparison({
        reading_id: readingId,
        before_mood: undefined,
        after_mood: undefined,
        changes: undefined,
      });
    }
  }, [readingId]);

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

        // 心境データを取得
        await fetchMoodData();

        // アクションプランを取得
        try {
          const plansData = await getActionPlans(readingId);
          setActionPlans(plansData);
        } catch {
          // アクションプランがない場合は空配列
          setActionPlans([]);
        }
      } catch {
        router.push("/home");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [readingId, router, fetchMoodData]);

  const updateStatus = async (newStatus: ReadingStatus) => {
    if (!reading || reading.status === newStatus) return;

    setUpdatingStatus(true);
    try {
      const updated = await apiClient<Reading>(
        `/api/readings/${readingId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: newStatus }),
        }
      );
      setReading(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : "ステータス更新に失敗しました");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const startSession = async () => {
    if (!reading) return;

    // 現在のステータスに応じたセッションタイプを決定
    const sessionTypeMap: Record<ReadingStatus, Session["session_type"]> = {
      not_started: "before_reading",
      reading: "during_reading",
      completed: "after_reading",
    };
    const sessionType = sessionTypeMap[reading.status];

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

  const currentStatusOption = STATUS_OPTIONS.find(opt => opt.value === reading.status) || STATUS_OPTIONS[0];

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
        </div>

        {reading.reading_context?.motivation && (
          <p className="mt-4 text-sm text-gray-600">
            <span className="font-medium">読む動機: </span>
            {reading.reading_context.motivation}
          </p>
        )}

        {/* ステータスセレクター */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            読書ステータス
          </label>
          <div className="flex gap-2">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => updateStatus(option.value)}
                disabled={updatingStatus}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  reading.status === option.value
                    ? option.value === "not_started"
                      ? "bg-amber-500 text-white"
                      : option.value === "reading"
                      ? "bg-blue-600 text-white"
                      : "bg-green-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                } ${updatingStatus ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {option.emoji} {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* 対話開始ボタン */}
        <div className="mt-6 space-y-3">
          <button
            onClick={startSession}
            className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-base font-medium flex items-center justify-center gap-2"
          >
            {currentStatusOption.emoji} 対話を始める
          </button>
          <p className="text-xs text-gray-500 text-center">
            現在のステータス（{currentStatusOption.label}）に応じた対話が始まります
          </p>

          {/* レポートへのリンク */}
          <Link
            href={`/readings/${readingId}/report`}
            className="w-full px-6 py-3 bg-white text-indigo-600 border border-indigo-600 rounded-lg hover:bg-indigo-50 text-base font-medium flex items-center justify-center gap-2"
          >
            読書レポートを見る
          </Link>
        </div>
      </div>

      {/* アクションプランセクション（レポート生成済みの場合のみ表示） */}
      {actionPlans.length > 0 && (
        <details
          className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 group"
          open
        >
          <summary className="p-4 cursor-pointer list-none flex items-center justify-between hover:bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 group-open:rotate-90 transition-transform">
                ▶
              </span>
              <h2 className="text-lg font-semibold text-gray-900">
                アクションプラン (
                {actionPlans.filter((p) => p.status === "completed").length}/
                {actionPlans.length})
              </h2>
            </div>
          </summary>
          <div className="px-6 pb-6">
            <ActionPlanList
              readingId={readingId}
              actionPlans={actionPlans}
              onUpdate={(updated) => {
                setActionPlans((prev) =>
                  prev.map((p) => (p.id === updated.id ? updated : p))
                );
              }}
            />
          </div>
        </details>
      )}

      {/* 心境の記録・可視化セクション（折りたたみ可能） */}
      <details className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 group">
        <summary className="p-4 cursor-pointer list-none flex items-center justify-between hover:bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 group-open:rotate-90 transition-transform">▶</span>
            <h2 className="text-lg font-semibold text-gray-900">
              心境の変化
            </h2>
          </div>
          <p className="text-xs text-gray-500">
            AIとの対話から自動記録されます
          </p>
        </summary>
        <div className="px-6 pb-6">
          {moodComparison && <MoodChart comparison={moodComparison} />}
        </div>
      </details>

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
              <InsightCard
                key={insight.id}
                insight={insight}
                readingId={readingId}
                showVisibilityControl
              />
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
                    {session.session_type === "before_reading" && "📖 読書前"}
                    {session.session_type === "during_reading" && "📚 読書中"}
                    {session.session_type === "after_reading" && "✨ 読了後"}
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
