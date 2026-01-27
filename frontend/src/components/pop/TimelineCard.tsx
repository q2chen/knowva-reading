import type { ReadingStatus, TimelineInsight } from "@/lib/types";

interface TimelineCardProps {
  insight: TimelineInsight;
}

const typeLabels: Record<TimelineInsight["type"], string> = {
  learning: "学び",
  impression: "印象",
  question: "疑問",
  connection: "つながり",
};

const typeColors: Record<TimelineInsight["type"], string> = {
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

export default function TimelineCard({ insight }: TimelineCardProps) {
  const publishedDate = new Date(insight.published_at).toLocaleDateString(
    "ja-JP",
    {
      month: "short",
      day: "numeric",
    }
  );

  return (
    <article className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      {/* ヘッダー: 本の情報 */}
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-shrink-0 w-10 h-14 bg-gradient-to-br from-amber-100 to-amber-200 rounded flex items-center justify-center">
          <svg
            className="w-5 h-5 text-amber-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate">
            {insight.book.title}
          </h3>
          <p className="text-xs text-gray-500 truncate">{insight.book.author}</p>
        </div>
      </div>

      {/* 気づきの内容 */}
      <div className="mb-3">
        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
          {insight.content}
        </p>
      </div>

      {/* フッター: タイプ、投稿者、日付 */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded-full ${typeColors[insight.type]}`}
          >
            {typeLabels[insight.type]}
          </span>
          {insight.reading_status && (
            <span
              className={`px-2 py-0.5 rounded-full ${statusColors[insight.reading_status]}`}
            >
              {statusLabels[insight.reading_status]}
            </span>
          )}
          {insight.is_own && (
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
              自分
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-gray-500">
          <span className="flex items-center gap-1">
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            {insight.display_name}
          </span>
          <span>{publishedDate}</span>
        </div>
      </div>
    </article>
  );
}
