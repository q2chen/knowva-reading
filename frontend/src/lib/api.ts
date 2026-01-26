import { auth } from "./firebase";
import type {
  SSEEventType,
  SSEMessageStartData,
  SSETextDeltaData,
  SSETextDoneData,
  SSEToolCallStartData,
  SSEToolCallDoneData,
  SSEOptionsRequestData,
  SSEMessageDoneData,
  SSEErrorData,
  UserSettings,
} from "./types";

// Next.js rewrites経由で同一オリジンからAPIにアクセス（CORSを回避）
export async function apiClient<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : null;

  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `API Error: ${res.status}`);
  }

  return res.json();
}

// --- SSEストリーミング ---

export interface SSECallbacks {
  onMessageStart?: (data: SSEMessageStartData) => void;
  onTextDelta?: (data: SSETextDeltaData) => void;
  onTextDone?: (data: SSETextDoneData) => void;
  onToolCallStart?: (data: SSEToolCallStartData) => void;
  onToolCallDone?: (data: SSEToolCallDoneData) => void;
  onOptionsRequest?: (data: SSEOptionsRequestData) => void;
  onMessageDone?: (data: SSEMessageDoneData) => void;
  onError?: (data: SSEErrorData) => void;
  onConnectionError?: (error: Error) => void;
}

/**
 * SSEストリーミングでメッセージを送信する
 */
export async function sendMessageStream(
  readingId: string,
  sessionId: string,
  message: string,
  inputType: "text" | "voice",
  callbacks: SSECallbacks,
  signal?: AbortSignal
): Promise<void> {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : null;

  const response = await fetch(
    `/api/readings/${readingId}/sessions/${sessionId}/messages/stream`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ message, input_type: inputType }),
      signal,
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `API Error: ${response.status}`);
  }

  if (!response.body) {
    throw new Error("Response body is null");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      let currentEvent: SSEEventType | null = null;

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7).trim() as SSEEventType;
        } else if (line.startsWith("data: ") && currentEvent) {
          try {
            const data = JSON.parse(line.slice(6));

            switch (currentEvent) {
              case "message_start":
                callbacks.onMessageStart?.(data);
                break;
              case "text_delta":
                callbacks.onTextDelta?.(data);
                break;
              case "text_done":
                callbacks.onTextDone?.(data);
                break;
              case "tool_call_start":
                callbacks.onToolCallStart?.(data);
                break;
              case "tool_call_done":
                callbacks.onToolCallDone?.(data);
                break;
              case "options_request":
                callbacks.onOptionsRequest?.(data);
                break;
              case "message_done":
                callbacks.onMessageDone?.(data);
                break;
              case "error":
                callbacks.onError?.(data);
                break;
            }
          } catch (e) {
            console.error("Failed to parse SSE data:", e);
          }
          currentEvent = null;
        }
      }
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return; // 正常なキャンセル
    }
    callbacks.onConnectionError?.(error as Error);
  }
}

// --- ユーザー設定API ---

/**
 * ユーザー設定を取得する
 */
export async function getUserSettings(): Promise<UserSettings> {
  return apiClient<UserSettings>("/api/profile/settings");
}

/**
 * ユーザー設定を更新する
 */
export async function updateUserSettings(
  settings: Partial<UserSettings>
): Promise<UserSettings> {
  return apiClient<UserSettings>("/api/profile/settings", {
    method: "PUT",
    body: JSON.stringify(settings),
  });
}
