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

  return (
    <div className="p-3 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
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
        {showVisibilityControl && readingId && (
          <VisibilitySelector
            currentVisibility={currentVisibility}
            onVisibilityChange={handleVisibilityChange}
          />
        )}
      </div>
      <p className="text-sm text-gray-800">{insight.content}</p>
    </div>
  );
}
