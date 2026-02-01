"use client";

const LIFE_STAGE_OPTIONS = [
  { value: "student", label: "学生" },
  { value: "early_career", label: "若手社会人（1-5年目）" },
  { value: "mid_career", label: "中堅社会人（6-15年目）" },
  { value: "manager", label: "管理職・マネージャー" },
  { value: "executive", label: "経営者・役員" },
  { value: "freelance", label: "フリーランス・自営業" },
  { value: "other", label: "その他" },
];

interface StepLifeStageProps {
  value: string;
  onChange: (value: string) => void;
}

export function StepLifeStage({ value, onChange }: StepLifeStageProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          今のライフステージは？
        </h2>
        <p className="text-sm text-gray-600">
          あなたに合った本や対話をお届けするために教えてください。
        </p>
      </div>
      <div className="grid gap-2">
        {LIFE_STAGE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`w-full px-4 py-3 text-left rounded-lg border transition-colors ${
              value === option.value
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export { LIFE_STAGE_OPTIONS };
