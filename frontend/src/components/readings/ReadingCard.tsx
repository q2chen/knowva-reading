import Link from "next/link";
import { Reading } from "@/lib/types";

interface Props {
  reading: Reading;
}

export function ReadingCard({ reading }: Props) {
  const statusLabel = 
    reading.status === "completed" 
      ? "読了" 
      : reading.status === "not_started" 
        ? "読書前" 
        : "読書中";
  const statusColor =
    reading.status === "completed"
      ? "bg-green-100 text-green-700"
      : reading.status === "not_started"
        ? "bg-gray-100 text-gray-700"
        : "bg-blue-100 text-blue-700";

  return (
    <Link
      href={`/readings/${reading.id}`}
      className="block p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
    >
      <div className="flex gap-3">
        {reading.book.cover_url ? (
          <img
            src={reading.book.cover_url}
            alt=""
            className="w-12 h-16 object-cover rounded flex-shrink-0"
          />
        ) : (
          <div className="w-12 h-16 bg-gray-100 rounded flex-shrink-0 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-gray-400"
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
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">
                {reading.book.title}
              </h3>
              <p className="text-sm text-gray-600 mt-0.5">{reading.book.author}</p>
            </div>
            <span className={`flex-shrink-0 px-2 py-1 text-xs rounded-full ${statusColor}`}>
              {statusLabel}
            </span>
          </div>
          {reading.latest_summary && (
            <p className="mt-1.5 text-sm text-gray-500 line-clamp-2">
              {reading.latest_summary}
            </p>
          )}
          <p className="mt-1.5 text-xs text-gray-400">
            {new Date(reading.start_date).toLocaleDateString("ja-JP")} 開始
          </p>
        </div>
      </div>
    </Link>
  );
}
