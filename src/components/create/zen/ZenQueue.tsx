import React from "react";
import { Badge, ScrollArea } from "@embeddr/react-ui/ui";
import { Loader2 } from "lucide-react";
import { DraggablePanel } from "@/components/ui/DraggablePanel";
import { useExecutions } from "@/hooks/useExecutions";
import { useWindowStore } from "@/store/windowStore";

interface ZenQueueProps {
  isOpen?: boolean;
  onClose?: () => void;
  generations?: Array<any>;
  selectedGenerationId?: string | null;
  selectGeneration?: (gen: any) => void;
  onRepeat?: (gen: any) => void;
}

export function ZenQueue({ isOpen: propIsOpen, onClose: propOnClose }: ZenQueueProps) {
  const closeWindow = useWindowStore((s) => s.closeWindow);
  // Only subscribe to the minimized state of this window
  const isMinimized = useWindowStore((s) => s.windows["zen-queue"]?.isMinimized);

  const isOpen = propIsOpen ?? isMinimized === false;
  const onClose = propOnClose ?? (() => closeWindow("zen-queue"));

  const { data: executions = [], isLoading } = useExecutions({ limit: 50 });

  const orderedExecutions = React.useMemo(() => {
    const rank = (status?: string) => {
      switch (status) {
        case "running":
          return 0;
        case "pending":
          return 1;
        case "completed":
          return 2;
        case "failed":
          return 3;
        case "canceled":
          return 4;
        default:
          return 5;
      }
    };

    return [...executions].sort((a, b) => {
      const diff = rank(a.status) - rank(b.status);
      if (diff !== 0) return diff;
      return (b.created_at || "").localeCompare(a.created_at || "");
    });
  }, [executions]);

  const activeCount = React.useMemo(
    () => orderedExecutions.filter((ex) => ["running", "pending"].includes(ex.status)).length,
    [orderedExecutions],
  );

  return (
    <DraggablePanel
      id="zen-queue"
      title="Jobs"
      isOpen={isOpen}
      onClose={onClose}
      defaultPosition={{ x: window.innerWidth - 340, y: 100 }}
      defaultSize={{ width: 220, height: 400 }}
      className="absolute"
    >
      <div className="flex flex-col h-full p-2.5">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-2">
          <span>Active: {activeCount}</span>
          <span>Total: {orderedExecutions.length}</span>
        </div>
        <ScrollArea className="h-full pr-3" type="always">
          <div className="space-y-1">
            {isLoading && (
              <div className="flex justify-center p-2">
                <Loader2 className="animate-spin w-4 h-4 text-muted-foreground" />
              </div>
            )}

            {!isLoading && orderedExecutions.length === 0 && (
              <div className="text-xs text-muted-foreground p-2">No jobs yet.</div>
            )}

            {orderedExecutions.map((ex) => (
              <div key={ex.id} className="p-2 border bg-card mb-2 flex flex-col gap-1 text-xs">
                <div className="flex justify-between items-start">
                  <span className="font-semibold truncate">{ex.type || ex.plugin_name}</span>
                  <Badge
                    variant={
                      (ex.status === "completed"
                        ? "default"
                        : ex.status === "running"
                          ? "secondary"
                          : ex.status === "failed"
                            ? "destructive"
                            : "outline") as any
                    }
                    className="text-[10px] h-4 px-1"
                  >
                    {ex.status}
                  </Badge>
                </div>
                <div className="text-muted-foreground text-[10px] truncate">{ex.plugin_name}</div>
                {typeof ex.progress === "number" && ex.progress > 0 && (
                  <div className="text-[10px] text-muted-foreground">{ex.progress}%</div>
                )}
                {ex.parent_execution_id && (
                  <div className="text-[10px] text-muted-foreground truncate">
                    Parent: {ex.parent_execution_id.slice(0, 8)}…
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </DraggablePanel>
  );
}
