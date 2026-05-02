// src/features/lotus/types.ts
export type LotusItemKind = "panel" | "action" | "nav" | "artifact" | "message" | string;

export type FinderMode = "search" | "lotus";

export interface LotusResultItem {
  id: string;
  kind: LotusItemKind;
  title: string;
  description?: string;
  subtitle?: string;
  score?: number;
  source?: "local" | "server";
  data?: Record<string, any>;
}

export interface LotusMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  suggestions?: Array<{ label: string; action?: string; capId?: string }>;
}

export const FINDER_KIND_OPTIONS = [
  { value: "panel", label: "Panels", icon: "Cpu" },
  { value: "action", label: "Actions", icon: "Zap" },
  { value: "nav", label: "Navigation", icon: "Compass" },
  { value: "artifact", label: "Artifacts", icon: "Image" },
  { value: "resource", label: "Resources", icon: "Globe" },
  { value: "feature", label: "Features", icon: "Sparkles" },
] as const;

export type FinderKind = (typeof FINDER_KIND_OPTIONS)[number]["value"];
