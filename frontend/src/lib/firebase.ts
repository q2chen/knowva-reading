import { initializeApp, getApps } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FB_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FB_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FB_PROJECT_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);

if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  try {
    connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
  } catch {
    // Already connected
  }
}
