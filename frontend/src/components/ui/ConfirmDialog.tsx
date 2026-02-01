"use client";

import { useEffect, useState, useCallback } from "react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string | React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning";
  confirmDelay?: number; // 確認ボタン有効化までの遅延(ms)
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "確認",
  cancelLabel = "キャンセル",
  variant = "danger",
  confirmDelay = 0,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [countdown, setCountdown] = useState(0);
  const [isConfirming, setIsConfirming] = useState(false);

  // 開いたときにカウントダウン開始
  useEffect(() => {
    if (isOpen && confirmDelay > 0) {
      setCountdown(Math.ceil(confirmDelay / 1000));
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCountdown(0);
    }
  }, [isOpen, confirmDelay]);

  // ESCキーでキャンセル
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  const handleConfirm = useCallback(async () => {
    if (countdown > 0 || isConfirming) return;
    setIsConfirming(true);
    try {
      await onConfirm();
    } finally {
      setIsConfirming(false);
    }
  }, [countdown, isConfirming, onConfirm]);

  if (!isOpen) return null;

  const isDisabled = countdown > 0 || isConfirming;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      {/* 背景オーバーレイ */}
      <div className="absolute inset-0 bg-black/50" />

      {/* ダイアログ本体 */}
      <div
        className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>

        <div className="text-sm text-gray-600 mb-6">{message}</div>

        {/* ボタン（キャンセルを左側に配置） */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isDisabled}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              variant === "danger"
                ? "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300"
                : "bg-yellow-600 text-white hover:bg-yellow-700 disabled:bg-yellow-300"
            } ${isDisabled ? "cursor-not-allowed" : ""}`}
          >
            {isConfirming ? (
              "処理中..."
            ) : countdown > 0 ? (
              `${confirmLabel} (${countdown}秒)`
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
