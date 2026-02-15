"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { getTimelineV2, getUserSettings } from "@/lib/api";
import type { TimelineItem, TimelineOrder, TimelineItemType } from "@/lib/types";
import TimelineItemComponent from "@/components/pop/TimelineItemComponent";

export default function PopPage() {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [order, setOrder] = useState<TimelineOrder>("random");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  // フィルタ: 気づき（Insight）とレポートの表示切り替え
  const [showInsights, setShowInsights] = useState(true);
  const [showReports, setShowReports] = useState(true);

  // フィルタ状態からitem_typeを計算
  const getItemType = useCallback((): TimelineItemType | "all" => {
    if (showInsights && showReports) return "all";
    if (showInsights) return "insight";
    if (showReports) return "report";
    return "all"; // 両方OFFの場合もallを返す（空結果を防ぐ）
  }, [showInsights, showReports]);

  const fetchTimeline = useCallback(
    async (isLoadMore = false) => {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const cursor = isLoadMore ? nextCursor || undefined : undefined;
        const itemType = getItemType();
        const limit = order === "random" ? 10 : 20;
        const response = await getTimelineV2(order, itemType, limit, cursor);

        if (isLoadMore) {
          setItems((prev) => [...prev, ...response.items]);
        } else {
          setItems(response.items);
        }
        setNextCursor(response.next_cursor);
        setHasMore(response.has_more);
      } catch (error) {
        console.error("Failed to fetch timeline:", error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [order, nextCursor, getItemType]
  );

  // 初期読み込み: ユーザー設定から表示順を取得
  useEffect(() => {
    async function init() {
      try {
        const settings = await getUserSettings();
        setOrder(settings.timeline_order || "random");
      } catch {
        // デフォルトのまま
      }
    }
    init();
  }, []);

  // Intersection Observerで自動読み込み（新着順のみ）
  useEffect(() => {
    if (order !== "newest" || !hasMore || loadingMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchTimeline(true);
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [order, hasMore, loadingMore, fetchTimeline]);

  // 表示順またはフィルタが変わったらタイムラインを再取得
  useEffect(() => {
    fetchTimeline(false);
  }, [order, showInsights, showReports]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = () => {
    fetchTimeline(false);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchTimeline(true);
    }
  };

  const handleOrderChange = (newOrder: TimelineOrder) => {
    if (newOrder !== order) {
      setOrder(newOrder);
      setNextCursor(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/home"
            className="text-sm text-blue-600 hover:underline"
          >
            &larr; ホームに戻る
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">POP</h1>
          <p className="text-sm text-gray-500 mt-1">
            みんなの読書から生まれた気づき
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          title="更新"
        >
          <svg
            className={`w-5 h-5 ${loading ? "animate-spin" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      {/* 表示順切り替え */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">表示順:</span>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => handleOrderChange("random")}
              className={`px-3 py-1.5 text-sm transition-colors ${
                order === "random"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              ランダム
            </button>
            <button
              onClick={() => handleOrderChange("newest")}
              className={`px-3 py-1.5 text-sm transition-colors ${
                order === "newest"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              新着順
            </button>
          </div>
        </div>

        {/* フィルタ切り替え */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">表示:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setShowInsights(!showInsights)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                showInsights
                  ? "bg-purple-100 text-purple-700 border-purple-200"
                  : "bg-white text-gray-400 border-gray-200 hover:bg-gray-50"
              }`}
            >
              気づき
            </button>
            <button
              onClick={() => setShowReports(!showReports)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                showReports
                  ? "bg-indigo-100 text-indigo-700 border-indigo-200"
                  : "bg-white text-gray-400 border-gray-200 hover:bg-gray-50"
              }`}
            >
              レポート
            </button>
          </div>
        </div>

        <Link
          href="/settings"
          className="ml-auto text-xs text-gray-400 hover:text-gray-600"
        >
          設定で変更
        </Link>
      </div>

      {/* タイムライン */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-600" />
          <p className="mt-2 text-sm text-gray-500">読み込み中...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-4xl mb-4">📚</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            まだ公開されたコンテンツがありません
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            読書から得た気づきやレポートを公開して、最初の投稿者になりましょう
          </p>
          <Link
            href="/home"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            読書一覧へ
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {items.map((item) => (
              <TimelineItemComponent
                key={item.insight?.id || item.report?.id}
                item={item}
              />
            ))}
          </div>

          {/* 無限スクロール用センチネル（新着順のみ） */}
          {order === "newest" && (
            <div ref={sentinelRef} className="text-center pt-4">
              {loadingMore && (
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-gray-200 border-t-blue-600" />
              )}
            </div>
          )}

          {/* ランダムの場合は「別のコンテンツを見る」ボタン */}
          {order === "random" && (
            <div className="text-center pt-4">
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="px-6 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
              >
                別のコンテンツを見る
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
