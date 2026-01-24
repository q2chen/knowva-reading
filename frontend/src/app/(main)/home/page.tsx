"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { Reading } from "@/lib/types";
import { ReadingCard } from "@/components/readings/ReadingCard";
import { ReadingForm } from "@/components/readings/ReadingForm";

export default function HomePage() {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchReadings = async () => {
    try {
      const data = await apiClient<Reading[]>("/api/readings");
      setReadings(data);
    } catch {
      // エラーハンドリング
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReadings();
  }, []);

  const handleCreated = (reading: Reading) => {
    setReadings((prev) => [reading, ...prev]);
    setShowForm(false);
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">読み込み中...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">読書一覧</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            + 新しい読書記録
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-6">
          <ReadingForm
            onCreated={handleCreated}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {readings.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="mb-2">まだ読書記録がありません</p>
          <p className="text-sm">「新しい読書記録」ボタンから始めましょう</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {readings.map((reading) => (
            <ReadingCard key={reading.id} reading={reading} />
          ))}
        </div>
      )}
    </div>
  );
}
