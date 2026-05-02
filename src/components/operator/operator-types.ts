export type SecurityOperatorProfile = {
  id?: string;
  name: string;
  display_name?: string | null;
  avatar_url?: string | null;
  is_root?: boolean;
  is_active?: boolean;
  user_count?: number;
  active_user_count?: number;
  api_key_count?: number;
  last_activity_at?: string | null;
  created_at?: string | null;
};

export type SecurityOperator = SecurityOperatorProfile;

export type SecurityUser = {
  id: string;
  username: string;
  display_name?: string | null;
  roles: Array<string>;
  role_ids?: Array<string>;
  is_admin?: boolean;
};

export type SecurityRole = {
  id: string;
  name: string;
  description?: string | null;
  permissions: Array<string>;
  is_system?: boolean;
};

export type SecurityKey = {
  id: string;
  name: string;
  key_prefix: string;
  is_active: boolean;
  scopes: Array<string>;
  permissions: Array<string>;
};

export type LotusCapability = {
  id: string;
};
