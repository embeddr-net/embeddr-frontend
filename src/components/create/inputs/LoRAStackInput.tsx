import React, { useEffect, useMemo, useState } from "react";
import { Plus, Settings2, X } from "lucide-react";
import { Button, Label, Slider } from "@embeddr/react-ui/ui";
import { cn } from "@/lib/utils";
import { LoRASelectorDialog } from "@/components/dialogs/LoRASelectorDialog";

interface LoRAStackInputProps {
  nodeId: string;
  inputs: Record<string, any>;
  loras: Array<string>;
  setWorkflowInput: (nodeId: string, field: string, value: any) => void;
  getLabel: (nodeId: string, field: string, fallback: string) => string;
}

export function LoRAStackInput({ nodeId, inputs, loras, setWorkflowInput }: LoRAStackInputProps) {
  const [activeIndices, setActiveIndices] = useState<Array<number>>([]);
  const [initialized, setInitialized] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Initialize active indices from inputs on first load
  useEffect(() => {
    if (!initialized) {
      const indices = new Set<number>();
      let hasRelevantInputs = false;

      Object.keys(inputs).forEach((key) => {
        if (key.startsWith("lora_")) {
          hasRelevantInputs = true;
          const idx = parseInt(key.split("_")[1]);
          if (!isNaN(idx) && inputs[key] !== "None") {
            indices.add(idx);
          }
        }
      });

      if (hasRelevantInputs) {
        setActiveIndices(Array.from(indices).sort((a, b) => a - b));
        setInitialized(true);
      } else {
        setInitialized(true);
      }
    }
  }, [inputs, initialized]);

  const handleAddLoRA = (loraName: string) => {
    // Find first available index or append
    let nextIndex = 1;
    while (activeIndices.includes(nextIndex)) {
      nextIndex++;
    }

    setActiveIndices((prev) => [...prev, nextIndex].sort((a, b) => a - b));
    setWorkflowInput(nodeId, `lora_${nextIndex}`, loraName);
    setWorkflowInput(nodeId, `strength_${nextIndex}`, 1.0);
  };

  const handleRemove = (index: number) => {
    setActiveIndices((prev) => prev.filter((i) => i !== index));
    setWorkflowInput(nodeId, `lora_${index}`, "None");
    setWorkflowInput(nodeId, `strength_${index}`, 1.0);
  };

  const handleChange = (index: number, field: "lora" | "strength", value: any) => {
    setWorkflowInput(nodeId, `${field}_${index}`, value);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">LoRA Stack</Label>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDialogOpen(true)}
          className="h-7 px-2 gap-1"
        >
          <Plus className="h-3.5 w-3.5" />
          Add LoRA
        </Button>
      </div>

      {activeIndices.length === 0 && (
        <div
          className="border border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-muted-foreground gap-2 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => setDialogOpen(true)}
        >
          <Settings2 className="h-8 w-8 opacity-20" />
          <span className="text-xs">No LoRAs added</span>
        </div>
      )}

      <div className="space-y-3">
        {activeIndices.map((i) => {
          const loraValue = inputs[`lora_${i}`] || "None";
          const strengthValue = inputs[`strength_${i}`] ?? 1.0;

          // Extract filename for display
          const displayName = loraValue.split(/[/\\]/).pop();

          return (
            <div
              key={i}
              className="p-3 border rounded-md bg-muted/20 space-y-3 relative group animate-in fade-in slide-in-from-top-1 duration-200"
            >
              <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemove(i)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>

              <div className="space-y-1.5 pr-6">
                <Label className="text-xs text-muted-foreground">LoRA</Label>
                <div
                  className="text-sm font-medium truncate cursor-pointer hover:underline"
                  title={loraValue}
                  onClick={() => setDialogOpen(true)} // Maybe allow changing? For now just add new
                >
                  {displayName}
                </div>
                {loraValue !== displayName && (
                  <div className="text-[10px] text-muted-foreground truncate">{loraValue}</div>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <Label className="text-xs text-muted-foreground">Strength</Label>
                  <span className="text-xs text-muted-foreground font-mono">
                    {strengthValue.toFixed(2)}
                  </span>
                </div>
                <Slider
                  value={[strengthValue]}
                  min={-2}
                  max={2}
                  step={0.05}
                  onValueChange={([val]) => handleChange(i, "strength", val)}
                  className="py-1"
                />
              </div>
            </div>
          );
        })}
      </div>

      <LoRASelectorDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSelect={handleAddLoRA}
        loras={loras}
      />
    </div>
  );
}
