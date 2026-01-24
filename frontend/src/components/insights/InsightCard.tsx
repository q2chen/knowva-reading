import { Insight } from "@/lib/types";

interface Props {
  insight: Insight;
}

const typeLabels: Record<Insight["type"], string> = {
  learning: "学び",
  impression: "印象",
  question: "疑問",
  connection: "自分との関連",
};

const typeColors: Record<Insight["type"], string> = {
  learning: "bg-purple-100 text-purple-700",
  impression: "bg-yellow-100 text-yellow-700",
  question: "bg-orange-100 text-orange-700",
  connection: "bg-green-100 text-green-700",
};

export function InsightCard({ insight }: Props) {
  return (
    <div className="p-3 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center gap-2 mb-2">
        <span className={`px-2 py-0.5 text-xs rounded-full ${typeColors[insight.type]}`}>
          {typeLabels[insight.type]}
        </span>
        <span className="text-xs text-gray-400">
          {new Date(insight.created_at).toLocaleDateString("ja-JP")}
        </span>
      </div>
      <p className="text-sm text-gray-800">{insight.content}</p>
    </div>
  );
}
