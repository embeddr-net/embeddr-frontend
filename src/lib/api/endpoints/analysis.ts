import { BACKEND_URL } from "../config";
import { fetchWithAuth } from "../fetch";

export interface AnalysisConfig {
  scope: "global" | "collection";
  scope_id?: string | null;
  plugin_name: string;
  enabled: boolean;
  priority?: number;
}

export interface AnalysisCapability {
  name: string;
  label: string;
  supported_types: Array<string>;
  trigger_event: string;
  priority: number;
}

export interface PluginCapabilities {
  plugin_name: string;
  capabilities: Array<AnalysisCapability>;
}

export const fetchAnalysisCapabilities = async (): Promise<Array<PluginCapabilities>> => {
  const res = await fetchWithAuth(`${BACKEND_URL}/config/analysis/capabilities`);
  if (!res.ok) throw new Error("Failed to fetch capabilities");
  return res.json();
};

export const fetchAnalysisConfigs = async (
  scope?: string,
  scope_id?: string,
): Promise<Array<AnalysisConfig>> => {
  const url = new URL(`${BACKEND_URL}/config/analysis`);
  if (scope) url.searchParams.append("scope", scope);
  if (scope_id) url.searchParams.append("scope_id", scope_id);

  const res = await fetchWithAuth(url.toString());
  if (!res.ok) throw new Error("Failed to fetch analysis configs");
  return res.json();
};

export const setAnalysisConfig = async (config: AnalysisConfig): Promise<AnalysisConfig> => {
  const res = await fetchWithAuth(`${BACKEND_URL}/config/analysis`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error("Failed to update analysis config");
  return res.json();
};
