export interface Config {
  dataBaseUrl: string;
}

export interface Session {
  access_token: string;
  user_id: string;
  email: string;
  role: "user" | "admin";
}

export interface Progress {
  total_words: number;
  words_mastered: number;
  words_in_progress: number;
  streak_days: number;
  last_session_date: string | null;
  total_score: number;
}

export interface LibraryItem {
  word_id: string;
  word: string;
  translation: string;
  difficulty: string;
  knowledge_stage: number;
  score: number;
  next_review_date: string | null;
}

export interface Library {
  total: number;
  items: LibraryItem[];
}

export interface TrainingItem {
  word_id: string;
  word: string;
  translation: string;
}

export interface TrainingSession {
  session_id: string;
  queue: TrainingItem[];
}

export interface TrainingSummaryEntry {
  word: string;
  translation: string;
  answer: "correct" | "incorrect";
  next_review_date: string | null;
  new_stage: number;
  time_taken_ms: number;
}

export interface AdminUser {
  user_id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  words_count: number;
  progress_score: number;
}

export interface AdminOverview {
  total_users: number;
  active_users: number;
  total_words_in_system: number;
  users: AdminUser[];
}

export interface SystemWord {
  word: string;
  translation: string;
  difficulty: string;
}

export interface SystemWords {
  total: number;
  items: SystemWord[];
}

export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  name: string;
  email: string;
  password: string;
  role: "user" | "admin";
}

export interface ManualForm {
  word: string;
  context: string;
}

export interface CaptureForm {
  word: string;
  context: string;
  lang: string;
}

export interface ExamplePair {
  en: string;
  he: string;
}

export interface EnrichedWord {
  word: string;
  translation: string;
  definition: string;
  definition_he: string;
  examples: ExamplePair[];
  difficulty_level: string;
}

export interface CapturePreview {
  enriched: EnrichedWord;
  duplicate: {
    exists: boolean;
    word_id?: string;
  };
}
