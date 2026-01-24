"use client";

import { useAuth } from "@/providers/AuthProvider";

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">プロフィール</h1>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-500">メールアドレス</label>
            <p className="text-gray-900">{user?.email || "-"}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500">UID</label>
            <p className="text-gray-900 font-mono text-sm">{user?.uid || "-"}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">読書プロファイル</h2>
        <p className="text-sm text-gray-500">
          AIとの対話を重ねることで、あなたの読書傾向や価値観がここに蓄積されていきます。
        </p>
        <div className="mt-4 p-4 bg-gray-50 rounded-md">
          <p className="text-sm text-gray-400 text-center">
            まだプロファイルデータがありません。
            <br />
            読書記録を作成し、AIとの対話を始めましょう。
          </p>
        </div>
      </div>
    </div>
  );
}
