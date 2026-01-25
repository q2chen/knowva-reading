"use client";

import { useState } from "react";
import { ProfileEntry, ProfileEntryType } from "@/lib/types";
import { ProfileEntryForm } from "./ProfileEntryForm";

interface Props {
  entries: ProfileEntry[];
  onDelete?: (entryId: string) => void;
  onEdit?: (entryId: string, data: { entry_type: ProfileEntryType; content: string; note?: string }) => void;
}

const typeLabels: Record<ProfileEntryType, string> = {
  goal: "目標",
  interest: "興味",
  book_wish: "読みたい本",
  other: "その他",
};

const typeColors: Record<ProfileEntryType, string> = {
  goal: "bg-green-100 text-green-700",
  interest: "bg-blue-100 text-blue-700",
  book_wish: "bg-purple-100 text-purple-700",
  other: "bg-gray-100 text-gray-700",
};

export function ProfileEntryList({ entries, onDelete }: Props) {
  // タイプごとにグルーピング
  const grouped = entries.reduce(
    (acc, entry) => {
      const type = entry.entry_type;
      if (!acc[type]) acc[type] = [];
      acc[type].push(entry);
      return acc;
    },
    {} as Record<ProfileEntryType, ProfileEntry[]>
  );

  const typeOrder: ProfileEntryType[] = ["goal", "interest", "book_wish", "other"];

  return (
    <div className="space-y-4">
      {typeOrder.map((type) => {
        const typeEntries = grouped[type];
        if (!typeEntries || typeEntries.length === 0) return null;

        return (
          <div key={type}>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              {typeLabels[type]}
            </h4>
            <div className="space-y-2">
              {typeEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="p-3 bg-white rounded-lg border border-gray-200 group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <span
                        className={`inline-block px-2 py-0.5 text-xs rounded-full mb-1 ${typeColors[entry.entry_type]}`}
                      >
                        {typeLabels[entry.entry_type]}
                      </span>
                      <p className="text-sm text-gray-800">{entry.content}</p>
                      {entry.note && (
                        <p className="text-xs text-gray-500 mt-1">{entry.note}</p>
                      )}
                    </div>
                    {onDelete && (
                      <button
                        onClick={() => onDelete(entry.id)}
                        className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-2"
                        title="削除"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(entry.created_at).toLocaleDateString("ja-JP")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
