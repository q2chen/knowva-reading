"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
import { getUserSettings, updateUserSettings } from "@/lib/api";
import { UserSettings, InteractionMode } from "@/lib/types";

export default function ProfileSettingsPage() {
  const { user } = useAuth();
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const settings = await getUserSettings();
      setUserSettings(settings);
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      // デフォルト値を設定
      setUserSettings({ interaction_mode: "guided" });
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleInteractionModeChange = async (mode: InteractionMode) => {
    try {
      const updated = await updateUserSettings({ interaction_mode: mode });
      setUserSettings(updated);
    } catch (error) {
      console.error("Failed to update settings:", error);
    }
  };

  if (settingsLoading) {
    return <div className="text-center py-8 text-gray-500">読み込み中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/profile"
            className="text-sm text-blue-600 hover:underline"
          >
            &larr; あなたに戻る
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">
            設定
          </h1>
        </div>
      </div>

      {/* 基本情報 */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">基本情報</h2>
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            <span className="font-medium">メール:</span> {user?.email || "-"}
          </p>
        </div>
      </section>

      {/* 対話モード設定セクション */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          対話スタイル設定
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          AIとの対話スタイルを選択してください。この設定は読書セッションでの対話に反映されます。
        </p>
        <div className="space-y-3">
          <label
            className={`flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${
              userSettings?.interaction_mode === "freeform"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <input
              type="radio"
              name="interaction_mode"
              value="freeform"
              checked={userSettings?.interaction_mode === "freeform"}
              onChange={() => handleInteractionModeChange("freeform")}
              className="mt-1 mr-3"
            />
            <div>
              <div className="font-medium text-gray-900">
                自由入力モード
              </div>
              <div className="text-sm text-gray-500 mt-1">
                自分で考えて言語化したい方向け。AIは質問を投げかけ、あなたの言葉を引き出します。
                選択肢は提示されません。
              </div>
            </div>
          </label>
          <label
            className={`flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${
              userSettings?.interaction_mode === "guided"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <input
              type="radio"
              name="interaction_mode"
              value="guided"
              checked={userSettings?.interaction_mode === "guided"}
              onChange={() => handleInteractionModeChange("guided")}
              className="mt-1 mr-3"
            />
            <div>
              <div className="font-medium text-gray-900">
                選択肢ガイドモード
              </div>
              <div className="text-sm text-gray-500 mt-1">
                AIが選択肢を提示し、タップで選択できます。複数選択も可能。
                もちろん、選択肢を無視して自由に入力することもできます。
              </div>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}
