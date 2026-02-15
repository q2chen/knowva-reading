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
  UserProfile,
  UserProfileUpdate,
  MentorFeedback,
  MentorMessage,
  MentorFeedbackType,
  InsightVisibility,
  InsightVisibilityResponse,
  ReportVisibilityResponse,
  TimelineResponse,
  TimelineResponseV2,
  TimelineOrder,
  TimelineItemType,
  Book,
  BookSearchResponse,
  BookCreateInput,
  Report,
  ActionPlan,
  ActionPlanCreateInput,
  ActionPlanUpdateInput,
  OnboardingStatus,
  OnboardingSubmit,
  OnboardingResponse,
  BadgeDefinition,
  UserBadge,
  BadgeCheckResponse,
  Reading,
  ReadingUpdateInput,
  ReadingDeleteConfirmation,
  ReadingDeleteResponse,
  Insight,
  InsightCreateInput,
  InsightUpdateInput,
  InsightDeleteResponse,
  InsightMergePreviewResponse,
  InsightMergeConfirmInput,
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

// --- ユーザープロフィールAPI ---

/**
 * ユーザープロフィールを取得する
 */
export async function getUserProfile(): Promise<UserProfile> {
  return apiClient<UserProfile>("/api/profile/current");
}

/**
 * ユーザープロフィールを更新する
 */
export async function updateUserProfile(
  profile: UserProfileUpdate
): Promise<UserProfile> {
  return apiClient<UserProfile>("/api/profile/current", {
    method: "PUT",
    body: JSON.stringify(profile),
  });
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

// --- セッション終了API ---

/**
 * セッションを終了し、対話内容の要約を生成する
 */
export async function endSession(
  readingId: string,
  sessionId: string
): Promise<void> {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : null;

  // sendBeacon用のAPI呼び出し（ページ離脱時でも確実に送信するため）
  await fetch(`/api/readings/${readingId}/sessions/${sessionId}/end`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    keepalive: true,
  });
}

/**
 * セッション終了用のBeacon URL（sendBeacon用）
 * 認証情報が必要なためfetchを使用
 */
export function getEndSessionUrl(readingId: string, sessionId: string): string {
  return `/api/readings/${readingId}/sessions/${sessionId}/end`;
}

/**
 * セッションを削除する（メッセージも含む）
 */
export async function deleteSession(
  readingId: string,
  sessionId: string
): Promise<void> {
  await apiClient(`/api/readings/${readingId}/sessions/${sessionId}`, {
    method: "DELETE",
  });
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

/**
 * タイムラインV2（公開Insight + Report一覧）を取得する
 */
export async function getTimelineV2(
  order: TimelineOrder = "random",
  itemType: TimelineItemType | "all" = "all",
  limit: number = 20,
  cursor?: string
): Promise<TimelineResponseV2> {
  const params = new URLSearchParams({
    order,
    item_type: itemType,
    limit: String(limit),
  });
  if (cursor) {
    params.append("cursor", cursor);
  }
  return apiClient<TimelineResponseV2>(`/api/timeline/v2?${params.toString()}`);
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

// --- Report API ---

/**
 * レポート生成をSSEストリーミングで開始する
 */
export async function generateReportStream(
  readingId: string,
  callbacks: SSECallbacks,
  signal?: AbortSignal
): Promise<void> {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : null;

  const response = await fetch(`/api/readings/${readingId}/reports/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    signal,
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: "Unknown error" }));
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
      return;
    }
    callbacks.onConnectionError?.(error as Error);
  }
}

/**
 * レポート一覧を取得する
 */
export async function getReports(readingId: string): Promise<Report[]> {
  return apiClient<Report[]>(`/api/readings/${readingId}/reports`);
}

/**
 * 最新のレポートを取得する
 */
export async function getLatestReport(readingId: string): Promise<Report | null> {
  return apiClient<Report | null>(`/api/readings/${readingId}/reports/latest`);
}

/**
 * レポートの公開設定を更新する
 */
export async function updateReportVisibility(
  readingId: string,
  reportId: string,
  visibility: InsightVisibility,
  includeContextAnalysis: boolean
): Promise<ReportVisibilityResponse> {
  return apiClient<ReportVisibilityResponse>(
    `/api/readings/${readingId}/reports/${reportId}/visibility`,
    {
      method: "PATCH",
      body: JSON.stringify({
        visibility,
        include_context_analysis: includeContextAnalysis,
      }),
    }
  );
}

// --- Action Plan API ---

/**
 * アクションプラン一覧を取得する
 */
export async function getActionPlans(readingId: string): Promise<ActionPlan[]> {
  return apiClient<ActionPlan[]>(`/api/readings/${readingId}/action-plans`);
}

/**
 * アクションプランを手動で作成する
 */
export async function createActionPlan(
  readingId: string,
  data: ActionPlanCreateInput
): Promise<ActionPlan> {
  return apiClient<ActionPlan>(`/api/readings/${readingId}/action-plans`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * アクションプランを更新する
 */
export async function updateActionPlan(
  readingId: string,
  planId: string,
  data: ActionPlanUpdateInput
): Promise<ActionPlan> {
  return apiClient<ActionPlan>(
    `/api/readings/${readingId}/action-plans/${planId}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    }
  );
}

/**
 * アクションプランを削除する
 */
export async function deleteActionPlan(
  readingId: string,
  planId: string
): Promise<void> {
  await apiClient(`/api/readings/${readingId}/action-plans/${planId}`, {
    method: "DELETE",
  });
}

/**
 * 全読書のアクションプランを取得する（ホーム画面用）
 */
export type ActionPlanWithBook = ActionPlan & { bookTitle: string; readingId: string };

export async function getAllActionPlans(): Promise<ActionPlanWithBook[]> {
  const readings = await apiClient<Reading[]>("/api/readings");
  const allPlans: ActionPlanWithBook[] = [];

  await Promise.all(
    readings.map(async (reading) => {
      try {
        const plans = await getActionPlans(reading.id);
        plans.forEach((plan) => {
          allPlans.push({
            ...plan,
            bookTitle: reading.book.title,
            readingId: reading.id,
          });
        });
      } catch {
        // 個別の読書でエラーが起きても続行
      }
    })
  );

  // 未完了を上に、完了を下にソート
  const statusOrder: Record<string, number> = {
    pending: 0,
    in_progress: 1,
    completed: 2,
    skipped: 3,
  };
  return allPlans.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
}

// --- オンボーディングAPI ---

/**
 * オンボーディング状態を取得する
 */
export async function getOnboardingStatus(): Promise<OnboardingStatus> {
  return apiClient<OnboardingStatus>("/api/onboarding/status");
}

/**
 * オンボーディング回答を送信する
 */
export async function submitOnboarding(
  data: OnboardingSubmit
): Promise<OnboardingResponse> {
  return apiClient<OnboardingResponse>("/api/onboarding/submit", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// --- バッジAPI ---

/**
 * 全バッジ定義を取得する
 */
export async function getBadgeDefinitions(): Promise<BadgeDefinition[]> {
  return apiClient<BadgeDefinition[]>("/api/badges");
}

/**
 * ユーザーの獲得バッジ一覧を取得する
 */
export async function getUserBadges(): Promise<UserBadge[]> {
  return apiClient<UserBadge[]>("/api/badges/user");
}

/**
 * バッジ獲得条件をチェックする
 */
export async function checkAndAwardBadges(): Promise<BadgeCheckResponse> {
  return apiClient<BadgeCheckResponse>("/api/badges/check", {
    method: "POST",
  });
}

// --- Reading CRUD API ---

/**
 * 読書記録を更新する
 */
export async function updateReading(
  readingId: string,
  data: ReadingUpdateInput
): Promise<Reading> {
  return apiClient<Reading>(`/api/readings/${readingId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

/**
 * 読書記録削除前のプレビュー（関連データ件数取得）
 */
export async function previewReadingDelete(
  readingId: string
): Promise<ReadingDeleteConfirmation> {
  return apiClient<ReadingDeleteConfirmation>(
    `/api/readings/${readingId}/delete-preview`
  );
}

/**
 * 読書記録を削除する（関連データすべて含む）
 */
export async function deleteReading(
  readingId: string
): Promise<ReadingDeleteResponse> {
  return apiClient<ReadingDeleteResponse>(`/api/readings/${readingId}`, {
    method: "DELETE",
  });
}

// --- Insight CRUD API ---

/**
 * 気づきを手動で作成する
 */
export async function createInsight(
  readingId: string,
  data: InsightCreateInput
): Promise<Insight> {
  return apiClient<Insight>(`/api/readings/${readingId}/insights`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Insightを更新する
 */
export async function updateInsight(
  readingId: string,
  insightId: string,
  data: InsightUpdateInput
): Promise<Insight> {
  return apiClient<Insight>(`/api/readings/${readingId}/insights/${insightId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

/**
 * 複数のInsightを削除する
 */
export async function deleteInsights(
  readingId: string,
  insightIds: string[]
): Promise<InsightDeleteResponse> {
  return apiClient<InsightDeleteResponse>(
    `/api/readings/${readingId}/insights/delete`,
    {
      method: "POST",
      body: JSON.stringify({ insight_ids: insightIds }),
    }
  );
}

/**
 * Insightマージのプレビュー（LLM生成）
 */
export async function previewInsightMerge(
  readingId: string,
  insightIds: string[]
): Promise<InsightMergePreviewResponse> {
  return apiClient<InsightMergePreviewResponse>(
    `/api/readings/${readingId}/insights/merge/preview`,
    {
      method: "POST",
      body: JSON.stringify({ insight_ids: insightIds }),
    }
  );
}

/**
 * Insightマージを確定する
 */
export async function confirmInsightMerge(
  readingId: string,
  data: InsightMergeConfirmInput
): Promise<Insight> {
  return apiClient<Insight>(`/api/readings/${readingId}/insights/merge`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}
