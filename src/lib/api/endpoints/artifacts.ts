import type { Artifact } from "@/lib/api/types";
import { BACKEND_URL } from "@/lib/api/config";

export const searchArtifacts = async (query: string): Promise<{ items: Array<Artifact> }> => {
  const url = `${BACKEND_URL}/artifacts/search?q=${encodeURIComponent(query)}&limit=10`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Search failed");
  return res.json();
};

export const createArtifact = async (data: {
  type_name: string;
  metadata_json: any;
}): Promise<Artifact> => {
  const res = await fetch(`${BACKEND_URL}/artifacts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Create artifact failed");
  return res.json();
};

export const updateArtifact = async (id: string, data: Partial<Artifact>): Promise<Artifact> => {
  const res = await fetch(`${BACKEND_URL}/artifacts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Update artifact failed");
  return res.json();
};
