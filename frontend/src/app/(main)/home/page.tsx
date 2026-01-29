"use client";

import { useEffect, useState, useCallback } from "react";
import { apiClient, getLatestMentorFeedback, chatWithMentor } from "@/lib/api";
import { ProfileEntry, ProfileEntryType, AllInsightsResponse, MentorFeedback, MentorFeedbackType, Reading } from "@/lib/types";
import { ProfileChatInterface } from "@/components/profile/ProfileChatInterface";
import { ProfileEntryList } from "@/components/profile/ProfileEntryList";
import { ProfileEntryForm } from "@/components/profile/ProfileEntryForm";
import { InsightList } from "@/components/profile/InsightList";
import { ReadingCard } from "@/components/readings/ReadingCard";
import { QuickVoiceFAB } from "@/components/quick-voice/QuickVoiceFAB";
import Link from "next/link";

export default function HomePage() {
  const [entries, setEntries] = useState<ProfileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [insightsData, setInsightsData] = useState<AllInsightsResponse | null>(null);
  const [groupBy, setGroupBy] = useState<"book" | "type">("book");
  const [insightsOpen, setInsightsOpen] = useState(true);
  const [reflectionOpen, setReflectionOpen] = useState(true);
  const [recentReadingsOpen, setRecentReadingsOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(true);
  const [latestFeedback, setLatestFeedback] = useState<MentorFeedback | null>(null);
  const [mentorLoading, setMentorLoading] = useState(false);
  const [mentorMessage, setMentorMessage] = useState<string | null>(null);
  const [recentReadings, setRecentReadings] = useState<Reading[]>([]);
  const [allReadings, setAllReadings] = useState<Reading[]>([]);

  const fetchEntries = useCallback(async () => {
    try {
      const data = await apiClient<ProfileEntry[]>("/api/profile/entries");
      setEntries(data);
    } catch (error) {
      console.error("Failed to fetch entries:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchInsights = useCallback(async () => {
    try {
      const insightsRes = await apiClient<AllInsightsResponse>(`/api/profile/insights?group_by=${groupBy}`);
      setInsightsData(insightsRes);
    } catch (error) {
      console.error("Failed to fetch insights:", error);
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
    fetchEntries();
  }, [fetchEntries]);

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

  const handleAddEntry = async (data: {
    entry_type: ProfileEntryType;
    content: string;
    note?: string;
  }) => {
    try {
      const newEntry = await apiClient<ProfileEntry>("/api/profile/entries", {
        method: "POST",
        body: JSON.stringify(data),
      });
      setEntries((prev) => [newEntry, ...prev]);
      setShowAddForm(false);
    } catch (error) {
      console.error("Failed to add entry:", error);
    }
  };

  const handleEditEntry = async (
    entryId: string,
    data: { entry_type: ProfileEntryType; content: string; note?: string }
  ) => {
    try {
      const updated = await apiClient<ProfileEntry>(
        `/api/profile/entries/${entryId}`,
        {
          method: "PUT",
          body: JSON.stringify(data),
        }
      );
      setEntries((prev) =>
        prev.map((e) => (e.id === entryId ? updated : e))
      );
    } catch (error) {
      console.error("Failed to update entry:", error);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    try {
      await apiClient(`/api/profile/entries/${entryId}`, { method: "DELETE" });
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
    } catch (error) {
      console.error("Failed to delete entry:", error);
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">ホーム</h1>

      {/* ワンタップ音声入力FAB */}
      <QuickVoiceFAB readings={readingInProgress} />

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

      {/* 最近の読書セクション */}
      {recentReadings.length > 0 && (
        <section className="bg-white rounded-lg shadow-sm border border-gray-200">
          <button
            onClick={() => setRecentReadingsOpen(!recentReadingsOpen)}
            className="w-full flex items-center justify-between p-6 text-left"
          >
            <h2 className="text-lg font-semibold text-gray-900">📚 最近の読書</h2>
            <div className="flex items-center gap-3">
              <Link
                href="/readings"
                onClick={(e) => e.stopPropagation()}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                すべて見る →
              </Link>
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
              <div className="grid gap-4 sm:grid-cols-2">
                {recentReadings.map((reading) => (
                  <ReadingCard key={reading.id} reading={reading} />
                ))}
              </div>
            </div>
          )}
        </section>
      )}

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

      {/* あなたについて & AIと対話する セクション */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200">
        <button
          onClick={() => setProfileOpen(!profileOpen)}
          className="w-full flex items-center justify-between p-6 text-left"
        >
          <h2 className="text-lg font-semibold text-gray-900">
            👤 あなたについて ({entries.length})
          </h2>
          <div className="flex items-center gap-3">
            <Link
              href="/settings"
              onClick={(e) => e.stopPropagation()}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              設定へ →
            </Link>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform ${profileOpen ? "rotate-180" : ""}`}
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
        {profileOpen && (
          <div className="px-6 pb-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 左側: エントリ一覧 */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-700">プロフィール情報</h3>
                  {!showAddForm && (
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      + 手動で追加
                    </button>
                  )}
                </div>

                {showAddForm && (
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">
                      新規追加
                    </h4>
                    <ProfileEntryForm
                      onSave={handleAddEntry}
                      onCancel={() => setShowAddForm(false)}
                    />
                  </div>
                )}

                {entries.length === 0 && !showAddForm ? (
                  <p className="text-sm text-gray-400 text-center py-4">
                    まだ情報がありません。AIと対話するか、手動で追加しましょう。
                  </p>
                ) : (
                  <ProfileEntryList
                    entries={entries}
                    onDelete={handleDeleteEntry}
                    onEdit={handleEditEntry}
                  />
                )}
              </div>

              {/* 右側: 対話エリア */}
              <div className="flex flex-col">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  💬 AIと対話する
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  目標、興味、読みたい本などを話してください
                </p>
                <div className="flex-1 min-h-0">
                  <ProfileChatInterface onEntryAdded={fetchEntries} />
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
