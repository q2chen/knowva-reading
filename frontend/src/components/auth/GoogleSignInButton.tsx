"use client";

import { useState } from "react";
import { signInWithPopup, AuthError } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

interface GoogleSignInButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  label?: string;
}

function getErrorMessage(error: AuthError): string {
  switch (error.code) {
    case "auth/popup-closed-by-user":
      return "ログインがキャンセルされました。";
    case "auth/popup-blocked":
      return "ポップアップがブロックされました。ポップアップを許可してください。";
    case "auth/account-exists-with-different-credential":
      return "このメールアドレスは別の方法で登録されています。";
    case "auth/network-request-failed":
      return "ネットワークエラーが発生しました。接続を確認してください。";
    default:
      return "Googleログインに失敗しました。もう一度お試しください。";
  }
}

export function GoogleSignInButton({
  onSuccess,
  onError,
  label = "Googleでログイン",
}: GoogleSignInButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      onSuccess?.();
    } catch (error) {
      console.error("Google sign-in error:", error);
      const message = getErrorMessage(error as AuthError);
      onError?.(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleGoogleSignIn}
      disabled={loading}
      className="w-full py-2 px-4 border border-gray-300 rounded-md flex items-center justify-center gap-2 bg-white hover:bg-gray-50 disabled:opacity-50 text-gray-700 cursor-pointer"
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
      {loading ? "ログイン中..." : label}
    </button>
  );
}
