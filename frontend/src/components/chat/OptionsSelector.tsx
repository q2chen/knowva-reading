"use client";

import { useState } from "react";
import type { OptionsState } from "@/lib/types";

interface Props {
  options: OptionsState;
  onSelect: (selectedOptions: string[]) => void;
  onDismiss: () => void;
  disabled?: boolean;
}

export function OptionsSelector({
  options,
  onSelect,
  onDismiss,
  disabled = false,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const handleToggle = (option: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(option)) {
      newSelected.delete(option);
    } else {
      if (options.allowMultiple) {
        newSelected.add(option);
      } else {
        // 単一選択の場合は既存の選択をクリア
        newSelected.clear();
        newSelected.add(option);
      }
    }
    setSelected(newSelected);
  };

  const handleSubmit = () => {
    if (selected.size > 0) {
      onSelect(Array.from(selected));
    }
  };

  const handleQuickSelect = (option: string) => {
    // 即座に単一選択で送信
    onSelect([option]);
  };

  return (
    <div className="relative bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100 shadow-sm">
      <p className="text-sm text-gray-700 mb-3 font-medium pr-6">{options.prompt}</p>
      
      <div className="flex flex-wrap gap-2 mb-3">
        {options.options.map((option, index) => (
          <button
            key={index}
            onClick={() => 
              options.allowMultiple 
                ? handleToggle(option) 
                : handleQuickSelect(option)
            }
            disabled={disabled}
            className={`px-3 py-2 text-sm rounded-full border transition-all ${
              selected.has(option)
                ? "bg-blue-600 text-white border-blue-600 shadow-md"
                : "bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-blue-50"
            } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            {options.allowMultiple && (
              <span className="mr-1">
                {selected.has(option) ? "✓" : "○"}
              </span>
            )}
            {option}
          </button>
        ))}
      </div>

      {options.allowMultiple && selected.size > 0 && (
        <div className="flex items-center gap-2">
          <button
            onClick={handleSubmit}
            disabled={disabled}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            選択した内容を送信 ({selected.size}件)
          </button>
          <button
            onClick={() => setSelected(new Set())}
            disabled={disabled}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            クリア
          </button>
        </div>
      )}

      {options.allowFreeform && (
        <p className="text-xs text-gray-400 mt-3">
          💡 選択肢を選ばずに、下の入力欄から自由に入力することもできます
        </p>
      )}

      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-sm"
        aria-label="閉じる"
      >
        ✕
      </button>
    </div>
  );
}
