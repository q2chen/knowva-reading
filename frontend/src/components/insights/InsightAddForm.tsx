"use client";

import { useState } from "react";
import { InsightType, InsightCreateInput } from "@/lib/types";

interface Props {
  onSave: (data: InsightCreateInput) => Promise<void>;
  onCancel: () => void;
}

const typeOptions: { value: InsightType; label: string }[] = [
  { value: "learning", label: "学び" },
  { value: "impression", label: "印象" },
  { value: "question", label: "疑問" },
  { value: "connection", label: "自分との関連" },
];

export function InsightAddForm({ onSave, onCancel }: Props) {
  const [content, setContent] = useState("");
  const [type, setType] = useState<InsightType>("learning");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSaving(true);
    try {
      await onSave({ content: content.trim(), type });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 bg-white rounded-lg border border-purple-200 shadow-sm"
    >
      <h3 className="text-base font-semibold text-gray-900 mb-3">
        気づきを追加
      </h3>

      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          タイプ
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as InsightType)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          {typeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          内容 <span className="text-red-500">*</span>
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
          placeholder="気づきの内容を入力..."
          required
        />
      </div>

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={!content.trim() || isSaving}
          className="px-4 py-2 text-sm text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? "追加中..." : "追加"}
        </button>
      </div>
    </form>
  );
}
