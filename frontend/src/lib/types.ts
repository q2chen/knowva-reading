export interface BookEmbed {
  title: string;
  author: string;
  cover_url?: string;
}

export interface ReadingContext {
  motivation?: string;
}

export type ReadingStatus = "not_started" | "reading" | "completed";

export interface Reading {
  id: string;
  user_id: string;
  book_id?: string;
  book: BookEmbed;
  read_count: number;
  status: ReadingStatus;
  start_date: string;
  completed_date?: string;
  reading_context?: ReadingContext;
  latest_summary?: string;
  created_at: string;
  updated_at: string;
}

// --- Book (グローバルコレクション) ---

export type BookSource = "google_books" | "openbd" | "manual";

export interface Book {
  id: string;
  isbn: string | null;
  title: string;
  author: string;
  description: string | null;
  cover_url: string | null;
  google_books_id: string | null;
  source: BookSource;
  created_at: string;
  updated_at: string;
}

export interface BookSearchResult {
  google_books_id: string | null;
  isbn: string | null;
  title: string;
  author: string;
  description: string | null;
  thumbnail_url: string | null;
  existing_book_id: string | null;
  has_reading: boolean;
}

export interface BookSearchResponse {
  results: BookSearchResult[];
  total: number;
}

export interface BookCreateInput {
  isbn?: string;
  title: string;
  author: string;
  description?: string;
  cover_url?: string;
  google_books_id?: string;
  source: BookSource;
}

export interface Session {
  id: string;
  reading_id: string;
  session_type: "before_reading" | "during_reading" | "after_reading";
  started_at: string;
  ended_at?: string;
  summary?: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  message: string;
  input_type: "text" | "voice";
  created_at: string;
}

export type InsightVisibility = "private" | "public" | "anonymous";

export interface Insight {
  id: string;
  content: string;
  type: "learning" | "impression" | "question" | "connection";
  visibility?: InsightVisibility;
  reading_status?: ReadingStatus;
  session_ref?: string;
  created_at: string;
}

export interface UserProfile {
  life_stage?: string;
  situation?: string;
  challenges: string[];
  values: string[];
  reading_motivation?: string;
}

export interface ProfileData {
  user_id: string;
  name?: string;
  email?: string;
  current_profile: UserProfile;
  created_at?: string;
}

// --- 心境データ (Mood) ---

export interface MoodMetrics {
  energy: number; // 1-5: 活力・エネルギー
  positivity: number; // 1-5: 気分のポジティブさ
  clarity: number; // 1-5: 思考の明晰さ
  motivation: number; // 1-5: モチベーション
  openness: number; // 1-5: 開放性
}

export interface MoodData {
  id: string;
  reading_id: string;
  mood_type: "before" | "after";
  metrics: MoodMetrics;
  note?: string;
  dominant_emotion?: string;
  recorded_at: string;
  created_at: string;
  updated_at: string;
}

export interface MoodComparison {
  reading_id: string;
  before_mood?: MoodData;
  after_mood?: MoodData;
  changes?: {
    energy: number;
    positivity: number;
    clarity: number;
    motivation: number;
    openness: number;
  };
}

export interface MoodCreateInput {
  mood_type: "before" | "after";
  metrics: MoodMetrics;
  note?: string;
  dominant_emotion?: string;
}

// --- プロファイルエントリ ---

export type ProfileEntryType = "goal" | "interest" | "book_wish" | "other";

export interface ProfileEntry {
  id: string;
  entry_type: ProfileEntryType;
  content: string;
  note?: string;
  session_ref?: string;
  created_at: string;
  updated_at: string;
}

// --- 全読書Insight集約 ---

export interface InsightWithBook extends Insight {
  reading_id: string;
  book: BookEmbed;
}

export interface InsightGroup {
  key: string;
  book?: BookEmbed;
  insight_type?: string;
  count: number;
}

export interface AllInsightsResponse {
  insights: InsightWithBook[];
  total_count: number;
  grouped_by: "book" | "type";
  groups: InsightGroup[];
}

// --- SSEストリーミング ---

export type SSEEventType =
  | "message_start"
  | "text_delta"
  | "text_done"
  | "tool_call_start"
  | "tool_call_done"
  | "options_request"
  | "message_done"
  | "error"
  | "ping";

export interface SSEMessageStartData {
  message_id: string;
}

export interface SSETextDeltaData {
  delta: string;
}

export interface SSETextDoneData {
  text: string;
}

export interface SSEToolCallStartData {
  tool_name: string;
  tool_call_id: string;
}

export interface SSEToolCallDoneData {
  tool_call_id: string;
  result: unknown;
}

export interface SSEOptionsRequestData {
  prompt: string;
  options: string[];
  allow_multiple: boolean;
  allow_freeform: boolean;
}

export interface SSEMessageDoneData {
  message: Message;
}

export interface SSEErrorData {
  code: string;
  message: string;
}

export interface ToolCallState {
  name: string;
  id: string;
  result?: unknown;
}

export interface OptionsState {
  prompt: string;
  options: string[];
  allowMultiple: boolean;
  allowFreeform: boolean;
}

export interface StreamingState {
  isStreaming: boolean;
  currentText: string;
  messageId: string | null;
  toolCalls: ToolCallState[];
  optionsRequest: OptionsState | null;
}

// === ユーザー設定 ===

export type InteractionMode = "freeform" | "guided";
export type TimelineOrder = "random" | "newest";

export interface UserSettings {
  interaction_mode: InteractionMode;
  timeline_order?: TimelineOrder;
}

// --- メンター機能 ---

export type MentorFeedbackType = "weekly" | "monthly";

export interface MentorFeedback {
  id: string;
  feedback_type: MentorFeedbackType;
  content: string;
  period_start?: string;
  period_end?: string;
  created_at: string;
}

export interface MentorMessage {
  id: string;
  role: "user" | "assistant";
  message: string;
  created_at: string;
}

// --- タイムライン (POP) ---

export interface TimelineInsight {
  id: string;
  insight_id: string;
  content: string;
  type: "learning" | "impression" | "question" | "connection";
  display_name: string;
  book: BookEmbed;
  reading_status?: ReadingStatus;
  published_at: string;
  is_own: boolean;
}

export interface TimelineResponse {
  insights: TimelineInsight[];
  next_cursor: string | null;
  has_more: boolean;
}

export interface InsightVisibilityResponse {
  id: string;
  visibility: InsightVisibility;
  published_at?: string;
}

// --- 読書レポート ---

export interface ReportMetadata {
  session_count: number;
  insight_count: number;
  generation_model: string;
}

export interface Report {
  id: string;
  reading_id: string;
  summary: string;
  insights_summary: string;
  context_analysis: string;
  action_plan_ids: string[];
  metadata: ReportMetadata;
  created_at: string;
  updated_at: string;
}

// --- アクションプラン ---

export type ActionPlanStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "skipped";
export type ActionPlanDifficulty = "easy" | "medium" | "hard";

export interface ActionPlan {
  id: string;
  reading_id: string;
  action: string;
  source_insight_id?: string;
  relevance: string;
  difficulty: ActionPlanDifficulty;
  timeframe: string;
  status: ActionPlanStatus;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ActionPlanUpdateInput {
  status?: ActionPlanStatus;
}
