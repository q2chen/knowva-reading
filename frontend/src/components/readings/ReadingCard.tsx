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
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">
            {reading.book.title}
          </h3>
          <p className="text-sm text-gray-600 mt-1">{reading.book.author}</p>
        </div>
        <span className={`ml-2 px-2 py-1 text-xs rounded-full ${statusColor}`}>
          {statusLabel}
        </span>
      </div>
      {reading.latest_summary && (
        <p className="mt-2 text-sm text-gray-500 line-clamp-2">
          {reading.latest_summary}
        </p>
      )}
      <p className="mt-2 text-xs text-gray-400">
        {new Date(reading.start_date).toLocaleDateString("ja-JP")} 開始
      </p>
    </Link>
  );
}
