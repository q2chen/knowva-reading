"use client";

import Link from "next/link";

interface ReadingItem {
  id: string;
  bookTitle: string;
}

interface Props {
  readings: ReadingItem[];
  position?: "left" | "right";
  onToggleVisibility?: () => void;
}

export function QuickVoiceFAB({ readings, position = "left", onToggleVisibility }: Props) {
  // 最大2冊まで表示
  const displayReadings = readings.slice(0, 2);

  const positionClass = position === "left" ? "left-6" : "right-6";

  return (
    <div className={`fixed bottom-20 md:bottom-6 ${positionClass} z-[9999] flex flex-col gap-3 items-start`}>
      {displayReadings.map((reading) => (
        <Link
          key={reading.id}
          href={`/quick-voice?readingId=${reading.id}`}
          className="flex items-center gap-3 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
          aria-label={`${reading.bookTitle} に音声入力`}
        >
          {/* マイクアイコン */}
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20">
            <MicIcon className="w-4 h-4" />
          </span>

          {/* 本のタイトル（短縮表示） */}
          <span className="text-sm font-medium max-w-[120px] truncate">
            {truncateTitle(reading.bookTitle, 10)}
          </span>
        </Link>
      ))}
      {/* 表示/非表示切り替えボタン */}
      {onToggleVisibility && (
        <button
          onClick={onToggleVisibility}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-2 py-1"
        >
          非表示
        </button>
      )}
    </div>
  );
}

function truncateTitle(title: string, maxLength: number): string {
  if (title.length <= maxLength) {
    return title;
  }
  return title.slice(0, maxLength) + "...";
}

function MicIcon({ className }: { className?: string }) {
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
        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
      />
    </svg>
  );
}
