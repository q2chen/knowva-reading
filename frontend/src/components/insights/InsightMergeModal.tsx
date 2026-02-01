"use client";

import { useState, useEffect } from "react";
import { Insight, InsightType } from "@/lib/types";
import { previewInsightMerge, confirmInsightMerge } from "@/lib/api";

interface Props {
  isOpen: boolean;
  readingId: string;
  selectedInsights: Insight[];
  onConfirm: (mergedInsight: Insight) => void;
  onCancel: () => void;
}

const typeOptions: { value: InsightType; label: string }[] = [
  { value: "learning", label: "学び" },
  { value: "impression", label: "印象" },
  { value: "question", label: "疑問" },
  { value: "connection", label: "自分との関連" },
];

const typeLabels: Record<InsightType, string> = {
  learning: "学び",
  impression: "印象",
  question: "疑問",
  connection: "自分との関連",
};

export function InsightMergeModal({
  isOpen,
  readingId,
  selectedInsights,
  onConfirm,
  onCancel,
}: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [mergedContent, setMergedContent] = useState("");
  const [selectedType, setSelectedType] = useState<InsightType>("learning");
  const [error, setError] = useState<string | null>(null);

  // モーダルが開いたときにLLMでマージプレビューを生成
  useEffect(() => {
    if (isOpen && selectedInsights.length >= 2) {
      generatePreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const generatePreview = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const insightIds = selectedInsights.map((i) => i.id);
      const preview = await previewInsightMerge(readingId, insightIds);
      setMergedContent(preview.merged_content);
      setSelectedType(preview.suggested_type);
    } catch (e) {
      setError(e instanceof Error ? e.message : "プレビュー生成に失敗しました");
      // フォールバック: 単純に連結
      setMergedContent(selectedInsights.map((i) => i.content).join("\n\n"));
      setSelectedType(selectedInsights[0]?.type || "learning");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!mergedContent.trim()) return;

    setIsConfirming(true);
    try {
      const insightIds = selectedInsights.map((i) => i.id);
      const mergedInsight = await confirmInsightMerge(readingId, {
        insight_ids: insightIds,
        merged_content: mergedContent.trim(),
        type: selectedType,
      });
      onConfirm(mergedInsight);
    } catch (e) {
      setError(e instanceof Error ? e.message : "マージに失敗しました");
    } finally {
      setIsConfirming(false);
    }
  };

  // ESCキーでキャンセル
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoading && !isConfirming) {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, isConfirming, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      {/* 背景オーバーレイ */}
      <div className="absolute inset-0 bg-black/50" />

      {/* モーダル本体 */}
      <div
        className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            気づきをマージ
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {selectedInsights.length}件の気づきを1つに統合します
          </p>
        </div>

        {/* コンテンツ */}
        <div className="p-4 overflow-y-auto flex-1">
          {/* 元の気づき一覧 */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              統合される気づき
            </h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {selectedInsights.map((insight) => (
                <div
                  key={insight.id}
                  className="p-2 bg-gray-50 rounded border border-gray-200 text-sm"
                >
                  <span className="text-xs text-gray-500 mr-2">
                    [{typeLabels[insight.type]}]
                  </span>
                  {insight.content}
                </div>
              ))}
            </div>
          </div>

          {/* ローディング状態 */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2 text-gray-500">
                <svg
                  className="animate-spin h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>AIが統合テキストを生成中...</span>
              </div>
            </div>
          )}

          {/* エラー表示 */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          {/* マージ結果編集エリア */}
          {!isLoading && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  タイプ
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as InsightType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {typeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  統合された気づき
                  <span className="text-gray-400 font-normal ml-2">
                    （編集可能）
                  </span>
                </label>
                <textarea
                  value={mergedContent}
                  onChange={(e) => setMergedContent(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  placeholder="統合された気づきの内容"
                />
              </div>

              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
                マージを確定すると、元の{selectedInsights.length}
                件の気づきは削除され、この統合された気づきに置き換わります。
              </div>
            </>
          )}
        </div>

        {/* フッター */}
        <div className="p-4 border-t border-gray-200 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isConfirming}
            className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || isConfirming || !mergedContent.trim()}
            className="px-4 py-2 text-sm text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed transition-colors"
          >
            {isConfirming ? "マージ中..." : "マージを確定"}
          </button>
        </div>
      </div>
    </div>
  );
}
