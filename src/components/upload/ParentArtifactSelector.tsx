import React, { useEffect, useState } from "react";
import { Check, ChevronsUpDown, Folder, Loader2, Plus } from "lucide-react";
import { Button, Input, Popover, PopoverContent, PopoverTrigger } from "@embeddr/react-ui/ui";
import { toast } from "sonner";
import type { Artifact } from "@/lib/api/types";
import { createArtifact, searchArtifacts } from "@/lib/api/endpoints/artifacts";
import { cn } from "@/lib/utils";

interface ParentArtifactSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function ParentArtifactSelector({ value, onChange }: ParentArtifactSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Array<Artifact>>([]);
  const [loading, setLoading] = useState(false);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch results
  useEffect(() => {
    if (!open) return;

    const fetch = async () => {
      setLoading(true);
      try {
        const res = await searchArtifacts(debouncedSearch);
        setResults(res.items);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [debouncedSearch, open]);

  // Resolve selected name if value exists but object doesn't
  useEffect(() => {
    if (value && !selectedArtifact) {
      // Ideally fetch specific artifact. For now relying on search/cache or just showing ID if missing
    }
  }, [value]);

  const handleCreate = async () => {
    try {
      const newArt = await createArtifact({
        type_name: "collection",
        metadata_json: { name: search },
      });
      setSelectedArtifact(newArt);
      onChange(newArt.id);
      setOpen(false);
      toast.success(`Created collection: ${search}`);
    } catch (e) {
      toast.error("Failed to create collection");
    }
  };

  const displayName = selectedArtifact
    ? selectedArtifact.metadata_json?.name || selectedArtifact.metadata_json?.filename || "Artifact"
    : value
      ? "Selected (UUID)"
      : "Select parent...";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <span className="truncate">{displayName}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <div className="flex flex-col p-2 gap-2">
          <Input
            placeholder="Search artifacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8"
          />

          <div className="max-h-[200px] overflow-y-auto flex flex-col gap-1">
            {loading && (
              <div className="p-2 text-center text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> Searching...
              </div>
            )}

            {!loading && results.length === 0 && search && (
              <div className="text-sm text-muted-foreground p-2 text-center">No results found.</div>
            )}

            {results.map((art) => (
              <Button
                key={art.id}
                variant="ghost"
                size="sm"
                className={cn("justify-start h-8 font-normal", value === art.id && "bg-accent")}
                onClick={() => {
                  setSelectedArtifact(art);
                  onChange(art.id);
                  setOpen(false);
                }}
              >
                <Folder className="w-3 h-3 mr-2 text-blue-500" />
                <span className="truncate">
                  {art.metadata_json?.name || art.metadata_json?.filename || art.id}
                </span>
                {value === art.id && <Check className="ml-auto h-3 w-3" />}
              </Button>
            ))}

            {!loading && search && (
              <Button
                variant="secondary"
                size="sm"
                className="justify-start h-8 mt-1 border-t rounded-none"
                onClick={handleCreate}
              >
                <Plus className="w-3 h-3 mr-2" />
                Create "{search}"
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
