import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Execution, ExecutionArtifactLink, ExecutionEvent } from "@/lib/api/types";
import { embeddrApi } from "@/lib/api/client";

export interface ExecutionFilters {
  limit?: number;
  offset?: number;
  status?: string;
  plugin_name?: string;
  type?: string;
  created_after?: string;
  created_before?: string;
  q?: string;
}

export const useExecutions = (filters: ExecutionFilters) => {
  return useQuery<Array<Execution>>({
    queryKey: ["executions", filters],
    queryFn: async () => {
      const res = await embeddrApi.executions.list(filters);
      if (Array.isArray(res)) return res;
      return res.items || [];
    },
    staleTime: 5_000,
  });
};

export const useExecutionEvents = (
  executionId: string | null,
  params?: { limit?: number; offset?: number },
) => {
  return useQuery<Array<ExecutionEvent>>({
    queryKey: ["execution-events", executionId, params],
    queryFn: async () => {
      if (!executionId) return [];
      const res = await embeddrApi.executions.events(executionId, params);
      if (Array.isArray(res)) return res;
      return res.items || [];
    },
    enabled: !!executionId,
  });
};

export const useExecutionArtifacts = (executionId: string | null, action?: string) => {
  return useQuery<Array<ExecutionArtifactLink>>({
    queryKey: ["execution-artifacts", executionId, action],
    queryFn: async () => {
      if (!executionId) return [];
      return embeddrApi.executions.artifacts(executionId, action);
    },
    enabled: !!executionId,
  });
};

export const useExecutionChildren = (executionId: string | null) => {
  return useQuery<Array<Execution>>({
    queryKey: ["execution-children", executionId],
    queryFn: async () => {
      if (!executionId) return [];
      return embeddrApi.executions.children(executionId);
    },
    enabled: !!executionId,
  });
};

export const useCreateExecution = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      plugin_name: string;
      job_type: string;
      inputs: Record<string, any>;
      primary_artifact_id?: string;
    }) => embeddrApi.executions.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["executions"] });
    },
  });
};

export const useCancelExecution = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (executionId: string) => embeddrApi.executions.cancel(executionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["executions"] });
    },
  });
};
