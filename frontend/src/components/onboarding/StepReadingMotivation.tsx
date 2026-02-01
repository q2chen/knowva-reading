"use client";

const MOTIVATION_OPTIONS = [
  { value: "skill", label: "仕事に活かす知識・スキルを得たい" },
  { value: "perspective", label: "視野を広げ、新しい考え方に触れたい" },
  { value: "relax", label: "リラックス・気分転換" },
  { value: "culture", label: "教養を身につけたい" },
  { value: "self_reflection", label: "自分自身を見つめ直したい" },
  { value: "problem_solving", label: "特定の課題を解決したい" },
];

interface StepReadingMotivationProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function StepReadingMotivation({
  value,
  onChange,
}: StepReadingMotivationProps) {
  const toggleOption = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          読書の目的は？
        </h2>
        <p className="text-sm text-gray-600">
          当てはまるものを選んでください（複数選択可）
        </p>
      </div>
      <div className="grid gap-2">
        {MOTIVATION_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => toggleOption(option.value)}
            className={`w-full px-4 py-3 text-left rounded-lg border transition-colors ${
              value.includes(option.value)
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-400">
        選択中: {value.length}件（スキップも可能です）
      </p>
    </div>
  );
}

export { MOTIVATION_OPTIONS };
