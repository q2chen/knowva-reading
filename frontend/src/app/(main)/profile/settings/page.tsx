"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiClient, getUserSettings, updateUserSettings } from "@/lib/api";
import { ProfileEntry, ProfileEntryType, UserSettings, InteractionMode } from "@/lib/types";
import { ProfileChatInterface } from "@/components/profile/ProfileChatInterface";
import { ProfileEntryList } from "@/components/profile/ProfileEntryList";
import { ProfileEntryForm } from "@/components/profile/ProfileEntryForm";

export default function ProfileSettingsPage() {
  const [entries, setEntries] = useState<ProfileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    try {
      const data = await apiClient<ProfileEntry[]>("/api/profile/entries");
      setEntries(data);
    } catch (error) {
      console.error("Failed to fetch entries:", error);
    } finally {
      setLoading(false);
    }
  }, []);

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
    fetchEntries();
    fetchSettings();
  }, [fetchEntries, fetchSettings]);

  const handleInteractionModeChange = async (mode: InteractionMode) => {
    try {
      const updated = await updateUserSettings({ interaction_mode: mode });
      setUserSettings(updated);
    } catch (error) {
      console.error("Failed to update settings:", error);
    }
  };

  const handleAddEntry = async (data: {
    entry_type: ProfileEntryType;
    content: string;
    note?: string;
  }) => {
    try {
      const newEntry = await apiClient<ProfileEntry>("/api/profile/entries", {
        method: "POST",
        body: JSON.stringify(data),
      });
      setEntries((prev) => [newEntry, ...prev]);
      setShowAddForm(false);
    } catch (error) {
      console.error("Failed to add entry:", error);
    }
  };

  const handleEditEntry = async (
    entryId: string,
    data: { entry_type: ProfileEntryType; content: string; note?: string }
  ) => {
    try {
      const updated = await apiClient<ProfileEntry>(
        `/api/profile/entries/${entryId}`,
        {
          method: "PUT",
          body: JSON.stringify(data),
        }
      );
      setEntries((prev) =>
        prev.map((e) => (e.id === entryId ? updated : e))
      );
    } catch (error) {
      console.error("Failed to update entry:", error);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    try {
      await apiClient(`/api/profile/entries/${entryId}`, { method: "DELETE" });
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
    } catch (error) {
      console.error("Failed to delete entry:", error);
    }
  };

  if (loading || settingsLoading) {
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
            &larr; プロファイルに戻る
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">
            プロファイル設定
          </h1>
        </div>
      </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左側: 対話エリア */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 overflow-hidden">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            AIと対話する
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            あなたの目標、興味、読みたい本などを自由に話してください。
            AIが聞き出してプロファイルに追加します。
          </p>
          <ProfileChatInterface onEntryAdded={fetchEntries} />
        </div>

        {/* 右側: 現在のエントリ一覧 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              登録済みの情報 ({entries.length})
            </h2>
            {!showAddForm && (
              <button
                onClick={() => setShowAddForm(true)}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                + 手動で追加
              </button>
            )}
          </div>

          {showAddForm && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                新規追加
              </h3>
              <ProfileEntryForm
                onSave={handleAddEntry}
                onCancel={() => setShowAddForm(false)}
              />
            </div>
          )}

          {entries.length === 0 && !showAddForm ? (
            <p className="text-sm text-gray-400 text-center py-4">
              まだ情報がありません。AIと対話するか、手動で追加しましょう。
            </p>
          ) : (
            <ProfileEntryList
              entries={entries}
              onDelete={handleDeleteEntry}
              onEdit={handleEditEntry}
            />
          )}
        </div>
      </div>
    </div>
  );
}
