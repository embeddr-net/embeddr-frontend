import {
  Badge,
  Button,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@embeddr/react-ui/ui";
import { Settings2, Trash2, X } from "lucide-react";
import type React from "react";

export type PipelineGraphNodeProps = {
  index: number;
  position: { x: number; y: number };
  size: { width: number; height: number };
  inputs: Array<string>;
  outputs?: Array<string>;
  inputPreview?: Array<{ key: string; value: string }>;
  capTitle: string;
  capId: string;
  isMissingCap: boolean;
  isSelected: boolean;
  accentClass?: string;
  badgeText?: string;
  hideInputsButton?: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  actionCaps: Array<{ id: string; title?: string }>;
  onSelect: (index: number) => void;
  onDragStart: (event: React.PointerEvent<HTMLDivElement>, index: number) => void;
  onMoveStep: (index: number, direction: "up" | "down") => void;
  onRemoveStep: (index: number) => void;
  onEditInputs: (index: number) => void;
  onCapChange: (index: number, capId: string) => void;
  connectedInputs?: Set<string>;
  connectedOutputs?: Set<string>;
  onDisconnect?: (index: number, portKey: string, type: "input" | "output") => void;
};

export function PipelineGraphNode({
  index,
  position,
  size,
  inputs,
  outputs = ["artifact"],
  inputPreview,
  capId,
  isMissingCap,
  isSelected,
  accentClass,
  badgeText,
  hideInputsButton,
  actionCaps,
  onDragStart,
  onRemoveStep,
  onEditInputs,
  onCapChange,
  connectedInputs = new Set(),
  connectedOutputs = new Set(),
  onDisconnect,
}: PipelineGraphNodeProps) {
  const hasCap = Boolean(capId);
  const hasInputs = inputs.length > 0;
  const preview = inputPreview ?? [];

  // Calculate rows for inputs/outputs
  const rowCount = Math.max(inputs.length, outputs.length);
  const rows = Array.from({ length: rowCount }, (_, i) => ({
    input: inputs[i],
    output: outputs[i],
  }));

  const resolvedAccent = accentClass || "border-l-muted/50";

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={`absolute z-10 rounded-md border border-muted/60 border-l-4 ${resolvedAccent} bg-background/90 shadow-sm transition flex flex-col select-none ${
            isSelected ? "ring-2 ring-primary/60" : "hover:ring-1 hover:ring-muted-foreground/40"
          }`}
          style={{
            left: position.x - size.width / 2,
            top: position.y - size.height / 2,
            width: size.width,
            height: size.height,
          }}
          data-node="true"
        >
          {/* Header */}
          <div
            className="cursor-grab select-none border-b border-muted/60 bg-muted/30 px-3 h-10 flex items-center justify-between text-[11px] text-muted-foreground shrink-0 rounded-t-md"
            onPointerDown={(event) => onDragStart(event, index)}
            data-node="true"
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground/80">
                {index === -1 ? "Pipeline Inputs" : `Node ${index + 1}`}
              </span>
              {isMissingCap && capId && (
                <Badge variant="destructive" className="h-4 px-1 text-[10px]">
                  Missing
                </Badge>
              )}
              {badgeText && !isMissingCap && (
                <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                  {badgeText}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              {index !== -1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 hover:text-red-500"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveStep(index);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <span className="text-xs">✕</span>
                </Button>
              )}
            </div>
          </div>

          {/* Controls (Action Selector) */}
          {index !== -1 && (
            <div
              className="flex h-13 shrink-0 items-center gap-2 border-b border-muted/20 bg-background px-3"
              style={{ pointerEvents: "auto" }}
            >
              <Select value={capId} onValueChange={(value) => onCapChange(index, value)}>
                <SelectTrigger
                  className="h-8 flex-1 text-xs"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <SelectValue placeholder="Select capability" />
                </SelectTrigger>
                <SelectContent>
                  {actionCaps.map((cap) => (
                    <SelectItem key={cap.id} value={cap.id} className="text-xs">
                      {cap.title || cap.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!hideInputsButton && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditInputs(index);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  title="Edit Node Inputs"
                >
                  <Settings2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}

          {/* IO Area (Rows) */}
          <div className="relative flex-1 rounded-b-md bg-background/50 pt-3">
            {rows.map((row, i) => (
              <div
                key={i}
                className="flex h-6 items-center px-0 font-mono text-[10px] text-muted-foreground/90 relative group/row"
              >
                {/* Input Label (Left) */}
                {row.input && (
                  <div
                    className="flex-1 w-1/2 overflow-hidden whitespace-nowrap px-3 text-left flex items-center gap-1"
                    title={row.input}
                  >
                    <span className="truncate">{row.input}</span>
                    {connectedInputs.has(row.input) && onDisconnect && (
                      <button
                        className="opacity-0 group-hover/row:opacity-100 hover:text-red-500 transition-opacity shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDisconnect(index, row.input, "input");
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        title="Disconnect Input"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )}

                {/* Output Label (Right) */}
                {row.output && (
                  <div
                    className={`flex-1 w-1/2 overflow-hidden whitespace-nowrap px-3 text-right flex items-center justify-end gap-1 ${!row.input ? "ml-auto" : ""}`}
                    title={row.output}
                  >
                    {connectedOutputs.has(row.output) && onDisconnect && (
                      <button
                        className="opacity-0 group-hover/row:opacity-100 hover:text-red-500 transition-opacity shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDisconnect(index, row.output, "output");
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        title="Disconnect Output"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                    <span className="truncate">{row.output}</span>
                  </div>
                )}
              </div>
            ))}

            {rows.length === 0 && index !== -1 && (
              <div className="flex h-6 items-center px-3 text-[10px] italic text-muted-foreground">
                No inputs
              </div>
            )}
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        {/* <ContextMenuLabel>
          {index === -1 ? 'Pipeline Inputs' : `Step ${index + 1}`}
        </ContextMenuLabel> */}
        <ContextMenuSeparator />
        {index !== -1 && !hideInputsButton && (
          <ContextMenuItem onClick={() => onEditInputs(index)}>
            <Settings2 className="mr-2 h-4 w-4" /> Edit JSON Inputs
          </ContextMenuItem>
        )}
        {index !== -1 && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={() => onRemoveStep(index)}
              className="text-red-500 hover:text-red-600 focus:text-red-500"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete Node
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
