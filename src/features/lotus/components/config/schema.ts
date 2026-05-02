export type JsonSchema = {
  type?: string;
  properties?: Record<string, any>;
  required?: Array<string>;
  anyOf?: Array<{ type?: string }>;
  items?: any;
};

export type ConfigUI = {
  order?: Array<string>;
  widgets?: Record<string, string>;
  options?: Record<string, Array<{ label: string; value: string }> | Array<string>>;
  arrayEditors?: Record<
    string,
    {
      defaultKeyField?: string;
      keyFields?: Array<string>;
      label?: string;
      primary?: {
        label?: string;
        fields: Record<string, string>;
      };
    }
  >;
};

export type LotusCapabilityLike = {
  id: string;
  kind: string;
  title?: string;
  description?: string;
  plugin?: string;
  data?: Record<string, any>;
};

export function extractConfigDefaults(cap: LotusCapabilityLike) {
  const data = cap?.data ?? {};
  const input = (data?.input ?? {}) as Record<string, any>;
  const defaults = input?.defaults;
  return defaults && typeof defaults === "object" ? defaults : null;
}

export function extractConfigSchema(cap: LotusCapabilityLike): JsonSchema {
  const data = cap?.data ?? {};
  const input = (data?.input ?? {}) as Record<string, any>;
  return (input?.schema ?? data?.schema ?? {}) as JsonSchema;
}

export function extractConfigUI(cap: LotusCapabilityLike): ConfigUI {
  const data = cap?.data ?? {};
  const input = (data?.input ?? {}) as Record<string, any>;
  const ui = (input?.ui ?? data?.ui ?? {}) as ConfigUI;
  return {
    order: Array.isArray(ui.order) ? ui.order : undefined,
    widgets: ui.widgets || {},
    options: ui.options || {},
    arrayEditors: ui.arrayEditors || (ui as any).array_editors || {},
  };
}

export function normalizeSchemaType(schemaProp: any): string {
  if (!schemaProp) return "string";
  if (Array.isArray(schemaProp.anyOf)) {
    const nonNull = schemaProp.anyOf.find((entry: any) => entry?.type && entry.type !== "null");
    if (nonNull?.type) return nonNull.type;
  }
  if (!schemaProp.type && schemaProp.properties) return "object";
  return schemaProp.type || "string";
}

export function buildDefaultForSchema(schemaProp: any): any {
  if (!schemaProp) return null;
  if (schemaProp.default !== undefined) return schemaProp.default;
  const type = normalizeSchemaType(schemaProp);
  if (type === "object") {
    const props = schemaProp.properties || {};
    const out: Record<string, any> = {};
    Object.keys(props).forEach((key) => {
      out[key] = buildDefaultForSchema(props[key]);
    });
    return out;
  }
  if (type === "array") return [];
  if (type === "number" || type === "integer") return 0;
  if (type === "boolean") return false;
  return "";
}
