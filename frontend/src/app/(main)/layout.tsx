"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signOut } from "firebase/auth";
import { useAuth } from "@/providers/AuthProvider";
import { auth } from "@/lib/firebase";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, emailVerified, isAnonymous } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
      return;
    }
    // メール/パスワードユーザーで未確認の場合、確認ページへリダイレクト
    // Googleユーザーとゲストユーザーは確認不要
    if (
      !loading &&
      user &&
      !emailVerified &&
      !isAnonymous &&
      user.providerData[0]?.providerId === "password"
    ) {
      router.replace("/verify-email");
    }
  }, [user, loading, emailVerified, isAnonymous, router]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-gray-500">読み込み中...</div>
      </div>
    );
  }

  // メール未確認の場合はリダイレクト中なので何も表示しない（ゲストは除外）
  if (
    !emailVerified &&
    !isAnonymous &&
    user.providerData[0]?.providerId === "password"
  ) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-gray-500">読み込み中...</div>
      </div>
    );
  }

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/home" className="text-xl font-bold text-gray-900">
            Knowva
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/home" className="text-sm text-gray-600 hover:text-gray-900">
              ホーム
            </Link>
            <Link href="/readings" className="text-sm text-gray-600 hover:text-gray-900">
              読書記録
            </Link>
            <Link href="/pop" className="text-sm text-gray-600 hover:text-gray-900">
              POP
            </Link>
            <Link href="/settings" className="text-sm text-gray-600 hover:text-gray-900">
              設定
            </Link>
            {isAnonymous && (
              <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                ゲスト
              </span>
            )}
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ログアウト
            </button>
          </nav>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
