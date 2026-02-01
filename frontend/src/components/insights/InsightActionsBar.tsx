"use client";

interface Props {
  selectedCount: number;
  onDelete: () => void;
  onMerge: () => void;
  onCancel: () => void;
}

export function InsightActionsBar({
  selectedCount,
  onDelete,
  onMerge,
  onCancel,
}: Props) {
  const canMerge = selectedCount >= 2;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg p-4 z-40">
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <div className="text-sm text-gray-600">
          <span className="font-medium text-blue-600">{selectedCount}件</span>
          を選択中
        </div>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            選択解除
          </button>

          <button
            onClick={onMerge}
            disabled={!canMerge}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              canMerge
                ? "text-white bg-purple-600 hover:bg-purple-700"
                : "text-gray-400 bg-gray-100 cursor-not-allowed"
            }`}
            title={canMerge ? "選択した気づきを統合" : "2件以上選択してください"}
          >
            <span className="flex items-center gap-1">
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
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                />
              </svg>
              マージ
            </span>
          </button>

          <button
            onClick={onDelete}
            className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
          >
            <span className="flex items-center gap-1">
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
              削除
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
