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
  MentorFeedback,
  MentorMessage,
  MentorFeedbackType,
  InsightVisibility,
  InsightVisibilityResponse,
  TimelineResponse,
  TimelineOrder,
  Book,
  BookSearchResponse,
  BookCreateInput,
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

// --- メンターAPI ---

/**
 * メンターフィードバック一覧を取得
 */
export async function getMentorFeedbacks(
  limit: number = 10
): Promise<MentorFeedback[]> {
  return apiClient<MentorFeedback[]>(`/api/mentor/feedbacks?limit=${limit}`);
}

/**
 * 最新のメンターフィードバックを取得
 */
export async function getLatestMentorFeedback(): Promise<MentorFeedback | null> {
  return apiClient<MentorFeedback | null>("/api/mentor/feedbacks/latest");
}

/**
 * メンターとチャット
 */
export async function chatWithMentor(
  message: string,
  feedbackType: MentorFeedbackType = "weekly"
): Promise<MentorMessage> {
  return apiClient<MentorMessage>("/api/mentor/chat", {
    method: "POST",
    body: JSON.stringify({ message, feedback_type: feedbackType }),
  });
}

/**
 * メンターセッションをリセット
 */
export async function resetMentorSession(): Promise<{ status: string }> {
  return apiClient<{ status: string }>("/api/mentor/reset", {
    method: "POST",
  });
}

// --- Reading Session 初期化API ---

/**
 * セッション開始時にエージェントから初期メッセージを生成する（SSEストリーミング）
 */
export async function initializeReadingSession(
  readingId: string,
  sessionId: string,
  callbacks: SSECallbacks,
  signal?: AbortSignal
): Promise<void> {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : null;

  const response = await fetch(
    `/api/readings/${readingId}/sessions/${sessionId}/init`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
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

// --- ニックネームAPI ---

/**
 * ニックネームを取得する
 */
export async function getNickname(): Promise<{ name: string }> {
  return apiClient<{ name: string }>("/api/profile/name");
}

/**
 * ニックネームを更新する
 */
export async function updateNickname(name: string): Promise<{ name: string }> {
  return apiClient<{ name: string }>("/api/profile/name", {
    method: "PUT",
    body: JSON.stringify({ name }),
  });
}

// --- Insight公開設定API ---

/**
 * Insightの公開設定を更新する
 */
export async function updateInsightVisibility(
  readingId: string,
  insightId: string,
  visibility: InsightVisibility
): Promise<InsightVisibilityResponse> {
  return apiClient<InsightVisibilityResponse>(
    `/api/readings/${readingId}/insights/${insightId}/visibility`,
    {
      method: "PATCH",
      body: JSON.stringify({ visibility }),
    }
  );
}

// --- タイムラインAPI ---

/**
 * タイムライン（公開Insight一覧）を取得する
 */
export async function getTimeline(
  order: TimelineOrder = "random",
  limit: number = 20,
  cursor?: string
): Promise<TimelineResponse> {
  const params = new URLSearchParams({
    order,
    limit: String(limit),
  });
  if (cursor) {
    params.append("cursor", cursor);
  }
  return apiClient<TimelineResponse>(`/api/timeline?${params.toString()}`);
}

// --- Book API ---

/**
 * 書籍を検索する（Google Books API経由）
 */
export async function searchBooks(query: string): Promise<BookSearchResponse> {
  return apiClient<BookSearchResponse>(
    `/api/books/search?q=${encodeURIComponent(query)}`
  );
}

/**
 * 書籍を作成または取得する
 */
export async function createBook(data: BookCreateInput): Promise<Book> {
  return apiClient<Book>("/api/books", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * 書籍を取得する
 */
export async function getBook(bookId: string): Promise<Book> {
  return apiClient<Book>(`/api/books/${bookId}`);
}
