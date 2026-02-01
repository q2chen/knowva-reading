"use client";

import { useState } from "react";
import { updateActionPlan } from "@/lib/api";
import type { ActionPlan, ActionPlanStatus } from "@/lib/types";

interface Props {
  readingId: string;
  actionPlans: ActionPlan[];
  onUpdate?: (plan: ActionPlan) => void;
  onAdd?: () => void;
  onEdit?: (plan: ActionPlan) => void;
  onDelete?: (plan: ActionPlan) => void;
}

const DIFFICULTY_LABELS: Record<string, { label: string; color: string }> = {
  easy: { label: "簡単", color: "text-green-600 bg-green-50" },
  medium: { label: "普通", color: "text-yellow-600 bg-yellow-50" },
  hard: { label: "難しい", color: "text-red-600 bg-red-50" },
};

const STATUS_OPTIONS: { value: ActionPlanStatus; label: string }[] = [
  { value: "pending", label: "未着手" },
  { value: "in_progress", label: "進行中" },
  { value: "completed", label: "完了" },
  { value: "skipped", label: "スキップ" },
];

export function ActionPlanList({
  readingId,
  actionPlans,
  onUpdate,
  onAdd,
  onEdit,
  onDelete,
}: Props) {
  const [updating, setUpdating] = useState<string | null>(null);

  const handleStatusChange = async (
    plan: ActionPlan,
    newStatus: ActionPlanStatus
  ) => {
    if (plan.status === newStatus) return;

    setUpdating(plan.id);
    try {
      const updated = await updateActionPlan(readingId, plan.id, {
        status: newStatus,
      });
      onUpdate?.(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : "更新に失敗しました");
    } finally {
      setUpdating(null);
    }
  };

  if (actionPlans.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-gray-500 mb-4">
          まだアクションプランがありません
        </p>
        {onAdd && (
          <button
            onClick={onAdd}
            className="inline-flex items-center gap-1 px-4 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
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
            アクションプランを追加
          </button>
        )}
      </div>
    );
  }

  const completedCount = actionPlans.filter(
    (p) => p.status === "completed"
  ).length;
  const progress = Math.round((completedCount / actionPlans.length) * 100);

  return (
    <div className="space-y-4">
      {/* 進捗バー */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-sm text-gray-600 whitespace-nowrap">
          {completedCount} / {actionPlans.length} 完了
        </span>
      </div>

      {/* アクションプランリスト */}
      <div className="space-y-3">
        {actionPlans.map((plan) => {
          const difficultyInfo =
            DIFFICULTY_LABELS[plan.difficulty] || DIFFICULTY_LABELS.medium;
          const isCompleted = plan.status === "completed";
          const isSkipped = plan.status === "skipped";

          return (
            <div
              key={plan.id}
              className={`p-4 rounded-lg border ${
                isCompleted
                  ? "bg-green-50 border-green-200"
                  : isSkipped
                    ? "bg-gray-50 border-gray-200 opacity-60"
                    : "bg-white border-gray-200"
              }`}
            >
              <div className="flex items-start gap-3">
                {/* チェックボックス風の状態表示 */}
                <button
                  onClick={() =>
                    handleStatusChange(
                      plan,
                      isCompleted ? "pending" : "completed"
                    )
                  }
                  disabled={updating === plan.id}
                  className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    isCompleted
                      ? "bg-green-500 border-green-500 text-white"
                      : "border-gray-300 hover:border-green-400"
                  } ${updating === plan.id ? "opacity-50" : ""}`}
                >
                  {isCompleted && (
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </button>

                <div className="flex-1">
                  <p
                    className={`text-sm font-medium ${isCompleted ? "line-through text-gray-500" : "text-gray-900"}`}
                  >
                    {plan.action}
                  </p>
                  {plan.relevance && (
                    <p className="text-xs text-gray-500 mt-1">{plan.relevance}</p>
                  )}

                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${difficultyInfo.color}`}
                    >
                      {difficultyInfo.label}
                    </span>
                    {plan.timeframe && (
                      <span className="text-xs text-gray-400">
                        {plan.timeframe}
                      </span>
                    )}
                  </div>
                </div>

                {/* アクションボタン */}
                <div className="flex items-center gap-1">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(plan)}
                      className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                      title="編集"
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
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(plan)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="削除"
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
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  )}
                </div>

                {/* ステータス変更ドロップダウン */}
                <select
                  value={plan.status}
                  onChange={(e) =>
                    handleStatusChange(plan, e.target.value as ActionPlanStatus)
                  }
                  disabled={updating === plan.id}
                  className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
