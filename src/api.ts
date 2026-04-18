import type {
  Config,
  Progress,
  Library,
  TrainingSession,
  AdminOverview,
  SystemWords,
  EnrichedWord,
  ForgotPasswordForm,
  ResetPasswordForm,
} from "./types";

export const defaultConfig: Config = {
  dataBaseUrl: import.meta.env.VITE_API_URL || "http://localhost:8001",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function request<T = unknown>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, options);
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = isJson ? await response.json() : await response.text();

  if (response.status === 401) {
    localStorage.removeItem("master-english-ui-session");
    window.location.reload();
    return undefined as T;
  }

  if (!response.ok) {
    const detail = isJson
      ? (payload.detail ?? payload.message ?? JSON.stringify(payload))
      : payload;
    throw new Error(detail || `Request failed with status ${response.status}`);
  }

  return payload as T;
}

function withQuery(
  baseUrl: string,
  params: Record<string, string | number | undefined | null>,
): string {
  const url = new URL(baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

export function createApiClient(config: Config, token?: string) {
  const base = config.dataBaseUrl || "";
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  return {
    login(body: { identifier: string; password: string }) {
      return request<{
        access_token: string;
        user_id: string;
        email: string;
        role: "user" | "admin";
        message?: string;
      }>(`${base}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    },

    register(body: { name: string; email: string; phone?: string; password: string; role: string }) {
      return request<{ user_id: string; message?: string }>(`${base}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    },

    logout() {
      return request<void>(`${base}/api/auth/logout`, {
        method: "POST",
        headers: { ...authHeaders },
      });
    },

    forgotPassword(body: ForgotPasswordForm) {
      return request<{ success: boolean; method: string; masked_target: string; debug_code?: string }>(
        `${base}/api/auth/forgot-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
    },

    resetPassword(body: Omit<ResetPasswordForm, "confirm_password">) {
      return request<{ success: boolean; message: string }>(
        `${base}/api/auth/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
    },

    getProgress(userId: string) {
      return request<Progress>(`${base}/api/users/${userId}/progress`, {
        headers: { ...authHeaders },
      });
    },

    getLibrary(userId: string, search = "", limit = 100) {
      return request<Library>(
        withQuery(`${base}/api/users/${userId}/words`, { search, limit }),
        { headers: { ...authHeaders } },
      );
    },

    ingestWord(body: { word: string; user_id: string; source: string; context?: string }) {
      return request<{ status: string; word_id: string; enriched_word: EnrichedWord }>(
        `${base}/api/words/ingest`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify(body),
        },
      );
    },

    bulkIngestWords(body: {
      user_id: string;
      source: string;
      lang: string;
      input_lang?: string;
      words: { word: string }[];
    }) {
      return request<{ created: number; duplicates: number }>(`${base}/api/words/bulk-ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify(body),
      });
    },

    deleteWord(userId: string, wordId: string) {
      return request<void>(`${base}/api/users/${userId}/words/${wordId}`, {
        method: "DELETE",
        headers: { ...authHeaders },
      });
    },

    updateWord(
      userId: string,
      wordId: string,
      body: { knowledge_stage?: number; next_review_date?: string; translation?: string },
    ) {
      return request<void>(`${base}/api/users/${userId}/words/${wordId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify(body),
      });
    },

    enrichWord(word: string, lang = "he") {
      return request<EnrichedWord>(
        withQuery(`${base}/api/words/enrich`, { word, lang }),
        { headers: { ...authHeaders } },
      );
    },

    translateWord(word: string, sourceLang: string, targetLang: string) {
      return request<{ translated: string }>(
        withQuery(`${base}/api/words/translate`, { word, source_lang: sourceLang, target_lang: targetLang }),
        { headers: { ...authHeaders } },
      );
    },

    checkDuplicate(word: string, userId: string) {
      return request<{ exists: boolean; word_id?: string }>(
        withQuery(`${base}/api/words/check-duplicate`, { word, user_id: userId }),
        { headers: { ...authHeaders } },
      );
    },

    getTrainingQueue(userId: string, count: number) {
      return request<TrainingSession>(
        withQuery(`${base}/api/training/queue`, { user_id: userId, count }),
        { headers: { ...authHeaders } },
      );
    },

    submitTrainingResult(body: {
      session_id: string;
      word_id: string;
      user_id: string;
      result: string;
      time_taken_ms: number;
      score_only?: boolean;
    }) {
      return request<{ next_review_date: string; new_stage: number }>(
        `${base}/api/training/results`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify(body),
        },
      );
    },

    getAdminOverview() {
      return request<AdminOverview>(`${base}/api/admin/overview`, {
        headers: { ...authHeaders },
      });
    },

    adminAction(
      targetUserId: string,
      body: {
        admin_id: string;
        action_type: string;
        target_user_id: string;
        new_role?: string;
      },
    ) {
      return request<{ message?: string }>(`${base}/api/admin/users/${targetUserId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify(body),
      });
    },

    deleteUser(targetUserId: string) {
      return request<{ message?: string }>(`${base}/api/admin/users/${targetUserId}`, {
        method: "DELETE",
        headers: { ...authHeaders },
      });
    },

    getSystemWords(search = "", limit = 200) {
      return request<SystemWords>(
        withQuery(`${base}/api/admin/system-words`, { search, limit }),
        { headers: { ...authHeaders } },
      );
    },

    dedupSystemWords() {
      return request<{ removed: number }>(`${base}/api/admin/system-words/dedup`, {
        method: "POST",
        headers: { ...authHeaders },
      });
    },

    updateSystemWord(word: string, translation: string) {
      return request<{ success: boolean; word: string; translation: string }>(
        `${base}/api/admin/system-words/${encodeURIComponent(word)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({ translation }),
        },
      );
    },

    deleteSystemWord(word: string) {
      return request<{ success: boolean; word: string }>(
        `${base}/api/admin/system-words/${encodeURIComponent(word)}`,
        {
          method: "DELETE",
          headers: { ...authHeaders },
        },
      );
    },

    getUserLibrary(userId: string, search = "", limit = 200) {
      return request<Library>(
        withQuery(`${base}/api/users/${userId}/words`, { search, limit }),
        { headers: { ...authHeaders } },
      );
    },
  };
}
