"use client";

const VALUE_OPTIONS = [
  { value: "growth", label: "成長・学び" },
  { value: "freedom", label: "自由・独立" },
  { value: "stability", label: "安定・安心" },
  { value: "contribution", label: "貢献・社会への影響" },
  { value: "creativity", label: "創造性・表現" },
  { value: "connection", label: "人とのつながり" },
  { value: "integrity", label: "誠実さ・正直さ" },
  { value: "challenge", label: "挑戦・冒険" },
];

interface StepValuesProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function StepValues({ value, onChange }: StepValuesProps) {
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
          大切にしていることは？
        </h2>
        <p className="text-sm text-gray-600">
          あなたの価値観に合った本を見つけるヒントになります（複数選択可）
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {VALUE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => toggleOption(option.value)}
            className={`px-3 py-2 rounded-full text-sm transition-colors ${
              value.includes(option.value)
                ? "bg-purple-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
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

export { VALUE_OPTIONS };
