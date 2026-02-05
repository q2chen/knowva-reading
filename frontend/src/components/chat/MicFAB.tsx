"use client";

import Link from "next/link";

interface Props {
  readingId: string;
  sessionId: string;
}

export function MicFAB({ readingId, sessionId }: Props) {
  return (
    <Link
      href={`/quick-voice?readingId=${readingId}&sessionId=${sessionId}`}
      className="fixed bottom-24 right-4 z-50 flex items-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg transition-all"
      aria-label="音声メモ（複数まとめて送信）"
    >
      <MicIcon className="w-5 h-5" />
      <span className="text-sm font-medium whitespace-nowrap">音声メモ</span>
    </Link>
  );
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
