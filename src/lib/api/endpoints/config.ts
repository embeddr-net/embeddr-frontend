import { BACKEND_URL } from "../config";
import { fetchWithAuth } from "../fetch";

export interface PluginConfigResponse<T = Record<string, any>> {
  ok?: boolean;
  plugin: string;
  config_id?: string | null;
  scope?: string;
  scope_id?: string | null;
  value: T;
}

export const fetchPluginConfig = async <T = Record<string, any>>(
  pluginName: string,
  params?: {
    scope?: string;
    scopeId?: string | null;
    configId?: string | null;
  },
): Promise<PluginConfigResponse<T>> => {
  const url = new URL(`${BACKEND_URL}/config/${pluginName}`);
  if (params?.scope) url.searchParams.append("scope", params.scope);
  if (params?.scopeId) url.searchParams.append("scope_id", params.scopeId);
  if (params?.configId) url.searchParams.append("config_id", params.configId);

  const res = await fetchWithAuth(url.toString());
  if (!res.ok) throw new Error("Failed to fetch config");
  return res.json();
};

export const setPluginConfig = async <T = Record<string, any>>(
  pluginName: string,
  payload: {
    value: T;
    scope?: string;
    scopeId?: string | null;
    configId?: string | null;
  },
): Promise<PluginConfigResponse<T>> => {
  const res = await fetchWithAuth(`${BACKEND_URL}/config/${pluginName}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      value: payload.value,
      scope: payload.scope ?? "global",
      scope_id: payload.scopeId ?? null,
      config_id: payload.configId ?? null,
    }),
  });
  if (!res.ok) throw new Error("Failed to save config");
  return res.json();
};
