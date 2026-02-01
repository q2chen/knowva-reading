"use client";

import { useState } from "react";
import { Insight, InsightVisibility, ReadingStatus } from "@/lib/types";
import { updateInsightVisibility } from "@/lib/api";
import VisibilitySelector from "./VisibilitySelector";

interface Props {
  insight: Insight;
  readingId?: string;
  showVisibilityControl?: boolean;
  onVisibilityChange?: (insightId: string, visibility: InsightVisibility) => void;
  // 選択モード用
  selectionMode?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  onEdit?: (insight: Insight) => void;
}

const typeLabels: Record<Insight["type"], string> = {
  learning: "学び",
  impression: "印象",
  question: "疑問",
  connection: "自分との関連",
};

const typeColors: Record<Insight["type"], string> = {
  learning: "bg-purple-100 text-purple-700",
  impression: "bg-yellow-100 text-yellow-700",
  question: "bg-orange-100 text-orange-700",
  connection: "bg-green-100 text-green-700",
};

const statusLabels: Record<ReadingStatus, string> = {
  not_started: "読書前",
  reading: "読書中",
  completed: "読了後",
};

const statusColors: Record<ReadingStatus, string> = {
  not_started: "bg-amber-50 text-amber-600",
  reading: "bg-blue-50 text-blue-600",
  completed: "bg-green-50 text-green-600",
};

export function InsightCard({
  insight,
  readingId,
  showVisibilityControl = false,
  onVisibilityChange,
  selectionMode = false,
  isSelected = false,
  onSelect,
  onEdit,
}: Props) {
  const [currentVisibility, setCurrentVisibility] = useState<InsightVisibility>(
    insight.visibility || "private"
  );

  const handleVisibilityChange = async (visibility: InsightVisibility) => {
    if (!readingId) return;

    await updateInsightVisibility(readingId, insight.id, visibility);
    setCurrentVisibility(visibility);
    onVisibilityChange?.(insight.id, visibility);
  };

  const handleCheckboxChange = () => {
    onSelect?.(insight.id, !isSelected);
  };

  return (
    <div
      className={`p-3 bg-white rounded-lg border transition-colors ${
        isSelected
          ? "border-blue-500 bg-blue-50"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <div className="flex items-center gap-3">
        {/* 選択モード時のチェックボックス */}
        {selectionMode && (
          <button
            onClick={handleCheckboxChange}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
              isSelected
                ? "bg-blue-500 border-blue-500 text-white"
                : "border-gray-300 hover:border-blue-400"
            }`}
          >
            {isSelected && (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`px-2 py-0.5 text-xs rounded-full ${typeColors[insight.type]}`}
              >
                {typeLabels[insight.type]}
              </span>
              {insight.reading_status && (
                <span
                  className={`px-2 py-0.5 text-xs rounded-full ${statusColors[insight.reading_status]}`}
                >
                  {statusLabels[insight.reading_status]}
                </span>
              )}
              <span className="text-xs text-gray-400">
                {new Date(insight.created_at).toLocaleDateString("ja-JP")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* 編集ボタン（選択モード以外で表示） */}
              {!selectionMode && onEdit && (
                <button
                  onClick={() => onEdit(insight)}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
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
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
              )}
              {showVisibilityControl && readingId && !selectionMode && (
                <VisibilitySelector
                  currentVisibility={currentVisibility}
                  onVisibilityChange={handleVisibilityChange}
                />
              )}
            </div>
          </div>
          <p className="text-sm text-gray-800">{insight.content}</p>
        </div>
      </div>
    </div>
  );
}
