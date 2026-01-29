"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  apiClient,
  generateReportStream,
  getLatestReport,
  getActionPlans,
} from "@/lib/api";
import type { Reading, Report, ActionPlan } from "@/lib/types";
import { ReportView } from "@/components/report/ReportView";
import { ActionPlanList } from "@/components/action-plan/ActionPlanList";

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const readingId = params.readingId as string;

  const [reading, setReading] = useState<Reading | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatingText, setGeneratingText] = useState("");
  const [error, setError] = useState<string | null>(null);

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
  }, [fetchData]);

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

      {/* アクションプラン */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          アクションプラン
        </h2>
        <ActionPlanList
          readingId={readingId}
          actionPlans={actionPlans}
          onUpdate={handleActionPlanUpdate}
        />
      </div>
    </div>
  );
}
