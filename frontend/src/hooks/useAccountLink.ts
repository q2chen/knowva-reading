"use client";

import { useState } from "react";
import { AuthError } from "firebase/auth";
import { linkWithEmail, linkWithGoogle } from "@/lib/firebase";
import { useAuth } from "@/providers/AuthProvider";

interface UseAccountLinkReturn {
  isLinking: boolean;
  error: string | null;
  linkWithEmailPassword: (email: string, password: string) => Promise<boolean>;
  linkWithGoogleAccount: () => Promise<boolean>;
  clearError: () => void;
}

function getErrorMessage(error: AuthError): string {
  switch (error.code) {
    case "auth/credential-already-in-use":
      return "このメールアドレスは既に別のアカウントで使用されています。";
    case "auth/email-already-in-use":
      return "このメールアドレスは既に登録されています。";
    case "auth/invalid-credential":
      return "認証情報が無効です。";
    case "auth/operation-not-allowed":
      return "この認証方法は現在利用できません。";
    case "auth/popup-closed-by-user":
      return "ログインがキャンセルされました。";
    case "auth/popup-blocked":
      return "ポップアップがブロックされました。ブラウザの設定を確認してください。";
    case "auth/weak-password":
      return "パスワードは6文字以上で入力してください。";
    case "auth/provider-already-linked":
      return "この認証方法は既にリンクされています。";
    default:
      return "アカウントのリンクに失敗しました。もう一度お試しください。";
  }
}

export function useAccountLink(): UseAccountLinkReturn {
  const { user } = useAuth();
  const [isLinking, setIsLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const linkWithEmailPassword = async (
    email: string,
    password: string
  ): Promise<boolean> => {
    if (!user || !user.isAnonymous) return false;

    setIsLinking(true);
    setError(null);

    try {
      await linkWithEmail(user, email, password);
      return true;
    } catch (e) {
      const message = getErrorMessage(e as AuthError);
      setError(message);
      return false;
    } finally {
      setIsLinking(false);
    }
  };

  const linkWithGoogleAccount = async (): Promise<boolean> => {
    if (!user || !user.isAnonymous) return false;

    setIsLinking(true);
    setError(null);

    try {
      await linkWithGoogle(user);
      return true;
    } catch (e) {
      const message = getErrorMessage(e as AuthError);
      setError(message);
      return false;
    } finally {
      setIsLinking(false);
    }
  };

  const clearError = () => setError(null);

  return {
    isLinking,
    error,
    linkWithEmailPassword,
    linkWithGoogleAccount,
    clearError,
  };
}
