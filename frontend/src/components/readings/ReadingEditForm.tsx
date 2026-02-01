"use client";

import { useState } from "react";
import { Reading } from "@/lib/types";

interface ReadingEditData {
  book?: {
    title: string;
    author: string;
    cover_url?: string;
  };
  reading_context?: {
    motivation: string;
  };
}

interface Props {
  reading: Reading;
  onSave: (data: ReadingEditData) => Promise<void>;
  onCancel: () => void;
}

export function ReadingEditForm({ reading, onSave, onCancel }: Props) {
  const [title, setTitle] = useState(reading.book.title);
  const [author, setAuthor] = useState(reading.book.author);
  const [motivation, setMotivation] = useState(
    reading.reading_context?.motivation || ""
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSaving(true);
    try {
      await onSave({
        book: {
          title: title.trim(),
          author: author.trim(),
          cover_url: reading.book.cover_url,
        },
        reading_context: motivation.trim()
          ? { motivation: motivation.trim() }
          : undefined,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges =
    title !== reading.book.title ||
    author !== reading.book.author ||
    motivation !== (reading.reading_context?.motivation || "");

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-lg border border-blue-200 shadow-sm p-6"
    >
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        読書記録を編集
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            タイトル <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="本のタイトル"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            著者
          </label>
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="著者名"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            読む動機
          </label>
          <textarea
            value={motivation}
            onChange={(e) => setMotivation(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="この本を読もうと思った理由"
          />
        </div>
      </div>

      <div className="flex gap-2 justify-end mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={!hasChanges || !title.trim() || isSaving}
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? "保存中..." : "保存"}
        </button>
      </div>
    </form>
  );
}
