"use client";

import { useState, useRef, useEffect } from "react";
import { useBookSearch } from "@/hooks/useBookSearch";
import type { BookSearchResult } from "@/lib/types";

interface Props {
  onSelect: (book: BookSearchResult) => void;
  onManualEntry: () => void;
}

export function BookSearchInput({ onSelect, onManualEntry }: Props) {
  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const { results, loading, error, search, clear } = useBookSearch();
  const containerRef = useRef<HTMLDivElement>(null);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    search(value);
    setShowDropdown(value.length >= 2);
  };

  const handleSelect = (book: BookSearchResult) => {
    onSelect(book);
    setQuery("");
    setShowDropdown(false);
    clear();
  };

  const handleManualEntry = () => {
    onManualEntry();
    setShowDropdown(false);
    clear();
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        書籍を検索
      </label>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => query.length >= 2 && setShowDropdown(true)}
          placeholder="書籍名または著者名で検索..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder:text-gray-500"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}

      {showDropdown && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-80 overflow-y-auto">
          {results.length > 0 ? (
            results.map((book, idx) => (
              <button
                key={`${book.isbn || book.google_books_id || idx}`}
                type="button"
                onClick={() => handleSelect(book)}
                className="w-full p-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
              >
                <div className="flex gap-3">
                  {book.thumbnail_url ? (
                    <img
                      src={book.thumbnail_url}
                      alt=""
                      className="w-10 h-14 object-cover rounded flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-14 bg-gray-200 rounded flex-shrink-0 flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-gray-400"
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 truncate">
                        {book.title}
                      </span>
                      {book.has_reading && (
                        <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full flex-shrink-0">
                          登録済み
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 truncate">
                      {book.author}
                    </p>
                  </div>
                </div>
              </button>
            ))
          ) : (
            !loading && (
              <div className="p-4">
                <p className="text-gray-500 text-sm mb-2">
                  検索結果がありません
                </p>
                <button
                  type="button"
                  onClick={handleManualEntry}
                  className="text-blue-600 hover:underline text-sm"
                >
                  手動で入力する
                </button>
              </div>
            )
          )}

          {results.length > 0 && (
            <div className="p-2 border-t border-gray-100 bg-gray-50">
              <button
                type="button"
                onClick={handleManualEntry}
                className="text-blue-600 hover:underline text-sm"
              >
                見つからない場合は手動で入力
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
