"use client";

import { useState } from "react";
import type { BadgeDefinition, UserBadge } from "@/lib/types";

// Tailwind色名からクラスへのマッピング
const colorClasses: Record<string, string> = {
  green: "bg-green-100 text-green-700",
  blue: "bg-blue-100 text-blue-700",
  purple: "bg-purple-100 text-purple-700",
  amber: "bg-amber-100 text-amber-700",
  pink: "bg-pink-100 text-pink-700",
  gray: "bg-gray-100 text-gray-700",
};

// 未獲得バッジ用のスタイル
const unearnedClass = "bg-gray-100 text-gray-400";

interface BadgeProps {
  definition: BadgeDefinition;
  userBadge?: UserBadge;
  size?: "sm" | "md" | "lg";
  showDescription?: boolean;
}

export function Badge({
  definition,
  userBadge,
  size = "md",
  showDescription = false,
}: BadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const earned = !!userBadge;
  const colorClass = earned
    ? colorClasses[definition.color] || colorClasses.gray
    : unearnedClass;

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-2 text-base",
  };

  return (
    <div className="inline-flex flex-col items-start relative">
      <span
        className={`inline-flex items-center gap-1 rounded-full font-medium cursor-pointer ${sizeClasses[size]} ${colorClass}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onTouchStart={() => setShowTooltip(true)}
        onTouchEnd={() => setShowTooltip(false)}
      >
        {definition.name}
        {earned && <span className="opacity-60">✓</span>}
      </span>
      {/* ツールチップ */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap z-50 shadow-lg">
          <div className="font-medium mb-0.5">{definition.name}</div>
          <div className="text-gray-300">{definition.description}</div>
          {earned && userBadge?.earned_at && (
            <div className="text-green-400 mt-1 text-[10px]">
              {new Date(userBadge.earned_at).toLocaleDateString("ja-JP")} 獲得
            </div>
          )}
          {/* 矢印 */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
        </div>
      )}
      {showDescription && (
        <span className="text-xs text-gray-500 mt-1">
          {definition.description}
        </span>
      )}
    </div>
  );
}
