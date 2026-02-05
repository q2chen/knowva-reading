"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getAllActionPlans, updateActionPlan, ActionPlanWithBook } from "@/lib/api";
import type { ActionPlanStatus } from "@/lib/types";

export function HomeActionPlanSection() {
  const [actionPlans, setActionPlans] = useState<ActionPlanWithBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchActionPlans = useCallback(async () => {
    try {
      const plans = await getAllActionPlans();
      setActionPlans(plans);
    } catch (error) {
      console.error("Failed to fetch action plans:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActionPlans();
  }, [fetchActionPlans]);

  const handleStatusChange = async (
    plan: ActionPlanWithBook,
    newStatus: ActionPlanStatus
  ) => {
    if (plan.status === newStatus) return;

    setUpdating(plan.id);
    try {
      await updateActionPlan(plan.readingId, plan.id, { status: newStatus });
      // 状態を更新
      setActionPlans((prev) =>
        prev.map((p) => (p.id === plan.id ? { ...p, status: newStatus } : p))
      );
    } catch (err) {
      console.error("Failed to update action plan:", err);
    } finally {
      setUpdating(null);
    }
  };

  const pendingCount = actionPlans.filter(
    (p) => p.status === "pending" || p.status === "in_progress"
  ).length;

  if (loading) {
    return (
      <section className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              <div className="h-12 bg-gray-100 rounded"></div>
              <div className="h-12 bg-gray-100 rounded"></div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 text-left"
      >
        <h2 className="text-lg font-semibold text-gray-900">
          {pendingCount > 0 ? `📋 やることリスト (${pendingCount}件)` : "📋 やることリスト"}
        </h2>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
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
      {isOpen && (
        <div className="px-6 pb-6">
          {actionPlans.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              まだアクションプランがありません
            </p>
          ) : (
            <div className="space-y-2">
              {actionPlans.map((plan) => {
                const isCompleted = plan.status === "completed";
                const isSkipped = plan.status === "skipped";

                return (
                  <div
                    key={plan.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      isCompleted
                        ? "bg-green-50 border-green-200"
                        : isSkipped
                          ? "bg-gray-50 border-gray-200 opacity-60"
                          : "bg-white border-gray-200"
                    }`}
                  >
                    {/* チェックボックス */}
                    <button
                      onClick={() =>
                        handleStatusChange(
                          plan,
                          isCompleted ? "pending" : "completed"
                        )
                      }
                      disabled={updating === plan.id}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
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

                    {/* アクション内容 */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm ${isCompleted ? "line-through text-gray-500" : "text-gray-900"}`}
                      >
                        {plan.action}
                      </p>
                    </div>

                    {/* 本のタイトルバッジ */}
                    <Link
                      href={`/readings/${plan.readingId}`}
                      className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors flex-shrink-0 max-w-[120px] truncate"
                      title={plan.bookTitle}
                    >
                      {plan.bookTitle}
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
