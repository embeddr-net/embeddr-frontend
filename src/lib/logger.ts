import { create } from "zustand";
import { persist } from "zustand/middleware";

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 100,
}

type LogLevelString = "DEBUG" | "INFO" | "WARN" | "ERROR" | "NONE";

interface LoggerStore {
  globalLevel: LogLevel;
  namespaceLevels: Record<string, LogLevel>;
  setGlobalLevel: (level: LogLevel) => void;
  setNamespaceLevel: (namespace: string, level: LogLevel) => void;
  clearNamespaceLevel: (namespace: string) => void;
}

export const useLoggerStore = create<LoggerStore>()(
  persist(
    (set) => ({
      globalLevel: LogLevel.INFO,
      namespaceLevels: {},
      setGlobalLevel: (level) => set({ globalLevel: level }),
      setNamespaceLevel: (namespace, level) =>
        set((state) => ({
          namespaceLevels: { ...state.namespaceLevels, [namespace]: level },
        })),
      clearNamespaceLevel: (namespace) =>
        set((state) => {
          const newLevels = { ...state.namespaceLevels };
          delete newLevels[namespace];
          return { namespaceLevels: newLevels };
        }),
    }),
    {
      name: "embeddr-logger-config",
    },
  ),
);

class Logger {
  private namespace: string;

  constructor(namespace: string) {
    this.namespace = namespace;
  }

  private shouldLog(level: LogLevel): boolean {
    const store = useLoggerStore.getState();
    const namespaceLevel = store.namespaceLevels[this.namespace];
    const effectiveLevel = namespaceLevel !== undefined ? namespaceLevel : store.globalLevel;
    return level >= effectiveLevel;
  }

  private formatMessage(level: string, message: string, data?: any) {
    const timestamp = new Date().toISOString().split("T")[1].slice(0, -1);
    const prefix = `[${timestamp}] [${level}] [${this.namespace}]`;
    if (data) {
      return [prefix, message, data];
    }
    return [prefix, message];
  }

  debug(message: string, data?: any) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(...this.formatMessage("DEBUG", message, data));
    }
  }

  info(message: string, data?: any) {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(...this.formatMessage("INFO", message, data));
    }
  }

  warn(message: string, data?: any) {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(...this.formatMessage("WARN", message, data));
    }
  }

  error(message: string, data?: any) {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(...this.formatMessage("ERROR", message, data));
    }
  }
}

export const createLogger = (namespace: string) => new Logger(namespace);

// Helper for console usage
(window as any).EmbeddrLogger = {
  setLevel: (level: LogLevelString) => useLoggerStore.getState().setGlobalLevel(LogLevel[level]),
  setNamespaceLevel: (namespace: string, level: LogLevelString) =>
    useLoggerStore.getState().setNamespaceLevel(namespace, LogLevel[level]),
  getStore: () => useLoggerStore.getState(),
};
