"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import {
  getUserSettings,
  updateUserSettings,
  getNickname,
  updateNickname,
  getUserProfile,
  updateUserProfile,
  apiClient,
} from "@/lib/api";
import { UserSettings, UserProfile, InteractionMode, TimelineOrder, FabPosition, ProfileEntry, ProfileEntryType } from "@/lib/types";
import { ProfileEntryList } from "@/components/profile/ProfileEntryList";
import { ProfileEntryForm } from "@/components/profile/ProfileEntryForm";
import { ProfileChatInterface } from "@/components/profile/ProfileChatInterface";

// プロフィール選択肢
const LIFE_STAGE_OPTIONS = [
  { value: "student", label: "学生" },
  { value: "early_career", label: "若手社会人（1-5年目）" },
  { value: "mid_career", label: "中堅社会人（6-15年目）" },
  { value: "manager", label: "管理職・マネージャー" },
  { value: "executive", label: "経営者・役員" },
  { value: "freelance", label: "フリーランス・自営業" },
  { value: "other", label: "その他" },
];

const CHALLENGE_OPTIONS = [
  { value: "career", label: "キャリアの方向性" },
  { value: "skill", label: "スキルアップ" },
  { value: "communication", label: "人間関係・コミュニケーション" },
  { value: "management", label: "マネジメント・リーダーシップ" },
  { value: "balance", label: "ワークライフバランス" },
  { value: "self", label: "自己理解・自分探し" },
  { value: "money", label: "お金・資産形成" },
  { value: "health", label: "健康・メンタル" },
];

const VALUE_OPTIONS = [
  { value: "growth", label: "成長・学び" },
  { value: "freedom", label: "自由・独立" },
  { value: "stability", label: "安定・安心" },
  { value: "contribution", label: "貢献・社会への影響" },
  { value: "creativity", label: "創造性・表現" },
  { value: "connection", label: "人とのつながり" },
  { value: "integrity", label: "誠実さ・正直さ" },
  { value: "challenge", label: "挑戦・冒険" },
];

const MOTIVATION_OPTIONS = [
  { value: "skill", label: "仕事に活かす知識・スキルを得たい" },
  { value: "perspective", label: "視野を広げ、新しい考え方に触れたい" },
  { value: "relax", label: "リラックス・気分転換" },
  { value: "culture", label: "教養を身につけたい" },
  { value: "self_reflection", label: "自分自身を見つめ直したい" },
  { value: "problem_solving", label: "特定の課題を解決したい" },
];

const INTEREST_OPTIONS = [
  { value: "business", label: "ビジネス・経営" },
  { value: "self_help", label: "自己啓発・成長" },
  { value: "fiction", label: "小説・文学" },
  { value: "history", label: "歴史・伝記" },
  { value: "science", label: "科学・テクノロジー" },
  { value: "philosophy", label: "哲学・思想" },
  { value: "psychology", label: "心理学・脳科学" },
  { value: "society", label: "社会・経済" },
  { value: "art", label: "アート・デザイン" },
  { value: "other", label: "その他" },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [nickname, setNickname] = useState("");
  const [nicknameInput, setNicknameInput] = useState("");
  const [nicknameLoading, setNicknameLoading] = useState(false);
  const [nicknameSaved, setNicknameSaved] = useState(false);

  // プロフィール関連state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(
    searchParams.get("expandProfile") === "true"
  );

  // プロフィールエントリ関連state
  const [entries, setEntries] = useState<ProfileEntry[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const [settings, nameData, profileData, entriesData] = await Promise.all([
        getUserSettings(),
        getNickname(),
        getUserProfile(),
        apiClient<ProfileEntry[]>("/api/profile/entries"),
      ]);
      setUserSettings(settings);
      setNickname(nameData.name || "");
      setNicknameInput(nameData.name || "");
      setProfile(profileData);
      setEntries(entriesData);
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      setUserSettings({ interaction_mode: "guided", timeline_order: "random", fab_position: "left" });
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  const fetchEntries = useCallback(async () => {
    try {
      const data = await apiClient<ProfileEntry[]>("/api/profile/entries");
      setEntries(data);
    } catch (error) {
      console.error("Failed to fetch entries:", error);
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

  const handleFabPositionChange = async (position: FabPosition) => {
    try {
      const updated = await updateUserSettings({ fab_position: position });
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

  // プロフィール更新ハンドラー
  const handleProfileUpdate = async (field: keyof UserProfile, value: string | string[]) => {
    if (!profile) return;

    setProfileLoading(true);
    try {
      const updated = await updateUserProfile({ [field]: value });
      setProfile(updated);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch (error) {
      console.error("Failed to update profile:", error);
    } finally {
      setProfileLoading(false);
    }
  };

  const toggleArrayItem = (currentArray: string[], item: string): string[] => {
    if (currentArray.includes(item)) {
      return currentArray.filter((v) => v !== item);
    }
    return [...currentArray, item];
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

  if (settingsLoading) {
    return <div className="text-center py-8 text-gray-500">読み込み中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/home"
            className="text-sm text-blue-600 hover:underline"
          >
            &larr; ホームに戻る
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

      {/* プロフィール設定セクション */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200">
        <button
          onClick={() => setIsProfileOpen(!isProfileOpen)}
          className="w-full flex items-center justify-between p-6 text-left"
        >
          <div>
            <h2 className="text-lg font-semibold text-gray-900">あなたについて</h2>
            <p className="text-sm text-gray-500 mt-1">
              AIがより適切な対話をするための情報です
            </p>
          </div>
          <div className="flex items-center gap-2">
            {profileSaved && (
              <span className="text-sm text-green-600">保存しました</span>
            )}
            {profileLoading && (
              <span className="text-sm text-gray-500">保存中...</span>
            )}
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform ${isProfileOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {isProfileOpen && profile && (
          <div className="px-6 pb-6 space-y-6">
            {/* ライフステージ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ライフステージ
              </label>
              <div className="flex flex-wrap gap-2">
                {LIFE_STAGE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleProfileUpdate("life_stage", option.label)}
                    className={`px-3 py-2 rounded-full text-sm transition-colors ${
                      profile.life_stage === option.label
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 課題・悩み */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                課題・悩み（複数選択可）
              </label>
              <div className="flex flex-wrap gap-2">
                {CHALLENGE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      const newChallenges = toggleArrayItem(profile.challenges || [], option.label);
                      handleProfileUpdate("challenges", newChallenges);
                    }}
                    className={`px-3 py-2 rounded-full text-sm transition-colors ${
                      profile.challenges?.includes(option.label)
                        ? "bg-orange-500 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 大切にしていること */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                大切にしていること（複数選択可）
              </label>
              <div className="flex flex-wrap gap-2">
                {VALUE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      const newValues = toggleArrayItem(profile.values || [], option.label);
                      handleProfileUpdate("values", newValues);
                    }}
                    className={`px-3 py-2 rounded-full text-sm transition-colors ${
                      profile.values?.includes(option.label)
                        ? "bg-purple-500 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 読書の目的 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                読書の目的（複数選択可）
              </label>
              <div className="flex flex-wrap gap-2">
                {MOTIVATION_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      const newMotivations = toggleArrayItem(profile.reading_motivations || [], option.label);
                      handleProfileUpdate("reading_motivations", newMotivations);
                    }}
                    className={`px-3 py-2 rounded-full text-sm transition-colors ${
                      profile.reading_motivations?.includes(option.label)
                        ? "bg-green-500 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 興味のあるジャンル */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                興味のあるジャンル（複数選択可）
              </label>
              <div className="flex flex-wrap gap-2">
                {INTEREST_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      const newInterests = toggleArrayItem(profile.interests || [], option.label);
                      handleProfileUpdate("interests", newInterests);
                    }}
                    className={`px-3 py-2 rounded-full text-sm transition-colors ${
                      profile.interests?.includes(option.label)
                        ? "bg-teal-500 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 区切り線 */}
            <hr className="border-gray-200" />

            {/* プロフィール情報とAI対話 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 左側: エントリ一覧 */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-700">その他の情報</h3>
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
                    <h4 className="text-sm font-medium text-gray-700 mb-3">
                      新規追加
                    </h4>
                    <ProfileEntryForm
                      onSave={handleAddEntry}
                      onCancel={() => setShowAddForm(false)}
                    />
                  </div>
                )}

                <p className="text-xs text-gray-500 mb-3">
                  読書中の対話からも自動的に追加されます
                </p>

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

              {/* 右側: 対話エリア */}
              <div className="flex flex-col">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  AIと対話する
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  目標、興味、読みたい本などを話してください
                </p>
                <div className="flex-1 min-h-0">
                  <ProfileChatInterface onEntryAdded={fetchEntries} />
                </div>
              </div>
            </div>
          </div>
        )}
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

      {/* 音声入力ボタン表示設定 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          音声入力ボタンの表示位置
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          ホーム画面に表示されるワンタップ録音ボタンの位置を設定できます。
        </p>
        <div className="space-y-3">
          <label
            className={`flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${
              (userSettings?.fab_position === "left" || !userSettings?.fab_position)
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <input
              type="radio"
              name="fab_position"
              value="left"
              checked={userSettings?.fab_position === "left" || !userSettings?.fab_position}
              onChange={() => handleFabPositionChange("left")}
              className="mt-1 mr-3"
            />
            <div>
              <div className="font-medium text-gray-900">左下（デフォルト）</div>
              <div className="text-sm text-gray-500 mt-1">
                画面左下にボタンを表示します。
              </div>
            </div>
          </label>
          <label
            className={`flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${
              userSettings?.fab_position === "right"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <input
              type="radio"
              name="fab_position"
              value="right"
              checked={userSettings?.fab_position === "right"}
              onChange={() => handleFabPositionChange("right")}
              className="mt-1 mr-3"
            />
            <div>
              <div className="font-medium text-gray-900">右下</div>
              <div className="text-sm text-gray-500 mt-1">
                画面右下にボタンを表示します。
              </div>
            </div>
          </label>
          <label
            className={`flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${
              userSettings?.fab_position === "none"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <input
              type="radio"
              name="fab_position"
              value="none"
              checked={userSettings?.fab_position === "none"}
              onChange={() => handleFabPositionChange("none")}
              className="mt-1 mr-3"
            />
            <div>
              <div className="font-medium text-gray-900">非表示</div>
              <div className="text-sm text-gray-500 mt-1">
                ボタンを表示しません。読書詳細画面から音声入力は引き続き利用できます。
              </div>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}
