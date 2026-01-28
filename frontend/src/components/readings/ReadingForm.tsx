"use client";

import { useState } from "react";
import { apiClient, createBook } from "@/lib/api";
import type { Reading, BookSearchResult } from "@/lib/types";
import { BookSearchInput } from "./BookSearchInput";

interface Props {
  onCreated: (reading: Reading) => void;
  onCancel: () => void;
}

type FormMode = "search" | "selected" | "manual";

export function ReadingForm({ onCreated, onCancel }: Props) {
  const [mode, setMode] = useState<FormMode>("search");
  const [selectedBook, setSelectedBook] = useState<BookSearchResult | null>(
    null
  );

  // Manual entry fields
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");

  // Common field
  const [motivation, setMotivation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleBookSelect = (book: BookSearchResult) => {
    setSelectedBook(book);
    setMode("selected");
  };

  const handleManualEntry = () => {
    setMode("manual");
    setSelectedBook(null);
  };

  const handleBackToSearch = () => {
    setMode("search");
    setSelectedBook(null);
    setTitle("");
    setAuthor("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let bookId: string;

      if (mode === "selected" && selectedBook) {
        // Use existing or create from search result
        if (selectedBook.existing_book_id) {
          bookId = selectedBook.existing_book_id;
        } else {
          const book = await createBook({
            isbn: selectedBook.isbn || undefined,
            title: selectedBook.title,
            author: selectedBook.author,
            description: selectedBook.description || undefined,
            cover_url: selectedBook.thumbnail_url || undefined,
            google_books_id: selectedBook.google_books_id || undefined,
            source: "google_books",
          });
          bookId = book.id;
        }
      } else if (mode === "manual") {
        // Manual entry
        const book = await createBook({
          title,
          author,
          source: "manual",
        });
        bookId = book.id;
      } else {
        setError("本を選択または入力してください");
        setLoading(false);
        return;
      }

      const reading = await apiClient<Reading>("/api/readings", {
        method: "POST",
        body: JSON.stringify({
          book_id: bookId,
          reading_context: motivation ? { motivation } : undefined,
        }),
      });

      onCreated(reading);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const canSubmit =
    (mode === "selected" && selectedBook) ||
    (mode === "manual" && title.trim() && author.trim());

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
      <h3 className="font-semibold text-gray-900 mb-4">新しい読書記録</h3>

      {error && (
        <div className="mb-3 p-2 bg-red-50 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "search" && (
          <BookSearchInput
            onSelect={handleBookSelect}
            onManualEntry={handleManualEntry}
          />
        )}

        {mode === "selected" && selectedBook && (
          <div className="p-3 bg-gray-50 rounded-md">
            <div className="flex gap-3">
              {selectedBook.thumbnail_url ? (
                <img
                  src={selectedBook.thumbnail_url}
                  alt=""
                  className="w-14 h-20 object-cover rounded flex-shrink-0"
                />
              ) : (
                <div className="w-14 h-20 bg-gray-200 rounded flex-shrink-0 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">{selectedBook.title}</p>
                <p className="text-sm text-gray-600">{selectedBook.author}</p>
                {selectedBook.has_reading && (
                  <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                    再読
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={handleBackToSearch}
              className="mt-2 text-sm text-blue-600 hover:underline"
            >
              別の本を選ぶ
            </button>
          </div>
        )}

        {mode === "manual" && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                書籍タイトル *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder:text-gray-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder:text-gray-500"
                placeholder="例: ユヴァル・ノア・ハラリ"
              />
            </div>
            <button
              type="button"
              onClick={handleBackToSearch}
              className="text-sm text-blue-600 hover:underline"
            >
              検索に戻る
            </button>
          </>
        )}

        {(mode === "selected" || mode === "manual") && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              この本を読む動機（任意）
            </label>
            <textarea
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder:text-gray-500"
              rows={2}
              placeholder="例: 人類の歴史を俯瞰して現代社会を理解したい"
            />
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading || !canSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
          >
            {loading ? "作成中..." : "記録を作成"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm transition-colors"
          >
            キャンセル
          </button>
        </div>
      </form>
    </div>
  );
}
