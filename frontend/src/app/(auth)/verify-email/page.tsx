"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { sendEmailVerification, reload } from "firebase/auth";
import { useAuth } from "@/providers/AuthProvider";
import { auth } from "@/lib/firebase";

export default function VerifyEmailPage() {
  const { user, loading } = useAuth();
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState("");
  const [checking, setChecking] = useState(false);
  const router = useRouter();

  // Redirect if no user or already verified
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
    if (!loading && user?.emailVerified) {
      router.replace("/home");
    }
  }, [user, loading, router]);

  // Periodically check if email is verified
  useEffect(() => {
    if (!user || user.emailVerified) return;

    const interval = setInterval(async () => {
      try {
        await reload(user);
        if (auth.currentUser?.emailVerified) {
          router.replace("/home");
        }
      } catch (error) {
        console.error("Error checking verification status:", error);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [user, router]);

  const handleResendEmail = async () => {
    if (!user) return;

    setResending(true);
    setMessage("");

    try {
      await sendEmailVerification(user);
      setMessage("確認メールを再送信しました。");
    } catch (error) {
      console.error("Error sending verification email:", error);
      setMessage("メールの送信に失敗しました。しばらくしてからお試しください。");
    } finally {
      setResending(false);
    }
  };

  const handleCheckVerification = async () => {
    if (!user) return;

    setChecking(true);
    try {
      await reload(user);
      if (auth.currentUser?.emailVerified) {
        router.replace("/home");
      } else {
        setMessage("まだ確認が完了していません。メールをご確認ください。");
      }
    } catch (error) {
      console.error("Error checking verification:", error);
    } finally {
      setChecking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (user?.emailVerified) {
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md text-center">
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-blue-600"
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
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-2">メールアドレスを確認してください</h1>
        <p className="text-gray-600 mb-6">
          {user?.email} に確認メールを送信しました。
          メール内のリンクをクリックして、登録を完了してください。
        </p>

        {message && (
          <div
            className={`mb-4 p-3 rounded text-sm ${
              message.includes("失敗")
                ? "bg-red-50 text-red-700"
                : "bg-green-50 text-green-700"
            }`}
          >
            {message}
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleCheckVerification}
            disabled={checking}
            className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {checking ? "確認中..." : "確認が完了した"}
          </button>

          <button
            onClick={handleResendEmail}
            disabled={resending}
            className="w-full py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            {resending ? "送信中..." : "確認メールを再送信"}
          </button>
        </div>

        <p className="mt-6 text-xs text-gray-500">
          メールが届かない場合は、迷惑メールフォルダをご確認ください。
        </p>
      </div>
    </div>
  );
}
