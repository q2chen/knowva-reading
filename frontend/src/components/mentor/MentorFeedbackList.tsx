"use client";

import { useEffect, useState } from "react";
import { getMentorFeedbacks } from "@/lib/api";
import { MentorFeedbackCard } from "./MentorFeedbackCard";
import type { MentorFeedback } from "@/lib/types";

interface Props {
  refreshTrigger?: number;
}

export function MentorFeedbackList({ refreshTrigger }: Props) {
  const [feedbacks, setFeedbacks] = useState<MentorFeedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFeedbacks() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getMentorFeedbacks(20);
        setFeedbacks(data);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "フィードバックの取得に失敗しました"
        );
      } finally {
        setIsLoading(false);
      }
    }
    fetchFeedbacks();
  }, [refreshTrigger]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500 animate-pulse">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (feedbacks.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow">
        <p className="text-gray-500 text-lg">📭 振り返り履歴がありません</p>
        <p className="text-gray-400 text-sm mt-2">
          「対話」タブで週次/月次の振り返りを生成してみましょう
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {feedbacks.map((feedback) => (
        <MentorFeedbackCard key={feedback.id} feedback={feedback} />
      ))}
    </div>
  );
}
