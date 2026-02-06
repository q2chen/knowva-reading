import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  GoogleAuthProvider,
  signInAnonymously,
  linkWithCredential,
  linkWithPopup,
  EmailAuthProvider,
  sendEmailVerification,
  User,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FB_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FB_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FB_PROJECT_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);

// Google Auth Provider（スコープ指定なし = デフォルト最小権限）
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// Anonymous認証（ゲストアクセス用）
export const signInAsGuest = () => signInAnonymously(auth);

// アカウントリンク: メール/パスワードで匿名アカウントをアップグレード
export const linkWithEmail = async (
  user: User,
  email: string,
  password: string
): Promise<User> => {
  const credential = EmailAuthProvider.credential(email, password);
  const result = await linkWithCredential(user, credential);
  await sendEmailVerification(result.user);
  return result.user;
};

// アカウントリンク: Googleアカウントで匿名アカウントをアップグレード
export const linkWithGoogle = async (user: User): Promise<User> => {
  const result = await linkWithPopup(user, googleProvider);
  return result.user;
};

if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  try {
    connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
  } catch {
    // Already connected
  }
}
