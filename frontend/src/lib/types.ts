export interface BookEmbed {
  title: string;
  author: string;
}

export interface ReadingContext {
  situation?: string;
  motivation?: string;
  reading_style?: string;
}

export interface Reading {
  id: string;
  user_id: string;
  book: BookEmbed;
  read_count: number;
  status: "reading" | "completed";
  start_date: string;
  completed_date?: string;
  reading_context?: ReadingContext;
  latest_summary?: string;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  reading_id: string;
  session_type: "during_reading" | "after_completion" | "reflection";
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

export interface Insight {
  id: string;
  content: string;
  type: "learning" | "impression" | "question" | "connection";
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
