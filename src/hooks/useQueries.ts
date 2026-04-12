import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { useApi, useAppStore } from "../store";
import type { AdminUser } from "../types";

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const qk = {
  progress: (userId: string) => ["progress", userId] as const,
  library: (userId: string, search: string) => ["library", userId, search] as const,
  adminOverview: () => ["adminOverview"] as const,
  systemWords: (search: string) => ["systemWords", search] as const,
};

// ─── Shared helper ────────────────────────────────────────────────────────────

function useStoreCallbacks() {
  const setStatusMessage = useAppStore((s) => s.setStatusMessage);
  const setErrorMessage = useAppStore((s) => s.setErrorMessage);
  return { setStatusMessage, setErrorMessage };
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export function useProgress() {
  const api = useApi();
  const userId = useAppStore((s) => s.session?.user_id ?? "");
  return useQuery({
    queryKey: qk.progress(userId),
    queryFn: () => api.getProgress(userId),
    enabled: !!userId,
  });
}

export function useLibrary(search: string) {
  const api = useApi();
  const userId = useAppStore((s) => s.session?.user_id ?? "");
  return useQuery({
    queryKey: qk.library(userId, search),
    queryFn: () => api.getLibrary(userId, search, 100),
    enabled: !!userId,
    placeholderData: keepPreviousData,
  });
}

export function useAdminOverview() {
  const api = useApi();
  const isAdmin = useAppStore((s) => s.session?.role === "admin");
  return useQuery({
    queryKey: qk.adminOverview(),
    queryFn: () => api.getAdminOverview(),
    enabled: isAdmin,
  });
}

export function useSystemWords(search: string) {
  const api = useApi();
  const isAdmin = useAppStore((s) => s.session?.role === "admin");
  return useQuery({
    queryKey: qk.systemWords(search),
    queryFn: () => api.getSystemWords(search, 200),
    enabled: isAdmin,
    placeholderData: keepPreviousData,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useIngestWord() {
  const api = useApi();
  const queryClient = useQueryClient();
  const userId = useAppStore((s) => s.session?.user_id ?? "");
  const { setStatusMessage, setErrorMessage } = useStoreCallbacks();

  return useMutation({
    mutationFn: (body: { word: string; source: string; context?: string }) =>
      api.ingestWord({ ...body, user_id: userId }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["library", userId] });
      void queryClient.invalidateQueries({ queryKey: ["progress", userId] });
      setStatusMessage(
        result.status === "duplicate"
          ? "המילה כבר קיימת בספרייה, אבל נשמר לך המידע המועשר להצגה."
          : `המילה נשמרה בהצלחה. תרגום: ${result.enriched_word.translation}`,
      );
    },
    onError: (err: Error) => setErrorMessage(err.message),
  });
}

export function useBulkIngestWords() {
  const api = useApi();
  const queryClient = useQueryClient();
  const userId = useAppStore((s) => s.session?.user_id ?? "");
  const { setStatusMessage, setErrorMessage } = useStoreCallbacks();

  return useMutation({
    mutationFn: (body: { lang: string; input_lang?: string; words: { word: string }[] }) =>
      api.bulkIngestWords({ ...body, user_id: userId, source: "import" }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["library", userId] });
      void queryClient.invalidateQueries({ queryKey: ["progress", userId] });
      setStatusMessage(
        `הייבוא הסתיים — ${result.created} מילים חדשות, ${result.duplicates} כפילויות.`,
      );
    },
    onError: (err: Error) => setErrorMessage(err.message),
  });
}

export function useDeleteWord() {
  const api = useApi();
  const queryClient = useQueryClient();
  const userId = useAppStore((s) => s.session?.user_id ?? "");
  const { setStatusMessage, setErrorMessage } = useStoreCallbacks();

  return useMutation({
    mutationFn: (wordId: string) => api.deleteWord(userId, wordId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["library", userId] });
      setStatusMessage("המילה נמחקה בהצלחה.");
    },
    onError: (err: Error) => setErrorMessage(err.message),
  });
}

export function useUpdateWord() {
  const api = useApi();
  const queryClient = useQueryClient();
  const userId = useAppStore((s) => s.session?.user_id ?? "");
  const { setStatusMessage, setErrorMessage } = useStoreCallbacks();

  return useMutation({
    mutationFn: ({
      wordId,
      body,
    }: {
      wordId: string;
      body: { knowledge_stage?: number; next_review_date?: string };
    }) => api.updateWord(userId, wordId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["library", userId] });
      setStatusMessage("המילה עודכנה בהצלחה.");
    },
    onError: (err: Error) => setErrorMessage(err.message),
  });
}

export function useStartTraining() {
  const api = useApi();
  const userId = useAppStore((s) => s.session?.user_id ?? "");
  const { setErrorMessage } = useStoreCallbacks();

  return useMutation({
    mutationFn: (count: number) => api.getTrainingQueue(userId, count),
    onError: (err: Error) => setErrorMessage(err.message),
  });
}

export function useSubmitTrainingResult() {
  const api = useApi();
  const userId = useAppStore((s) => s.session?.user_id ?? "");
  const { setErrorMessage } = useStoreCallbacks();

  return useMutation({
    mutationFn: (body: {
      session_id: string;
      word_id: string;
      result: string;
      time_taken_ms: number;
      score_only?: boolean;
    }) => api.submitTrainingResult({ ...body, user_id: userId }),
    onError: (err: Error) => setErrorMessage(err.message),
  });
}

export function useEnrichAndCheck() {
  const api = useApi();
  const userId = useAppStore((s) => s.session?.user_id ?? "");
  const { setStatusMessage, setErrorMessage } = useStoreCallbacks();

  return useMutation({
    mutationFn: ({ word, lang }: { word: string; lang: string }) =>
      Promise.all([
        api.enrichWord(word, lang),
        api.checkDuplicate(word, userId),
      ]).then(([enriched, duplicate]) => ({ enriched, duplicate })),
    onSuccess: ({ duplicate }) => {
      setStatusMessage(
        duplicate.exists ? "המילה כבר קיימת אצל המשתמש." : "המידע המועשר נטען בהצלחה.",
      );
    },
    onError: (err: Error) => setErrorMessage(err.message),
  });
}

export function useTranslateWord() {
  const api = useApi();
  const { setErrorMessage } = useStoreCallbacks();

  return useMutation({
    mutationFn: ({ word, sourceLang, targetLang }: { word: string; sourceLang: string; targetLang: string }) =>
      api.translateWord(word, sourceLang, targetLang),
    onError: (err: Error) => setErrorMessage(err.message),
  });
}

export function useCaptureWord() {
  const api = useApi();
  const queryClient = useQueryClient();
  const userId = useAppStore((s) => s.session?.user_id ?? "");
  const { setStatusMessage, setErrorMessage } = useStoreCallbacks();

  return useMutation({
    mutationFn: (body: { word: string; context?: string }) =>
      api.ingestWord({ ...body, user_id: userId, source: "extension" }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["library", userId] });
      setStatusMessage(
        result.status === "duplicate"
          ? "המילה כבר הייתה קיימת בספרייה."
          : "אירוע הלכידה נשמר ונכנס למסלול האישי.",
      );
    },
    onError: (err: Error) => setErrorMessage(err.message),
  });
}

export function useAdminAction() {
  const api = useApi();
  const queryClient = useQueryClient();
  const { setStatusMessage, setErrorMessage } = useStoreCallbacks();

  return useMutation({
    mutationFn: ({
      targetUserId,
      body,
    }: {
      targetUserId: string;
      body: {
        admin_id: string;
        action_type: string;
        target_user_id: string;
        new_role?: string;
      };
    }) => api.adminAction(targetUserId, body),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: qk.adminOverview() });
      setStatusMessage(result.message || "הפעולה בוצעה בהצלחה.");
    },
    onError: (err: Error) => setErrorMessage(err.message),
  });
}

export function useAdminDeleteUser() {
  const api = useApi();
  const queryClient = useQueryClient();
  const { setStatusMessage, setErrorMessage } = useStoreCallbacks();

  return useMutation({
    mutationFn: (targetUserId: string) => api.deleteUser(targetUserId),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: qk.adminOverview() });
      setStatusMessage(result.message || "המשתמש נמחק.");
    },
    onError: (err: Error) => setErrorMessage(err.message),
  });
}

export function useDedupSystemWords() {
  const api = useApi();
  const queryClient = useQueryClient();
  const { setStatusMessage, setErrorMessage } = useStoreCallbacks();

  return useMutation({
    mutationFn: () => api.dedupSystemWords(),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["systemWords"] });
      setStatusMessage(
        `בדיקת כפילויות הסתיימה: נמחקו ${result.removed} מילים מתוך המאגר המשותף.`,
      );
    },
    onError: (err: Error) => setErrorMessage(err.message),
  });
}

// Re-export AdminUser to avoid unused-import warning in hook consumers
export type { AdminUser };
