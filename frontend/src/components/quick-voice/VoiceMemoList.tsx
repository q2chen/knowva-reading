"use client";

export interface VoiceMemo {
  id: string;
  text: string;
  createdAt: Date;
}

interface Props {
  memos: VoiceMemo[];
  onDelete: (id: string) => void;
}

export function VoiceMemoList({ memos, onDelete }: Props) {
  if (memos.length === 0) {
    return (
      <div className="text-center py-4 text-gray-400 text-sm">
        録音したメモがここに表示されます
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[200px] overflow-y-auto">
      {memos.map((memo, index) => (
        <div
          key={memo.id}
          className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg"
        >
          <span className="text-gray-400 text-sm font-medium min-w-[24px]">
            {index + 1}.
          </span>
          <p className="flex-1 text-gray-800 text-sm leading-relaxed">
            {memo.text}
          </p>
          <button
            onClick={() => onDelete(memo.id)}
            className="p-1 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
            aria-label="メモを削除"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}
