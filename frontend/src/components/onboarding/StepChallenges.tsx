"use client";

import { useState } from "react";

const CHALLENGE_OPTIONS = [
  { value: "career_direction", label: "キャリアの方向性" },
  { value: "skill_up", label: "スキルアップ" },
  { value: "communication", label: "人間関係・コミュニケーション" },
  { value: "management", label: "マネジメント・リーダーシップ" },
  { value: "work_life_balance", label: "ワークライフバランス" },
  { value: "self_understanding", label: "自己理解・自分探し" },
  { value: "money", label: "お金・資産形成" },
  { value: "health", label: "健康・メンタル" },
];

interface StepChallengesProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function StepChallenges({ value, onChange }: StepChallengesProps) {
  const [customInput, setCustomInput] = useState("");

  const toggleOption = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  const addCustom = () => {
    if (customInput.trim() && !value.includes(customInput.trim())) {
      onChange([...value, customInput.trim()]);
      setCustomInput("");
    }
  };

  const removeCustom = (item: string) => {
    onChange(value.filter((v) => v !== item));
  };

  // カスタム入力された項目（定義済みオプションにないもの）
  const customItems = value.filter(
    (v) => !CHALLENGE_OPTIONS.some((opt) => opt.value === v)
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          今、気になっていることは？
        </h2>
        <p className="text-sm text-gray-600">
          読書で解決したい課題や悩みを選んでください（複数選択可）
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {CHALLENGE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => toggleOption(option.value)}
            className={`px-3 py-2 rounded-full text-sm transition-colors ${
              value.includes(option.value)
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* カスタム入力 */}
      <div className="pt-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="その他（自由入力）"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              }
            }}
          />
          <button
            type="button"
            onClick={addCustom}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
          >
            追加
          </button>
        </div>
      </div>

      {/* カスタム項目表示 */}
      {customItems.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {customItems.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded-full text-sm"
            >
              {item}
              <button
                type="button"
                onClick={() => removeCustom(item)}
                className="hover:text-blue-200"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400">
        選択中: {value.length}件（スキップも可能です）
      </p>
    </div>
  );
}

export { CHALLENGE_OPTIONS };
