export interface PluginAction {
  name: string;
  label: string;
  description: string;
  command_args?: string;
  requires_confirmation: boolean;
  danger: boolean;
  tier: "system" | "user";
  inputs: Array<string>;
  outputs: Array<string>;
  idempotent: boolean;
  plugin_name: string;
}

export interface ArtifactExecution {
  id: string;
  created_at: string;
  plugin_name: string;
  action_name: string;
  status: "pending" | "running" | "completed" | "failed";
  inputs: Record<string, any>;
  outputs?: Record<string, any>;
  error?: string;
  started_at?: string;
  finished_at?: string;
  primary_artifact_id?: string;
}

export interface Artifact {
  id: string;
  created_at: string;
  uri?: string;
  type_name: string;
  base_type_name: string;
  metadata_json: Record<string, any>;
  override_capabilities: Array<string>;
}
