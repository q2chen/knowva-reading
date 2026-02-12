"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api";
import { Reading } from "@/lib/types";
import { ReadingCard } from "@/components/readings/ReadingCard";
import { ReadingForm } from "@/components/readings/ReadingForm";

export default function ReadingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(searchParams.get("new") === "true");

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
    router.push(`/readings/${reading.id}`);
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">読み込み中...</div>;
  }

  return (
    <div>
      <Link
        href="/home"
        className="text-sm text-blue-600 hover:underline"
      >
        &larr; ホームに戻る
      </Link>
      <div className="flex items-center justify-between mb-6 mt-2">
        <h1 className="text-2xl font-bold text-gray-900">読書記録</h1>
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
        <div className="flex justify-center py-12">
          <button
            onClick={() => setShowForm(true)}
            className="w-32 group"
          >
            <div className="w-full aspect-[2/3] border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center group-hover:border-blue-400 group-hover:bg-blue-50 transition-colors">
              <span className="text-3xl text-gray-400 group-hover:text-blue-500">+</span>
            </div>
            <p className="mt-2 text-sm text-gray-500 text-center group-hover:text-blue-600">
              新しい本を追加
            </p>
          </button>
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
