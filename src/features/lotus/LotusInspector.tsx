import React, { useEffect, useState } from "react";
import { Button, Label, ScrollArea, Separator, Textarea } from "@embeddr/react-ui/ui";
import { Check, Copy, Play } from "lucide-react";
import { toast } from "sonner";
import type { LotusResultItem } from "./types";
import { cn } from "@/lib/utils";

interface LotusInspectorProps {
  item: LotusResultItem | null;
  onDispatch: (item: LotusResultItem, inputs?: Record<string, any>) => Promise<any>;
  running?: boolean;
}

export function LotusInspector({ item, onDispatch, running }: LotusInspectorProps) {
  const [inputs, setInputs] = useState("{}");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (item && item.kind === "action") {
      const defaultInputs = item.data?.inputs || {};
      setInputs(JSON.stringify(defaultInputs, null, 2));
    } else {
      setInputs("{}");
    }
  }, [item?.id]);

  if (!item) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-muted/5 text-muted-foreground p-4 text-center">
        <p>Select a capability to view details</p>
      </div>
    );
  }

  const handleRun = async () => {
    try {
      const parsed = JSON.parse(inputs);
      await onDispatch(item, parsed);
    } catch (e: any) {
      toast.error("Failed to run: " + e.message);
    }
  };

  const copyId = () => {
    navigator.clipboard.writeText(item.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 overflow-hidden min-w-0">
            <h2 className="text-xl font-bold truncate" title={item.title}>
              {item.title}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <button
                onClick={copyId}
                className={cn(
                  "flex items-center gap-1.5 rounded-none px-2 py-0.5 font-mono font-medium border transition-colors hover:bg-muted/80",
                  copied
                    ? "bg-green-100 dark:bg-green-900 border-green-200"
                    : "bg-muted/50 border-input",
                )}
                title="Copy ID"
              >
                {item.id}
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </button>
              <Separator orientation="vertical" className="h-3" />
              <span className="capitalize">{item.kind}</span>
            </div>
          </div>
          {item.kind === "action" && (
            <Button onClick={handleRun} disabled={running} className="shrink-0" size="sm">
              <Play className="mr-2 h-3.5 w-3.5" />
              {running ? "Running..." : "Run"}
            </Button>
          )}
        </div>
        {item.description && (
          <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
            {item.description}
          </p>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {item.kind === "action" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Inputs (JSON)
                </Label>
                {item.data?.input?.model && (
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Schema: {item.data.input.model.split(":").pop()}
                  </span>
                )}
              </div>
              <Textarea
                value={inputs}
                onChange={(e) => setInputs(e.target.value)}
                className="font-mono text-xs min-h-[120px]"
                placeholder="{}"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Metadata
            </Label>
            <div className="rounded-none border bg-muted/30 p-3">
              <pre className="text-[10px] font-mono whitespace-pre-wrap overflow-auto max-w-full">
                {JSON.stringify(item.data || {}, null, 2)}
              </pre>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Raw Result
            </Label>
            <div className="rounded-none border bg-muted/30 p-3">
              <pre className="text-[10px] font-mono whitespace-pre-wrap overflow-auto max-w-full">
                {JSON.stringify({ ...item, data: undefined }, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
