"use client";

import { useState, useEffect } from "react";
import { getBadgeDefinitions, getUserBadges } from "@/lib/api";
import type { BadgeDefinition, UserBadge } from "@/lib/types";
import { BadgeList } from "./BadgeList";

interface BadgeSectionProps {
  showAll?: boolean;
}

export function BadgeSection({ showAll = true }: BadgeSectionProps) {
  const [definitions, setDefinitions] = useState<BadgeDefinition[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    async function fetchBadges() {
      try {
        const [defs, badges] = await Promise.all([
          getBadgeDefinitions(),
          getUserBadges(),
        ]);
        setDefinitions(defs);
        setUserBadges(badges);
      } catch (error) {
        console.error("Failed to fetch badges:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchBadges();
  }, []);

  if (loading) {
    return (
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-gray-500 text-sm">読み込み中...</div>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 text-left"
      >
        <h2 className="text-lg font-semibold text-gray-900">
          獲得バッジ ({userBadges.length}/{definitions.length})
        </h2>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {isOpen && (
        <div className="px-6 pb-6">
          <BadgeList
            definitions={definitions}
            userBadges={userBadges}
            showAll={showAll}
            size="md"
          />
        </div>
      )}
    </section>
  );
}
