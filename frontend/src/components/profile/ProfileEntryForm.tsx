"use client";

import { useState } from "react";
import { ProfileEntry, ProfileEntryType } from "@/lib/types";

interface Props {
  entry?: ProfileEntry; // 編集時は既存エントリを渡す
  onSave: (data: { entry_type: ProfileEntryType; content: string; note?: string }) => void;
  onCancel: () => void;
}

const typeOptions: { value: ProfileEntryType; label: string }[] = [
  { value: "goal", label: "目標" },
  { value: "interest", label: "興味" },
  { value: "book_wish", label: "読みたい本" },
  { value: "other", label: "その他" },
];

export function ProfileEntryForm({ entry, onSave, onCancel }: Props) {
  const [entryType, setEntryType] = useState<ProfileEntryType>(
    entry?.entry_type || "goal"
  );
  const [content, setContent] = useState(entry?.content || "");
  const [note, setNote] = useState(entry?.note || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    onSave({
      entry_type: entryType,
      content: content.trim(),
      note: note.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          タイプ
        </label>
        <select
          value={entryType}
          onChange={(e) => setEntryType(e.target.value as ProfileEntryType)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
        >
          {typeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          内容 <span className="text-red-500">*</span>
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="例: マネジメントスキルを上げたい"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder:text-gray-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          メモ（任意）
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="補足情報があれば"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder:text-gray-500"
        />
      </div>

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={!content.trim()}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {entry ? "更新" : "追加"}
        </button>
      </div>
    </form>
  );
}
