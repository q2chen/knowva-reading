"use client";

const INTEREST_OPTIONS = [
  { value: "business", label: "ビジネス・経営" },
  { value: "self_help", label: "自己啓発・成長" },
  { value: "fiction", label: "小説・文学" },
  { value: "history", label: "歴史・伝記" },
  { value: "science", label: "科学・テクノロジー" },
  { value: "philosophy", label: "哲学・思想" },
  { value: "psychology", label: "心理学・脳科学" },
  { value: "society", label: "社会・経済" },
  { value: "art", label: "アート・デザイン" },
  { value: "other", label: "その他" },
];

interface StepInterestsProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function StepInterests({ value, onChange }: StepInterestsProps) {
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
          興味のあるジャンルは？
        </h2>
        <p className="text-sm text-gray-600">
          よく読むジャンルや気になるジャンルを選んでください（複数選択可）
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {INTEREST_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => toggleOption(option.value)}
            className={`px-3 py-2 rounded-full text-sm transition-colors ${
              value.includes(option.value)
                ? "bg-green-500 text-white"
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

export { INTEREST_OPTIONS };
