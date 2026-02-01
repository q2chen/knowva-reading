"use client";

import { useState } from "react";
import type {
  ActionPlan,
  ActionPlanCreateInput,
  ActionPlanUpdateInput,
  ActionPlanDifficulty,
} from "@/lib/types";

interface BaseProps {
  onCancel: () => void;
}

interface CreateProps extends BaseProps {
  plan?: undefined;
  onSave: (data: ActionPlanCreateInput) => Promise<void>;
}

interface EditProps extends BaseProps {
  plan: ActionPlan;
  onSave: (data: ActionPlanUpdateInput) => Promise<void>;
}

type Props = CreateProps | EditProps;

const DIFFICULTY_OPTIONS: { value: ActionPlanDifficulty; label: string }[] = [
  { value: "easy", label: "簡単" },
  { value: "medium", label: "普通" },
  { value: "hard", label: "難しい" },
];

export function ActionPlanEditForm(props: Props) {
  const { onCancel } = props;
  const plan = props.plan;

  const [action, setAction] = useState(plan?.action || "");
  const [relevance, setRelevance] = useState(plan?.relevance || "");
  const [difficulty, setDifficulty] = useState<ActionPlanDifficulty>(
    plan?.difficulty || "medium"
  );
  const [timeframe, setTimeframe] = useState(plan?.timeframe || "");
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = !!plan;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!action.trim()) return;

    setIsSaving(true);
    try {
      if (plan) {
        // 編集モード
        const updateData: ActionPlanUpdateInput = {};
        if (action !== plan.action) updateData.action = action.trim();
        if (relevance !== plan.relevance) updateData.relevance = relevance.trim();
        if (difficulty !== plan.difficulty) updateData.difficulty = difficulty;
        if (timeframe !== plan.timeframe) updateData.timeframe = timeframe.trim();
        await (props as EditProps).onSave(updateData);
      } else {
        // 新規作成モード
        await (props as CreateProps).onSave({
          action: action.trim(),
          relevance: relevance.trim() || undefined,
          difficulty,
          timeframe: timeframe.trim() || undefined,
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = isEditing
    ? action !== plan.action ||
      relevance !== plan.relevance ||
      difficulty !== plan.difficulty ||
      timeframe !== plan.timeframe
    : action.trim().length > 0;

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-lg border border-blue-200 shadow-sm p-4"
    >
      <h3 className="text-base font-semibold text-gray-900 mb-4">
        {isEditing ? "アクションプランを編集" : "アクションプランを追加"}
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            アクション <span className="text-red-500">*</span>
          </label>
          <textarea
            value={action}
            onChange={(e) => setAction(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="具体的なアクションを入力..."
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            関連性（任意）
          </label>
          <textarea
            value={relevance}
            onChange={(e) => setRelevance(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="このアクションが自分に関連する理由..."
          />
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              難易度
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as ActionPlanDifficulty)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {DIFFICULTY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              期限（任意）
            </label>
            <input
              type="text"
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例: 1週間"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2 justify-end mt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={!hasChanges || !action.trim() || isSaving}
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? "保存中..." : "保存"}
        </button>
      </div>
    </form>
  );
}
