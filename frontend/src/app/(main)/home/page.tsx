"use client";

import { useEffect, useState, useCallback } from "react";
import { apiClient, getLatestMentorFeedback, chatWithMentor, getUserSettings } from "@/lib/api";
import { AllInsightsResponse, MentorFeedback, MentorFeedbackType, Reading, FabPosition } from "@/lib/types";
import { InsightList } from "@/components/profile/InsightList";
import { QuickVoiceFAB } from "@/components/quick-voice/QuickVoiceFAB";
import { BadgeSection } from "@/components/badges/BadgeSection";
import { HomeActionPlanSection } from "@/components/home/HomeActionPlanSection";
import Link from "next/link";

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [insightsData, setInsightsData] = useState<AllInsightsResponse | null>(null);
  const [groupBy, setGroupBy] = useState<"book" | "type">("book");
  const [insightsOpen, setInsightsOpen] = useState(true);
  const [reflectionOpen, setReflectionOpen] = useState(true);
  const [recentReadingsOpen, setRecentReadingsOpen] = useState(true);
  const [latestFeedback, setLatestFeedback] = useState<MentorFeedback | null>(null);
  const [mentorLoading, setMentorLoading] = useState(false);
  const [mentorMessage, setMentorMessage] = useState<string | null>(null);
  const [recentReadings, setRecentReadings] = useState<Reading[]>([]);
  const [allReadings, setAllReadings] = useState<Reading[]>([]);
  const [fabPosition, setFabPosition] = useState<FabPosition | null>(null);

  const fetchInsights = useCallback(async () => {
    try {
      const insightsRes = await apiClient<AllInsightsResponse>(`/api/profile/insights?group_by=${groupBy}`);
      setInsightsData(insightsRes);
    } catch (error) {
      console.error("Failed to fetch insights:", error);
    } finally {
      setLoading(false);
    }
  }, [groupBy]);

  const fetchRecentReadings = useCallback(async () => {
    try {
      const readings = await apiClient<Reading[]>("/api/readings");
      // 全読書データを保存（FAB用）
      setAllReadings(readings);
      // updated_at順（降順）でソートして最新4件を取得（表示用）
      const sorted = readings
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 4);
      setRecentReadings(sorted);
    } catch (error) {
      console.error("Failed to fetch readings:", error);
    }
  }, []);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  useEffect(() => {
    fetchRecentReadings();
  }, [fetchRecentReadings]);

  useEffect(() => {
    getLatestMentorFeedback()
      .then(setLatestFeedback)
      .catch(() => {});
  }, []);

  useEffect(() => {
    getUserSettings()
      .then((settings) => {
        setFabPosition(settings.fab_position || "left");
      })
      .catch(() => {
        setFabPosition("left");
      });
  }, []);

  const handleQuickReflection = async (feedbackType: MentorFeedbackType) => {
    setMentorLoading(true);
    setMentorMessage(null);
    try {
      const message =
        feedbackType === "weekly"
          ? "今週の振り返りをお願いします"
          : "今月の振り返りをお願いします";
      const response = await chatWithMentor(message, feedbackType);
      setMentorMessage(response.message);
      // 最新フィードバックを更新
      getLatestMentorFeedback().then(setLatestFeedback).catch(() => {});
    } catch (error) {
      console.error("Failed to generate reflection:", error);
      setMentorMessage("振り返りの生成に失敗しました。もう一度お試しください。");
    } finally {
      setMentorLoading(false);
    }
  };

  // 読書中の本を抽出（全読書データからupdated_at順で最新2冊）
  const readingInProgress = allReadings
    .filter((r) => r.status === "reading")
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 2)
    .map((r) => ({ id: r.id, bookTitle: r.book.title }));

  if (loading) {
    return <div className="text-center py-8 text-gray-500">読み込み中...</div>;
  }

  // ステータスラベル
  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return "読了";
      case "not_started":
        return "読書前";
      default:
        return "読書中";
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">ホーム</h1>

      {/* ワンタップ音声入力FAB */}
      {fabPosition && fabPosition !== "none" && (
        <QuickVoiceFAB readings={readingInProgress} position={fabPosition} />
      )}

      {/* 最近の読書セクション（横スクロール） */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200">
        <button
          onClick={() => setRecentReadingsOpen(!recentReadingsOpen)}
          className="w-full flex items-center justify-between p-6 text-left"
        >
          <h2 className="text-lg font-semibold text-gray-900">📚 読書中</h2>
          <div className="flex items-center gap-3">
            {recentReadings.length > 0 && (
              <Link
                href="/readings"
                onClick={(e) => e.stopPropagation()}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                すべて見る →
              </Link>
            )}
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform ${recentReadingsOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </button>
        {recentReadingsOpen && (
          <div className="px-6 pb-6">
            {recentReadings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="mb-2">まだ読書記録がありません</p>
                <Link
                  href="/readings?new=true"
                  className="inline-block mt-2 px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  最初の本を登録する
                </Link>
              </div>
            ) : (
              <div className="flex overflow-x-auto gap-4 pb-2 -mx-2 px-2 scrollbar-thin">
                {recentReadings.map((reading) => (
                  <Link
                    key={reading.id}
                    href={`/readings/${reading.id}`}
                    className="flex-shrink-0 w-28 group"
                  >
                    <div className="w-full aspect-[2/3] bg-gray-100 rounded-lg overflow-hidden shadow-sm group-hover:shadow-md transition-shadow">
                      {reading.book.cover_url ? (
                        <img
                          src={reading.book.cover_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg
                            className="w-8 h-8 text-gray-300"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                    <h3 className="mt-2 text-sm font-medium text-gray-900 truncate group-hover:text-blue-600">
                      {reading.book.title}
                    </h3>
                    <p className="text-xs text-gray-500 truncate">{reading.book.author}</p>
                    <span className="text-xs text-blue-600">{getStatusLabel(reading.status)}</span>
                  </Link>
                ))}
                {/* 新しい本を追加カード */}
                <Link
                  href="/readings?new=true"
                  className="flex-shrink-0 w-28 group"
                >
                  <div className="w-full aspect-[2/3] border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center group-hover:border-blue-400 group-hover:bg-blue-50 transition-colors">
                    <span className="text-3xl text-gray-400 group-hover:text-blue-500">+</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-500 text-center group-hover:text-blue-600">
                    新しい本を追加
                  </p>
                </Link>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ToDoセクション */}
      <HomeActionPlanSection />

      {/* 振り返りセクション */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200">
        <button
          onClick={() => setReflectionOpen(!reflectionOpen)}
          className="w-full flex items-center justify-between p-6 text-left"
        >
          <h2 className="text-lg font-semibold text-gray-900">🧭 振り返り</h2>
          <div className="flex items-center gap-3">
            <Link
              href="/mentor"
              onClick={(e) => e.stopPropagation()}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              対話画面へ →
            </Link>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform ${reflectionOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </button>
        {reflectionOpen && (
          <div className="px-6 pb-6">
            {/* ワンタップ振り返り生成ボタン */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => handleQuickReflection("weekly")}
                disabled={mentorLoading}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {mentorLoading ? "生成中..." : "📅 週次振り返りを生成"}
              </button>
              <button
                onClick={() => handleQuickReflection("monthly")}
                disabled={mentorLoading}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {mentorLoading ? "生成中..." : "📆 月次振り返りを生成"}
              </button>
            </div>

            {/* 生成された振り返りメッセージ */}
            {mentorMessage && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{mentorMessage}</p>
              </div>
            )}

            {/* 最新フィードバック表示 */}
            {latestFeedback && !mentorMessage && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-gray-600">
                    最新の{latestFeedback.feedback_type === "weekly" ? "週次" : "月次"}フィードバック
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(latestFeedback.created_at).toLocaleDateString("ja-JP")}
                  </span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                  {latestFeedback.content}
                </p>
              </div>
            )}

            {!latestFeedback && !mentorMessage && (
              <p className="text-sm text-gray-500">
                上のボタンをタップして、今週/今月の読書活動を振り返りましょう
              </p>
            )}
          </div>
        )}
      </section>

      {/* 全読書からのInsight一覧（折りたたみ） */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200">
        <button
          onClick={() => setInsightsOpen(!insightsOpen)}
          className="w-full flex items-center justify-between p-6 text-left"
        >
          <h2 className="text-lg font-semibold text-gray-900">
            💡 読書からの気づき ({insightsData?.total_count || 0})
          </h2>
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${insightsOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        {insightsOpen && (
          <div className="px-6 pb-6">
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setGroupBy("book")}
                className={`px-3 py-1 text-sm rounded-md ${
                  groupBy === "book"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                本ごと
              </button>
              <button
                onClick={() => setGroupBy("type")}
                className={`px-3 py-1 text-sm rounded-md ${
                  groupBy === "type"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                タイプごと
              </button>
            </div>
            {insightsData && <InsightList data={insightsData} groupBy={groupBy} />}
          </div>
        )}
      </section>

      {/* バッジセクション */}
      <BadgeSection />
    </div>
  );
}
