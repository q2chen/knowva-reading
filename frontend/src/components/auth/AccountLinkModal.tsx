"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccountLink } from "@/hooks/useAccountLink";

interface AccountLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type LinkMethod = "email" | null;

export function AccountLinkModal({ isOpen, onClose }: AccountLinkModalProps) {
  const router = useRouter();
  const {
    isLinking,
    error,
    linkWithEmailPassword,
    linkWithGoogleAccount,
    clearError,
  } = useAccountLink();

  const [linkMethod, setLinkMethod] = useState<LinkMethod>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState("");
  const [linkSuccess, setLinkSuccess] = useState(false);
  const [successMethod, setSuccessMethod] = useState<"email" | "google" | null>(
    null
  );

  if (!isOpen) return null;

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");
    clearError();

    if (password !== confirmPassword) {
      setLocalError("パスワードが一致しません。");
      return;
    }

    if (password.length < 6) {
      setLocalError("パスワードは6文字以上で入力してください。");
      return;
    }

    const success = await linkWithEmailPassword(email, password);
    if (success) {
      setLinkSuccess(true);
      setSuccessMethod("email");
      setTimeout(() => {
        router.push("/verify-email");
      }, 1500);
    }
  };

  const handleGoogleLink = async () => {
    clearError();
    const success = await linkWithGoogleAccount();
    if (success) {
      setLinkSuccess(true);
      setSuccessMethod("google");
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 1500);
    }
  };

  const handleBack = () => {
    setLinkMethod(null);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setLocalError("");
    clearError();
  };

  const handleClose = () => {
    handleBack();
    setLinkSuccess(false);
    setSuccessMethod(null);
    onClose();
  };

  // 成功メッセージ表示
  if (linkSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            アカウント作成完了
          </h3>
          <p className="text-gray-600">
            {successMethod === "email"
              ? "メールアドレスの確認をお願いします。"
              : "Googleアカウントと連携しました。"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">
            {linkMethod ? "アカウント作成" : "登録方法を選択"}
          </h2>
          <button
            onClick={handleClose}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-6">
          {/* エラー表示 */}
          {(error || localError) && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm">
              {error || localError}
            </div>
          )}

          {/* 方法選択画面 */}
          {!linkMethod && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                現在のデータはそのまま引き継がれます。
              </p>

              {/* Google認証 */}
              <button
                onClick={handleGoogleLink}
                disabled={isLinking}
                className="w-full py-3 px-4 border border-gray-300 rounded-lg flex items-center justify-center gap-3 bg-white hover:bg-gray-50 disabled:opacity-50 text-gray-700"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {isLinking ? "連携中..." : "Googleで登録"}
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">または</span>
                </div>
              </div>

              {/* メール/パスワード選択 */}
              <button
                onClick={() => setLinkMethod("email")}
                className="w-full py-3 px-4 border border-gray-300 rounded-lg flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-700"
              >
                <svg
                  className="w-5 h-5 text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                メールアドレスで登録
              </button>
            </div>
          )}

          {/* メール/パスワード入力画面 */}
          {linkMethod === "email" && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
              >
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                戻る
              </button>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  メールアドレス
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  パスワード
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  パスワード（確認）
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                />
              </div>

              <button
                type="submit"
                disabled={isLinking}
                className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isLinking ? "登録中..." : "アカウントを作成"}
              </button>
            </form>
          )}
        </div>

        {/* フッター説明 */}
        {!linkMethod && (
          <div className="px-6 pb-6">
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-800">
                アカウントを作成すると、読書記録や対話履歴が永続的に保存され、
                別のデバイスからもアクセスできるようになります。
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
