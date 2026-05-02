import { BACKEND_URL } from "../config";
import { fetchWithAuth } from "../fetch";

export async function invokeLotus(capId: string, input: Record<string, any> = {}): Promise<any> {
  const response = await fetchWithAuth(`${BACKEND_URL}/lotus/${capId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Lotus invoke failed");
  }

  return response.json();
}

export async function listLotusCapabilities(params?: {
  kind?: string;
  plugin?: string;
  slot?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: Array<{ id: string; title: string }>; total: number }> {
  const search = new URLSearchParams();
  if (params?.kind) search.set("kind", params.kind);
  if (params?.plugin) search.set("plugin", params.plugin);
  if (params?.slot) search.set("slot", params.slot);
  search.set("limit", String(params?.limit ?? 500));
  search.set("offset", String(params?.offset ?? 0));

  const response = await fetchWithAuth(`${BACKEND_URL}/lotus/list?${search.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to load Lotus capabilities");
  }
  return response.json();
}

export async function listLotusClients(): Promise<{
  ok: boolean;
  clients?: Array<string>;
  count?: number;
  details?: Array<{
    client_id: string;
    address?: string | null;
    user_agent?: string | null;
    origin?: string | null;
    forwarded_for?: string | null;
    path?: string | null;
  }>;
  error?: string;
}> {
  return invokeLotus("embeddr-core.clients.list", {});
}
