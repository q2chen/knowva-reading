"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  apiClient,
  getActionPlans,
  createActionPlan,
  updateActionPlan,
  deleteActionPlan,
  updateReading,
  previewReadingDelete,
  deleteReading,
  createInsight,
  updateInsight,
  deleteInsights,
} from "@/lib/api";
import {
  Reading,
  ReadingStatus,
  Insight,
  Session,
  MoodComparison,
  MoodData,
  ActionPlan,
  ActionPlanCreateInput,
  ActionPlanUpdateInput,
  ReadingDeleteConfirmation,
  InsightCreateInput,
  InsightUpdateInput,
} from "@/lib/types";
import { InsightCard } from "@/components/insights/InsightCard";
import { InsightAddForm } from "@/components/insights/InsightAddForm";
import { InsightEditForm } from "@/components/insights/InsightEditForm";
import { InsightActionsBar } from "@/components/insights/InsightActionsBar";
import { InsightMergeModal } from "@/components/insights/InsightMergeModal";
import { MoodChart } from "@/components/mood/MoodChart";
import { ActionPlanList } from "@/components/action-plan/ActionPlanList";
import { ActionPlanEditForm } from "@/components/action-plan/ActionPlanEditForm";
import { ReadingEditForm } from "@/components/readings/ReadingEditForm";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

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

  // 読書記録編集・削除の状態
  const [isEditingReading, setIsEditingReading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePreview, setDeletePreview] = useState<ReadingDeleteConfirmation | null>(null);

  // Insight編集・選択の状態
  const [isAddingInsight, setIsAddingInsight] = useState(false);
  const [editingInsight, setEditingInsight] = useState<Insight | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedInsightIds, setSelectedInsightIds] = useState<Set<string>>(new Set());
  const [showInsightDeleteConfirm, setShowInsightDeleteConfirm] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);

  // アクションプラン編集・削除の状態
  const [isAddingPlan, setIsAddingPlan] = useState(false);
  const [editingPlan, setEditingPlan] = useState<ActionPlan | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<ActionPlan | null>(null);

  const fetchMoodData = useCallback(async () => {
    try {
      const moods = await apiClient<MoodData[]>(`/api/readings/${readingId}/moods`);
      const before = moods.find((m) => m.mood_type === "before");
      const after = moods.find((m) => m.mood_type === "after");

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

        await fetchMoodData();

        try {
          const plansData = await getActionPlans(readingId);
          setActionPlans(plansData);
        } catch {
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

  // 読書記録の編集保存
  const handleSaveReading = async (data: {
    book?: { title: string; author: string; cover_url?: string };
    reading_context?: { motivation: string };
  }) => {
    try {
      const updated = await updateReading(readingId, data);
      setReading(updated);
      setIsEditingReading(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "保存に失敗しました");
    }
  };

  // 読書記録の削除プレビュー取得
  const handleShowDeleteConfirm = async () => {
    try {
      const preview = await previewReadingDelete(readingId);
      setDeletePreview(preview);
      setShowDeleteConfirm(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : "削除情報の取得に失敗しました");
    }
  };

  // 読書記録の削除実行
  const handleDeleteReading = async () => {
    try {
      await deleteReading(readingId);
      router.push("/home");
    } catch (err) {
      alert(err instanceof Error ? err.message : "削除に失敗しました");
    }
  };

  // 気づきの追加
  const handleAddInsight = async (data: InsightCreateInput) => {
    try {
      const created = await createInsight(readingId, data);
      setInsights((prev) => [created, ...prev]);
      setIsAddingInsight(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "追加に失敗しました");
    }
  };

  // Insightの編集保存
  const handleSaveInsight = async (data: InsightUpdateInput) => {
    if (!editingInsight) return;
    try {
      const updated = await updateInsight(readingId, editingInsight.id, data);
      setInsights((prev) =>
        prev.map((i) => (i.id === updated.id ? updated : i))
      );
      setEditingInsight(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "保存に失敗しました");
    }
  };

  // Insight選択切り替え
  const handleSelectInsight = (id: string, selected: boolean) => {
    setSelectedInsightIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  // 選択解除
  const handleCancelSelection = () => {
    setSelectedInsightIds(new Set());
    setSelectionMode(false);
  };

  // Insight削除実行
  const handleDeleteInsights = async () => {
    try {
      const ids = Array.from(selectedInsightIds);
      await deleteInsights(readingId, ids);
      setInsights((prev) => prev.filter((i) => !selectedInsightIds.has(i.id)));
      setSelectedInsightIds(new Set());
      setSelectionMode(false);
      setShowInsightDeleteConfirm(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "削除に失敗しました");
    }
  };

  // Insightマージ完了
  const handleMergeComplete = (mergedInsight: Insight) => {
    // 元のInsightを削除し、新しいマージ済みInsightを追加
    setInsights((prev) => {
      const filtered = prev.filter((i) => !selectedInsightIds.has(i.id));
      return [mergedInsight, ...filtered];
    });
    setSelectedInsightIds(new Set());
    setSelectionMode(false);
    setShowMergeModal(false);
  };

  // アクションプラン追加
  const handleAddPlan = async (data: ActionPlanCreateInput) => {
    try {
      const created = await createActionPlan(readingId, data);
      setActionPlans((prev) => [...prev, created]);
      setIsAddingPlan(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "追加に失敗しました");
    }
  };

  // アクションプラン編集
  const handleUpdatePlan = async (data: ActionPlanUpdateInput) => {
    if (!editingPlan) return;
    try {
      const updated = await updateActionPlan(readingId, editingPlan.id, data);
      setActionPlans((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p))
      );
      setEditingPlan(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "更新に失敗しました");
    }
  };

  // アクションプラン削除
  const handleDeletePlan = async () => {
    if (!deletingPlan) return;
    try {
      await deleteActionPlan(readingId, deletingPlan.id);
      setActionPlans((prev) => prev.filter((p) => p.id !== deletingPlan.id));
      setDeletingPlan(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "削除に失敗しました");
    }
  };

  if (loading || !reading) {
    return <div className="text-center py-8 text-gray-500">読み込み中...</div>;
  }

  const currentStatusOption = STATUS_OPTIONS.find(opt => opt.value === reading.status) || STATUS_OPTIONS[0];
  const selectedInsights = insights.filter((i) => selectedInsightIds.has(i.id));

  return (
    <div className={selectionMode ? "pb-24" : ""}>
      <Link href="/home" className="text-sm text-blue-600 hover:underline mb-4 inline-block">
        &larr; 読書一覧に戻る
      </Link>

      {/* 読書記録編集フォーム */}
      {isEditingReading ? (
        <div className="mb-6">
          <ReadingEditForm
            reading={reading}
            onSave={handleSaveReading}
            onCancel={() => setIsEditingReading(false)}
          />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{reading.book.title}</h1>
              <p className="text-gray-600 mt-1">{reading.book.author}</p>
            </div>
            {/* 編集・削除ボタン */}
            <div className="flex gap-2 ml-4">
              <button
                onClick={() => setIsEditingReading(true)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="編集"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={handleShowDeleteConfirm}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                title="削除"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
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

            <Link
              href={`/readings/${readingId}/report`}
              className="w-full px-6 py-3 bg-white text-indigo-600 border border-indigo-600 rounded-lg hover:bg-indigo-50 text-base font-medium flex items-center justify-center gap-2"
            >
              読書レポートを見る
            </Link>
          </div>
        </div>
      )}

      {/* 対話セッション */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          対話セッション ({sessions.length})
        </h2>
        {sessions.length === 0 ? (
          <p className="text-sm text-gray-500">まだ対話セッションがありません</p>
        ) : (
          <div className="space-y-2 max-h-[140px] overflow-y-auto">
            {sessions.map((session) => (
              <Link
                key={session.id}
                href={`/readings/${readingId}/chat?sessionId=${session.id}`}
                className="block p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 hover:shadow-sm transition-all"
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

      {/* 気づき・学び */}
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
              気づき・学び ({insights.length})
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {!selectionMode && !isAddingInsight && !editingInsight && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setIsAddingInsight(true);
                }}
                className="px-3 py-1 text-sm text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
              >
                + 追加
              </button>
            )}
            {insights.length > 1 && !isAddingInsight && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  if (selectionMode) {
                    handleCancelSelection();
                  } else {
                    setSelectionMode(true);
                  }
                }}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  selectionMode
                    ? "bg-blue-100 text-blue-700"
                    : "text-purple-600 bg-purple-50 hover:bg-purple-100"
                }`}
              >
                {selectionMode ? "選択モード終了" : "まとめて整理する"}
              </button>
            )}
          </div>
        </summary>
        <div className="px-6 pb-6">
          {/* 気づき追加フォーム */}
          {isAddingInsight && (
            <div className="mb-4">
              <InsightAddForm
                onSave={handleAddInsight}
                onCancel={() => setIsAddingInsight(false)}
              />
            </div>
          )}

          {insights.length === 0 && !isAddingInsight ? (
            <div className="text-center py-6">
              <p className="text-sm text-gray-500 mb-4">
                AIとの対話を通じて気づきが記録されます
              </p>
              <button
                onClick={() => setIsAddingInsight(true)}
                className="inline-flex items-center gap-1 px-4 py-2 text-sm text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                気づきを追加
              </button>
            </div>
          ) : (
            <div className="grid gap-3">
              {insights.map((insight) =>
                editingInsight?.id === insight.id ? (
                  <InsightEditForm
                    key={insight.id}
                    insight={insight}
                    onSave={handleSaveInsight}
                    onCancel={() => setEditingInsight(null)}
                  />
                ) : (
                  <InsightCard
                    key={insight.id}
                    insight={insight}
                    readingId={readingId}
                    showVisibilityControl={!selectionMode}
                    selectionMode={selectionMode}
                    isSelected={selectedInsightIds.has(insight.id)}
                    onSelect={handleSelectInsight}
                    onEdit={selectionMode ? undefined : setEditingInsight}
                  />
                )
              )}
            </div>
          )}
        </div>
      </details>

      {/* アクションプランセクション（常時表示） */}
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
              アクションプラン
              {actionPlans.length > 0 && (
                <span className="ml-1">
                  ({actionPlans.filter((p) => p.status === "completed").length}/
                  {actionPlans.length})
                </span>
              )}
            </h2>
          </div>
          {actionPlans.length > 0 && !isAddingPlan && !editingPlan && (
            <button
              onClick={(e) => {
                e.preventDefault();
                setIsAddingPlan(true);
              }}
              className="px-3 py-1 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              + 追加
            </button>
          )}
        </summary>
        <div className="px-6 pb-6">
          {/* 追加フォーム */}
          {isAddingPlan && (
            <div className="mb-4">
              <ActionPlanEditForm
                onSave={handleAddPlan}
                onCancel={() => setIsAddingPlan(false)}
              />
            </div>
          )}

          {/* 編集フォーム */}
          {editingPlan && (
            <div className="mb-4">
              <ActionPlanEditForm
                plan={editingPlan}
                onSave={handleUpdatePlan}
                onCancel={() => setEditingPlan(null)}
              />
            </div>
          )}

          {/* リスト */}
          {!editingPlan && (
            <ActionPlanList
              readingId={readingId}
              actionPlans={actionPlans}
              onUpdate={(updated) => {
                setActionPlans((prev) =>
                  prev.map((p) => (p.id === updated.id ? updated : p))
                );
              }}
              onAdd={() => setIsAddingPlan(true)}
              onEdit={(plan) => setEditingPlan(plan)}
              onDelete={(plan) => setDeletingPlan(plan)}
            />
          )}
        </div>
      </details>

      {/* 心境の記録・可視化セクション */}
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

      {/* Insight選択時のアクションバー */}
      {selectionMode && selectedInsightIds.size > 0 && (
        <InsightActionsBar
          selectedCount={selectedInsightIds.size}
          onDelete={() => setShowInsightDeleteConfirm(true)}
          onMerge={() => setShowMergeModal(true)}
          onCancel={handleCancelSelection}
        />
      )}

      {/* 読書記録削除確認ダイアログ */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="この読書記録を削除しますか？"
        message={
          deletePreview && (
            <div className="space-y-3">
              <p>以下のデータがすべて削除されます:</p>
              <ul className="space-y-1 text-gray-700">
                <li>📝 セッション: {deletePreview.sessions_count}件</li>
                <li>💬 メッセージ: {deletePreview.messages_count}件</li>
                <li>💡 気づき: {deletePreview.insights_count}件</li>
                <li>📊 心境記録: {deletePreview.moods_count}件</li>
                <li>📄 レポート: {deletePreview.reports_count}件</li>
                <li>✅ アクションプラン: {deletePreview.action_plans_count}件</li>
              </ul>
              <p className="text-red-600 font-medium">
                この操作は取り消せません
              </p>
            </div>
          )
        }
        confirmLabel="削除する"
        cancelLabel="キャンセル"
        variant="danger"
        confirmDelay={3000}
        onConfirm={handleDeleteReading}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* Insight削除確認ダイアログ */}
      <ConfirmDialog
        isOpen={showInsightDeleteConfirm}
        title="選択した気づきを削除しますか？"
        message={
          <p>
            {selectedInsightIds.size}件の気づきが削除されます。
            <br />
            この操作は取り消せません。
          </p>
        }
        confirmLabel="削除する"
        cancelLabel="キャンセル"
        variant="danger"
        onConfirm={handleDeleteInsights}
        onCancel={() => setShowInsightDeleteConfirm(false)}
      />

      {/* Insightマージモーダル */}
      <InsightMergeModal
        isOpen={showMergeModal}
        readingId={readingId}
        selectedInsights={selectedInsights}
        onConfirm={handleMergeComplete}
        onCancel={() => setShowMergeModal(false)}
      />

      {/* アクションプラン削除確認ダイアログ */}
      <ConfirmDialog
        isOpen={!!deletingPlan}
        title="アクションプランを削除しますか？"
        message={
          deletingPlan && (
            <p>
              「{deletingPlan.action}」を削除します。
              <br />
              この操作は取り消せません。
            </p>
          )
        }
        confirmLabel="削除する"
        cancelLabel="キャンセル"
        variant="danger"
        onConfirm={handleDeletePlan}
        onCancel={() => setDeletingPlan(null)}
      />
    </div>
  );
}
