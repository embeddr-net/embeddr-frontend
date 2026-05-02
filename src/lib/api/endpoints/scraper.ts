export interface SpiderArgument {
  name: string;
  label?: string;
  description?: string;
  type?: "string" | "boolean" | "int" | "select";
  default?: any;
  options?: Array<{ label: string; value: any }>;
}

export interface SpiderMetadata {
  description?: string;
  arguments?: Array<SpiderArgument>;
}

export interface SpiderDefinition {
  name: string;
  default_args?: Record<string, string>;
  metadata?: SpiderMetadata;
}

export interface CrawlRequest {
  args: Record<string, string>;
  inputs?: Record<string, string>;
}

export interface CrawlResponse {
  message: string;
  pid: number;
  spider: string;
  log_file: string;
}

export const scraperApi = {
  getSpiders: async (): Promise<Array<SpiderDefinition>> => {
    throw new Error("Scraper frontend support has been removed.");
  },
  runSpider: async (): Promise<CrawlResponse> => {
    throw new Error("Scraper frontend support has been removed.");
  },
  getLog: async (): Promise<string> => {
    throw new Error("Scraper frontend support has been removed.");
  },
};
