import { BACKEND_URL } from "../config";
import { fetchWithAuth } from "../fetch";

export interface PetalPluginHealth {
  name: string;
  version?: string;
  status: "loaded" | "healthy" | "degraded" | "failed" | string;
  error?: string | null;
  missing_deps?: Array<string>;
  dep_hints?: Array<string>;
}

export interface PetalInfo {
  id: string;
  name: string;
  tags?: Array<string>;
  plugins: Array<string>;
  capabilities: Array<string>;
  plugin_health?: Array<PetalPluginHealth>;
  active_jobs: number;
  draining?: boolean;
  stale: boolean;
  http_url?: string;
  connected_at?: string;
  last_heartbeat?: string;
  max_concurrent_jobs?: number;
  system_info?: Record<string, any>;
  services?: Array<Record<string, any>>;
}

export async function fetchPetals(): Promise<Array<PetalInfo>> {
  const res = await fetchWithAuth(`${BACKEND_URL}/v1/petals`);
  if (!res.ok) {
    throw new Error("Failed to fetch petals");
  }
  return res.json();
}

export async function fetchPetal(petalID: string): Promise<PetalInfo> {
  const res = await fetchWithAuth(`${BACKEND_URL}/v1/petals/${encodeURIComponent(petalID)}`);
  if (!res.ok) {
    throw new Error("Failed to fetch petal");
  }
  return res.json();
}

export interface InstallPluginDepsResult {
  ok: boolean;
  plugin: string;
  install: {
    ok: boolean;
    stdout: string;
    stderr: string;
    command: string;
    returncode: number;
  };
  health?: PetalPluginHealth | null;
}

export async function installPetalPluginDeps(
  petalID: string,
  pluginName: string,
  opts?: { upgrade?: boolean },
): Promise<InstallPluginDepsResult> {
  const res = await fetchWithAuth(
    `${BACKEND_URL}/v1/petals/${encodeURIComponent(petalID)}/plugins/${encodeURIComponent(pluginName)}/install-deps`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ upgrade: opts?.upgrade ?? false }),
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data && (data.error || data.stderr)) || `Install failed (HTTP ${res.status})`;
    throw new Error(msg);
  }
  return data as InstallPluginDepsResult;
}
