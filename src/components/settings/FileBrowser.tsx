import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronRight,
  CornerLeftUp,
  File as FileIcon,
  Folder,
  HardDrive,
  Loader2,
} from "lucide-react";
import { Button, Input, ScrollArea } from "@embeddr/react-ui/ui";
import { cn } from "@/lib/utils";
import { embeddrApi } from "@/lib/api/client";

interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  is_file: boolean;
  size: number;
  extension?: string;
  mtime: number;
}

interface FileBrowserProps {
  initialPath?: string;
  onSelect: (path: string) => void;
  className?: string;
}

export function FileBrowser({ initialPath, onSelect, className }: FileBrowserProps) {
  const [currentPath, setCurrentPath] = useState(initialPath || "");
  const [history, setHistory] = useState<Array<string>>([]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["fs", "list", currentPath],
    queryFn: async () => {
      // Try embeddr-fs-scanner first (SDK/Plugin), then fallback to embeddr-core if available
      const caps = ["embeddr-fs-scanner.fs.list", "embeddr-core.fs.list"];

      let lastError: unknown;
      type FsListResponse = {
        ok: boolean;
        error?: unknown;
        path?: string;
        parent?: string;
        items?: Array<FileEntry>;
      };
      for (const cap of caps) {
        try {
          const res: FsListResponse = await embeddrApi.lotus.invoke(cap, {
            path: currentPath || undefined,
          });
          if (res.ok) {
            return res as { path: string; parent: string; items: Array<FileEntry> };
          }
          lastError = res.error;
        } catch (err) {
          lastError = err;
          // Continue to next capability
        }
      }

      throw new Error(String(lastError || "Failed to list directory (capability not found)"));
    },
    retry: false,
  });

  // Update internal path when server returns resolved path (e.g. after default expansion)
  useEffect(() => {
    if (data?.path && data.path !== currentPath) {
      setCurrentPath(data.path);
    }
  }, [data?.path]);

  const handleNavigate = (path: string) => {
    setHistory([...history, currentPath]);
    setCurrentPath(path);
  };

  const handleUp = () => {
    if (data?.parent) {
      handleNavigate(data.parent);
    }
  };

  const handlePathSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    refetch();
  };

  return (
    <div className={cn("flex flex-col h-100 border rounded-md overflow-hidden", className)}>
      {/* Path Bar */}
      <div className="flex items-center gap-2 p-2 border-b bg-muted/40">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleUp}
          disabled={!data?.parent}
          title="Go Up"
        >
          <CornerLeftUp className="w-4 h-4" />
        </Button>
        <form onSubmit={handlePathSubmit} className="flex-1">
          <Input
            value={currentPath}
            onChange={(e) => setCurrentPath(e.target.value)}
            className="h-8 font-mono text-sm"
            placeholder="/path/to/directory"
          />
        </form>
        <Button size="sm" onClick={() => onSelect(currentPath)} disabled={isLoading}>
          Select Current
        </Button>
      </div>

      {/* File List */}
      <ScrollArea className="flex-1 bg-background">
        <div className="p-1">
          {isLoading ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading...
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-40 text-destructive gap-2 p-4 text-center">
              <span className="font-semibold">Error listing directory</span>
              <span className="text-sm opacity-80">{error.message}</span>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {data?.items.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Empty directory
                </div>
              )}
              {data?.items.map((item) => (
                <button
                  key={item.name}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground text-sm text-left truncate w-full",
                    item.name.startsWith(".") && "opacity-60",
                  )}
                  onClick={() => item.is_dir && handleNavigate(item.path)}
                >
                  {item.is_dir ? (
                    <Folder className="w-4 h-4 text-blue-500 fill-blue-500/20 shrink-0" />
                  ) : (
                    <FileIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  <span className="truncate flex-1 font-mono text-xs md:text-sm">{item.name}</span>
                  {!item.is_dir && (
                    <span className="text-xs text-muted-foreground shrink-0">
                      {(item.size / 1024).toFixed(1)} KB
                    </span>
                  )}
                  {item.is_dir && (
                    <ChevronRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer / Stats */}
      <div className="p-2 border-t bg-muted/20 text-xs text-muted-foreground flex justify-between">
        <div>
          {data?.items.filter((i) => i.is_dir).length ?? 0} folders,{" "}
          {data?.items.filter((i) => !i.is_dir).length ?? 0} files
        </div>
        <div>{currentPath}</div>
      </div>
    </div>
  );
}
