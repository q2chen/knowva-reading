"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
import {
  getUserSettings,
  updateUserSettings,
  getNickname,
  updateNickname,
} from "@/lib/api";
import { UserSettings, InteractionMode, TimelineOrder } from "@/lib/types";

export default function ProfileSettingsPage() {
  const { user } = useAuth();
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [nickname, setNickname] = useState("");
  const [nicknameInput, setNicknameInput] = useState("");
  const [nicknameLoading, setNicknameLoading] = useState(false);
  const [nicknameSaved, setNicknameSaved] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const [settings, nameData] = await Promise.all([
        getUserSettings(),
        getNickname(),
      ]);
      setUserSettings(settings);
      setNickname(nameData.name || "");
      setNicknameInput(nameData.name || "");
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      setUserSettings({ interaction_mode: "guided", timeline_order: "random" });
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

  const handleTimelineOrderChange = async (order: TimelineOrder) => {
    try {
      const updated = await updateUserSettings({ timeline_order: order });
      setUserSettings(updated);
    } catch (error) {
      console.error("Failed to update settings:", error);
    }
  };

  const handleNicknameSave = async () => {
    const trimmed = nicknameInput.trim();
    if (!trimmed || trimmed === nickname) return;

    setNicknameLoading(true);
    try {
      const result = await updateNickname(trimmed);
      setNickname(result.name);
      setNicknameSaved(true);
      setTimeout(() => setNicknameSaved(false), 2000);
    } catch (error) {
      console.error("Failed to update nickname:", error);
    } finally {
      setNicknameLoading(false);
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
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600">
              <span className="font-medium">メール:</span> {user?.email || "-"}
            </p>
          </div>
          <div>
            <label
              htmlFor="nickname"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              ニックネーム
            </label>
            <p className="text-xs text-gray-500 mb-2">
              気づきを公開するときに表示される名前です（30文字以内）
            </p>
            <div className="flex gap-2">
              <input
                id="nickname"
                type="text"
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                maxLength={30}
                placeholder="ニックネームを入力"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleNicknameSave}
                disabled={
                  nicknameLoading ||
                  !nicknameInput.trim() ||
                  nicknameInput.trim() === nickname
                }
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {nicknameLoading ? "保存中..." : nicknameSaved ? "保存しました" : "保存"}
              </button>
            </div>
          </div>
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

      {/* タイムライン表示設定 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          POP（タイムライン）表示設定
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          他のユーザーの気づきを表示する順番を選択できます。
        </p>
        <div className="space-y-3">
          <label
            className={`flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${
              userSettings?.timeline_order === "random"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <input
              type="radio"
              name="timeline_order"
              value="random"
              checked={userSettings?.timeline_order === "random"}
              onChange={() => handleTimelineOrderChange("random")}
              className="mt-1 mr-3"
            />
            <div>
              <div className="font-medium text-gray-900">ランダム</div>
              <div className="text-sm text-gray-500 mt-1">
                アクセスするたびに異なる気づきに出会えます。新しい発見を楽しみたい方におすすめ。
              </div>
            </div>
          </label>
          <label
            className={`flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${
              userSettings?.timeline_order === "newest"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <input
              type="radio"
              name="timeline_order"
              value="newest"
              checked={userSettings?.timeline_order === "newest"}
              onChange={() => handleTimelineOrderChange("newest")}
              className="mt-1 mr-3"
            />
            <div>
              <div className="font-medium text-gray-900">新着順</div>
              <div className="text-sm text-gray-500 mt-1">
                最近公開された気づきから順に表示します。最新の投稿を追いたい方向け。
              </div>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}
