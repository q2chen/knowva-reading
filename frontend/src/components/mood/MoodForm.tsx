"use client";

import { useState } from "react";
import { MoodMetrics, MoodCreateInput } from "@/lib/types";

interface Props {
  moodType: "before" | "after";
  onSave: (data: MoodCreateInput) => Promise<void>;
  initialData?: Partial<MoodMetrics>;
  disabled?: boolean;
}

const METRICS_LABELS: Record<keyof MoodMetrics, { label: string; low: string; high: string }> = {
  energy: { label: "活力・エネルギー", low: "疲れている", high: "元気いっぱい" },
  positivity: { label: "気分", low: "ネガティブ", high: "ポジティブ" },
  clarity: { label: "思考の明晰さ", low: "混乱している", high: "クリア" },
  motivation: { label: "モチベーション", low: "やる気がない", high: "意欲的" },
  openness: { label: "新しいことへの開放性", low: "閉鎖的", high: "開放的" },
};

const EMOTION_SUGGESTIONS = [
  "期待", "不安", "好奇心", "疲労", "集中", "リラックス",
  "興奮", "落ち着き", "希望", "迷い", "感動", "充実",
];

const DEFAULT_METRICS: MoodMetrics = {
  energy: 3,
  positivity: 3,
  clarity: 3,
  motivation: 3,
  openness: 3,
};

export function MoodForm({ moodType, onSave, initialData, disabled }: Props) {
  const [metrics, setMetrics] = useState<MoodMetrics>({
    ...DEFAULT_METRICS,
    ...initialData,
  });
  const [note, setNote] = useState("");
  const [dominantEmotion, setDominantEmotion] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleMetricChange = (key: keyof MoodMetrics, value: number) => {
    setMetrics((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave({
        mood_type: moodType,
        metrics,
        note: note || undefined,
        dominant_emotion: dominantEmotion || undefined,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          {moodType === "before" ? "📖 読書前の心境" : "📚 読了後の心境"}
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          {moodType === "before"
            ? "読み始める前の今の気持ちを記録しましょう"
            : "読み終えた今の気持ちを記録しましょう"}
        </p>
      </div>

      {/* メトリクススライダー */}
      <div className="space-y-4">
        {(Object.keys(METRICS_LABELS) as Array<keyof MoodMetrics>).map((key) => (
          <div key={key} className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-gray-700">
                {METRICS_LABELS[key].label}
              </label>
              <span className="text-sm font-semibold text-blue-600">
                {metrics[key]}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-20 text-right">
                {METRICS_LABELS[key].low}
              </span>
              <input
                type="range"
                min={1}
                max={5}
                value={metrics[key]}
                onChange={(e) => handleMetricChange(key, Number(e.target.value))}
                disabled={disabled || isSaving}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:opacity-50"
              />
              <span className="text-xs text-gray-400 w-20">
                {METRICS_LABELS[key].high}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* 支配的な感情 */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          今の一番強い感情は？
        </label>
        <div className="flex flex-wrap gap-2">
          {EMOTION_SUGGESTIONS.map((emotion) => (
            <button
              key={emotion}
              type="button"
              onClick={() => setDominantEmotion(emotion)}
              disabled={disabled || isSaving}
              className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                dominantEmotion === emotion
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
              } disabled:opacity-50`}
            >
              {emotion}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={dominantEmotion}
          onChange={(e) => setDominantEmotion(e.target.value)}
          placeholder="または自由に入力..."
          disabled={disabled || isSaving}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 bg-white text-gray-900 placeholder:text-gray-500"
        />
      </div>

      {/* メモ */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          メモ（任意）
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="今の心境について自由に記録..."
          rows={3}
          disabled={disabled || isSaving}
          maxLength={500}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:opacity-50 bg-white text-gray-900 placeholder:text-gray-500"
        />
        <p className="text-xs text-gray-400 text-right">{note.length}/500</p>
      </div>

      {/* 保存ボタン */}
      <button
        type="submit"
        disabled={disabled || isSaving}
        className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSaving ? "保存中..." : "記録する"}
      </button>
    </form>
  );
}
