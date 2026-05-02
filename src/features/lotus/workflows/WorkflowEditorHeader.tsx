import React from "react";
import { Button, CardHeader, CardTitle } from "@embeddr/react-ui/ui";
import { Copy, Play, Save, Trash2 } from "lucide-react";
import type { Workflow } from "@/lib/api/endpoints/workflows";

type WorkflowEditorHeaderProps = {
  selectedWorkflow: Workflow | null;
  onDuplicate: () => void;
  onDelete: () => void;
  onSave: () => void;
  onRun: () => void;
};

export function WorkflowEditorHeader({
  selectedWorkflow,
  onDuplicate,
  onDelete,
  onSave,
  onRun,
}: WorkflowEditorHeaderProps) {
  return (
    <CardHeader className="flex flex-row items-center justify-between py-3">
      <CardTitle className="text-sm">
        {selectedWorkflow ? selectedWorkflow.metadata_json.name : "Editor"}
      </CardTitle>
      {selectedWorkflow && (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={onDuplicate}>
            <Copy className="mr-1 h-4 w-4" /> Duplicate
          </Button>
          <Button size="sm" variant="outline" onClick={onDelete}>
            <Trash2 className="mr-1 h-4 w-4" /> Delete
          </Button>
          <Button size="sm" variant="outline" onClick={onSave}>
            <Save className="mr-1 h-4 w-4" /> Save
          </Button>
          <Button size="sm" onClick={onRun}>
            <Play className="mr-1 h-4 w-4" /> Run
          </Button>
        </div>
      )}
    </CardHeader>
  );
}
