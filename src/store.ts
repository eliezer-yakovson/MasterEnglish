import { useMemo } from "react";
import { create } from "zustand";
import type { Config, Session } from "./types";
import { createApiClient, defaultConfig } from "./api";

const SESSION_STORAGE_KEY = "master-english-ui-session";
const CONFIG_STORAGE_KEY = "master-english-ui-config";

let _statusTimer: number | undefined;
let _errorTimer: number | undefined;

function loadJsonStorage<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

interface AppState {
  config: Config;
  session: Session | null;
  statusMessage: string;
  errorMessage: string;

  setConfig: (config: Config) => void;
  setSession: (session: Session | null) => void;
  setStatusMessage: (msg: string) => void;
  setErrorMessage: (msg: string) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  config: loadJsonStorage(CONFIG_STORAGE_KEY, defaultConfig),
  session: loadJsonStorage<Session | null>(SESSION_STORAGE_KEY, null),
  statusMessage: "",
  errorMessage: "",

  setConfig: (config) => {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    set({ config });
  },

  setSession: (session) => {
    if (session) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
    set({ session });
  },

  setStatusMessage: (msg) => {
    set({ statusMessage: msg });
    if (msg) {
      clearTimeout(_statusTimer);
      _statusTimer = window.setTimeout(() => set({ statusMessage: "" }), 4000);
    }
  },
  setErrorMessage: (msg) => {
    set({ errorMessage: msg });
    if (msg) {
      clearTimeout(_errorTimer);
      _errorTimer = window.setTimeout(() => set({ errorMessage: "" }), 5000);
    }
  },
}));

export function useApi() {
  const config = useAppStore((s) => s.config);
  const accessToken = useAppStore((s) => s.session?.access_token);
  return useMemo(() => createApiClient(config, accessToken), [config, accessToken]);
}
