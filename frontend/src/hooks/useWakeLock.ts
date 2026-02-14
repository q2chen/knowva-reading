"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export function useWakeLock() {
  const [isSupported] = useState(
    () => typeof navigator !== "undefined" && "wakeLock" in navigator
  );
  const [isActive, setIsActive] = useState(false);
  const sentinelRef = useRef<WakeLockSentinel | null>(null);
  // ユーザーがチェックを入れている状態を追跡（visibilitychange再取得用）
  const userRequestedRef = useRef(false);

  const handleRelease = useCallback(() => {
    sentinelRef.current = null;
    setIsActive(false);
    userRequestedRef.current = false;
  }, []);

  const request = useCallback(async () => {
    if (!isSupported) return;
    try {
      const sentinel = await navigator.wakeLock.request("screen");
      sentinelRef.current = sentinel;
      userRequestedRef.current = true;
      setIsActive(true);
      sentinel.addEventListener("release", handleRelease);
    } catch {
      // バッテリー低下・省電力モード等で取得失敗
      setIsActive(false);
      userRequestedRef.current = false;
    }
  }, [isSupported, handleRelease]);

  const release = useCallback(async () => {
    userRequestedRef.current = false;
    if (sentinelRef.current) {
      await sentinelRef.current.release();
      // handleRelease は release イベント経由で呼ばれる
    }
  }, []);

  // visibilitychange: タブが再度表示されたとき、ユーザーが有効にしていれば再取得
  useEffect(() => {
    if (!isSupported) return;

    const handleVisibilityChange = async () => {
      if (
        document.visibilityState === "visible" &&
        userRequestedRef.current &&
        !sentinelRef.current
      ) {
        try {
          const sentinel = await navigator.wakeLock.request("screen");
          sentinelRef.current = sentinel;
          setIsActive(true);
          sentinel.addEventListener("release", handleRelease);
        } catch {
          // 再取得失敗
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isSupported, handleRelease]);

  // クリーンアップ: アンマウント時に解放
  useEffect(() => {
    return () => {
      if (sentinelRef.current) {
        sentinelRef.current.release();
      }
    };
  }, []);

  return { isSupported, isActive, request, release };
}
