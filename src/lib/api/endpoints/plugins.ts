import { BACKEND_URL, BASE_URL } from "../config";
import { fetchWithAuth } from "../fetch";
import type { PluginManifest } from "@embeddr/zen-shell";

export interface PluginAction {
  name: string;
  label: string;
  description: string;
  inputs: Array<string>;
}

export interface Plugin {
  name: string;
  version: string;
  actions: Array<PluginAction>;
  // ... other fields
}

export const fetchPlugins = async (): Promise<Array<PluginManifest>> => {
  return fetchPluginManifests();
};

export interface PluginDock {
  name: string;
  label?: string;
  component?: string;
  props?: Record<string, unknown>;
  icon?: string;
  options?: Record<string, unknown>;
  plugin_id?: string;
  plugin_name?: string;
}

export interface PluginDockListResponse {
  items: Array<PluginDock>;
}

export const fetchPluginManifests = async (): Promise<Array<PluginManifest>> => {
  const res = await fetchWithAuth(`${BACKEND_URL}/plugins`);
  if (!res.ok) throw new Error("Failed to fetch plugins");
  return res.json();
};

export const fetchPluginDocks = async (): Promise<PluginDockListResponse> => {
  const res = await fetchWithAuth(`${BACKEND_URL}/plugins/docks`);
  if (!res.ok) throw new Error("Failed to fetch plugin docks");
  return res.json();
};

export const fetchPluginLogos = async (): Promise<Record<string, string | null>> => {
  const res = await fetchWithAuth(`${BACKEND_URL}/plugins/logos`);
  if (!res.ok) throw new Error("Failed to fetch plugin logos");
  const data = await res.json();
  const logos = (data?.logos || {}) as Record<string, string | null>;
  const normalize = (value: string | null) => {
    if (!value) return null;
    if (value.startsWith("http://") || value.startsWith("https://")) {
      return value;
    }
    if (value.startsWith("//")) return `${window.location.protocol}${value}`;
    if (value.startsWith("/")) return `${BASE_URL}${value}`;
    return `${BASE_URL}/${value}`;
  };
  return Object.fromEntries(Object.entries(logos).map(([key, value]) => [key, normalize(value)]));
};
