"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  apiClient,
  generateReportStream,
  getLatestReport,
  getActionPlans,
  createActionPlan,
  updateActionPlan,
  deleteActionPlan,
} from "@/lib/api";
import type {
  Reading,
  Report,
  ActionPlan,
  ActionPlanCreateInput,
  ActionPlanUpdateInput,
  MoodComparison,
  MoodData,
} from "@/lib/types";
import { ReportView } from "@/components/report/ReportView";
import { ActionPlanList } from "@/components/action-plan/ActionPlanList";
import { ActionPlanEditForm } from "@/components/action-plan/ActionPlanEditForm";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { MoodChart } from "@/components/mood/MoodChart";

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const readingId = params.readingId as string;

  const [reading, setReading] = useState<Reading | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([]);
  const [moodComparison, setMoodComparison] = useState<MoodComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatingText, setGeneratingText] = useState("");
  const [error, setError] = useState<string | null>(null);

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
      setMoodComparison(null);
    }
  }, [readingId]);

  const fetchData = useCallback(async () => {
    try {
      const [readingData, reportData, plansData] = await Promise.all([
        apiClient<Reading>(`/api/readings/${readingId}`),
        getLatestReport(readingId),
        getActionPlans(readingId),
      ]);
      setReading(readingData);
      setReport(reportData);
      setActionPlans(plansData);
    } catch {
      router.push("/home");
    } finally {
      setLoading(false);
    }
  }, [readingId, router]);

  useEffect(() => {
    fetchData();
    fetchMoodData();
  }, [fetchData, fetchMoodData]);

  const handleGenerate = async () => {
    setGenerating(true);
    setGeneratingText("");
    setError(null);

    try {
      await generateReportStream(readingId, {
        onTextDelta: (data) => {
          setGeneratingText((prev) => prev + data.delta);
        },
        onMessageDone: () => {
          // 生成完了後にデータを再取得
          fetchData();
          setGenerating(false);
        },
        onError: (data) => {
          setError(data.message);
          setGenerating(false);
        },
        onConnectionError: (err) => {
          setError(err.message);
          setGenerating(false);
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setGenerating(false);
    }
  };

  const handleActionPlanUpdate = (updated: ActionPlan) => {
    setActionPlans((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    );
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

  return (
    <div>
      <Link
        href={`/readings/${readingId}`}
        className="text-sm text-blue-600 hover:underline mb-4 inline-block"
      >
        &larr; 読書詳細に戻る
      </Link>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">読書レポート</h1>
            <p className="text-gray-600 mt-1">
              {reading.book.title} - {reading.book.author}
            </p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              generating
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-indigo-600 text-white hover:bg-indigo-700"
            }`}
          >
            {generating ? "生成中..." : report ? "再生成" : "レポートを生成"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* 生成中の表示 */}
      {generating && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-600">レポートを生成中...</span>
          </div>
          <div className="prose prose-sm max-w-none">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded">
              {generatingText || "コンテキストを分析しています..."}
            </pre>
          </div>
        </div>
      )}

      {/* レポート表示 */}
      {!generating && report && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <ReportView report={report} />
        </div>
      )}

      {/* おすすめのアクションプラン */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-900">
            おすすめのアクションプラン
            {actionPlans.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({actionPlans.filter((p) => p.status === "completed").length}/
                {actionPlans.length} 完了)
              </span>
            )}
          </h2>
          {actionPlans.length > 0 && !isAddingPlan && !editingPlan && (
            <button
              onClick={() => setIsAddingPlan(true)}
              className="px-3 py-1 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              + 追加
            </button>
          )}
        </div>
        <p className="text-sm text-gray-500 mb-4">
          AIから提案されたアクションプランのアイデアです。好みに合わせて自由に編集しましょう。
        </p>

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
            onUpdate={handleActionPlanUpdate}
            onAdd={() => setIsAddingPlan(true)}
            onEdit={(plan) => setEditingPlan(plan)}
            onDelete={(plan) => setDeletingPlan(plan)}
          />
        )}
      </div>

      {/* 心境の変化 */}
      {moodComparison && (moodComparison.before_mood || moodComparison.after_mood) && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">心境の変化</h2>
          <p className="text-sm text-gray-500 mb-4">
            AIとの対話から自動記録されました
          </p>
          <MoodChart comparison={moodComparison} />
        </div>
      )}

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
