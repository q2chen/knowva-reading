"use client";

import { useState } from "react";
import { apiClient } from "@/lib/api";
import { Reading } from "@/lib/types";

interface Props {
  onCreated: (reading: Reading) => void;
  onCancel: () => void;
}

export function ReadingForm({ onCreated, onCancel }: Props) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [motivation, setMotivation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const reading = await apiClient<Reading>("/api/readings", {
        method: "POST",
        body: JSON.stringify({
          book: { title, author },
          reading_context: motivation ? { motivation } : undefined,
        }),
      });
      onCreated(reading);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
      <h3 className="font-semibold text-gray-900 mb-4">新しい読書記録</h3>

      {error && (
        <div className="mb-3 p-2 bg-red-50 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            書籍タイトル *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="例: サピエンス全史"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            著者 *
          </label>
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="例: ユヴァル・ノア・ハラリ"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            この本を読む動機（任意）
          </label>
          <textarea
            value={motivation}
            onChange={(e) => setMotivation(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
            placeholder="例: 人類の歴史を俯瞰して現代社会を理解したい"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            {loading ? "作成中..." : "記録を作成"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm"
          >
            キャンセル
          </button>
        </div>
      </form>
    </div>
  );
}
