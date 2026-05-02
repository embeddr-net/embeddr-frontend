import React from "react";
import { WorkflowRunnerSidebar } from "./WorkflowRunnerSidebar";
import { WorkflowRunnerDetails } from "./WorkflowRunnerDetails";
import type { WorkflowPort } from "./WorkflowRunnerDetails";
import type { Workflow } from "@/lib/api/endpoints/workflows";

type WorkflowRunnerLayoutProps = {
  workflows?: Array<Workflow>;
  isLoading: boolean;
  selectedId: string | null;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSelect: (id: string) => void;
  selectedWorkflow: Workflow | null;
  workflowInputs: Record<string, WorkflowPort>;
  workflowOutputs: Record<string, WorkflowPort>;
  normalizeType: (type?: string) => string;
  onRun: () => void;
};

export function WorkflowRunnerLayout({
  workflows,
  isLoading,
  selectedId,
  searchValue,
  onSearchChange,
  onSelect,
  selectedWorkflow,
  workflowInputs,
  workflowOutputs,
  normalizeType,
  onRun,
}: WorkflowRunnerLayoutProps) {
  return (
    <div className=" w-full grid grid-cols-4 grid-rows-[auto_1fr] md:grid-rows-[1fr] gap-1 h-full overflow-visible">
      <div className="col-span-4 md:col-span-1 shrink-0 overflow-visible h-auto md:h-full border-none ring-0 shadow-none bg-transparent p-0 min-h-0">
        <WorkflowRunnerSidebar
          workflows={workflows}
          isLoading={isLoading}
          selectedId={selectedId}
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          onSelect={onSelect}
        />
      </div>
      <WorkflowRunnerDetails
        selectedWorkflow={selectedWorkflow}
        workflowInputs={workflowInputs}
        workflowOutputs={workflowOutputs}
        normalizeType={normalizeType}
        onRun={onRun}
      />
    </div>
  );
}
