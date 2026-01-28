"use client";

import { useState, useCallback } from "react";
import { useDebouncedCallback } from "use-debounce";
import { searchBooks } from "@/lib/api";
import type { BookSearchResult } from "@/lib/types";

interface UseBookSearchResult {
  results: BookSearchResult[];
  loading: boolean;
  error: string | null;
  search: (query: string) => void;
  clear: () => void;
}

export function useBookSearch(debounceMs: number = 300): UseBookSearchResult {
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useDebouncedCallback(async (query: string) => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await searchBooks(query);
      setResults(response.results);
    } catch (e) {
      setError(e instanceof Error ? e.message : "検索に失敗しました");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, debounceMs);

  const search = useCallback(
    (query: string) => {
      if (query.length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      debouncedSearch(query);
    },
    [debouncedSearch]
  );

  const clear = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return { results, loading, error, search, clear };
}
