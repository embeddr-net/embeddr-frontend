import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
// Actually we might need a direct endpoint to run a plugin action if it's not wrapped in an ActionArtifact.
// But wait, ActionRunner runs ActionGraphs.
// To run a raw plugin action, we usually need to construct a temporary graph or use a direct endpoint.
// Let's check api actions.py/plugin.py.

// If no direct endpoint exists, we can perhaps assume we add one or use a "one-node" graph approach?
// "Scraper: Crawl" is a plugin action.

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Spinner,
  Textarea,
} from "@embeddr/react-ui/ui";
import { Play, Terminal } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { fetchPlugins } from "@/lib/api"; // Assuming runActionArtifact generic can run plugin actions via runner?
import { BACKEND_URL } from "@/lib/api/config";

// Ideally we fetch actions from all plugins.
// Plugins endpoint returns list of plugins, each has `.actions`.

export const PluginActionsPage = () => {
  const { data: plugins, isLoading } = useQuery({
    queryKey: ["plugins"],
    queryFn: fetchPlugins,
  });

  if (isLoading)
    return (
      <div className="p-12 flex justify-center">
        <Spinner />
      </div>
    );

  // Flatten actions
  const allActions =
    plugins?.flatMap(
      (p) =>
        (
          ((p as any).actions || (p as any).frontend_actions || []) as Array<{
            name: string;
            label?: string;
            description?: string;
            inputs?: Array<string>;
          }>
        ).map((a) => ({
          ...a,
          pluginName: p.name,
          pluginVersion: p.version,
        })) || [],
    ) || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Plugin Actions</h1>
        <p className="text-muted-foreground">Directly execute atomic plugin capabilities.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {allActions.map((action, idx) => (
          <ActionCard key={`${action.pluginName}-${action.name}-${idx}`} action={action} />
        ))}

        {allActions.length === 0 && (
          <div className="col-span-full text-center py-12 border-2 border-dashed rounded-lg text-muted-foreground">
            No actions found exposed by plugins.
          </div>
        )}
      </div>
    </div>
  );
};

const ActionCard = ({ action }: { action: any }) => {
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleRun = async () => {
    setIsRunning(true);
    setResult(null);
    try {
      // We need an endpoint to run a raw plugin action.
      // If it doesn't exist, we might fail.
      // Try a direct execution endpoint if available.
      // Since we don't have that endpoint confirmed, we'll try to find one or mock it.
      // Wait, usually the "Action Runner" runs graphs.
      // Can we run a "graph" with 1 node? Yes.
      // Let's construct a transient 1-node action graph artifact on the fly? No that's complex.

      // Let's use a new endpoint or existing mechanism.
      // The scraper plugin handles `scraper:crawl` but that's handled via `ExecutionSpine`.
      // The ActionRunner logic: `plugin.execute(...)`.

      // Let's use `createExecution` if available?
      // Assuming the execution endpoint accepts this payload.

      const payload = {
        plugin_name: action.pluginName,
        action_name: action.name,
        inputs: inputs, // Assuming string values for simplicity or JSON parsing
      };

      // Currently looking at actions.py, we only have `/run` for artifacts.
      // We should add a temporary "Run Ad-hoc" feature or assume one exists.
      // I'll simulate it via a client request to a likely endpoint,
      // and if implementation is missing, I'll add it to the backend next.

      const res = await fetch(`${BACKEND_URL}/actions/exec/plugin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || "Request failed");
      }

      const data = await res.json();
      setResult(data);
      toast.success("Action executed");
    } catch (e: any) {
      toast.error("Failed: " + e.message);
      setResult({ error: e.message });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <CardTitle className="text-lg">{action.label || action.name}</CardTitle>
            <CardDescription>{action.description}</CardDescription>
          </div>
          <Badge variant="outline">{action.pluginName}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        {action.inputs && action.inputs.length > 0 ? (
          <div className="space-y-3">
            <Label className="text-xs uppercase text-muted-foreground font-semibold">Inputs</Label>
            {action.inputs.map((inp: string) => (
              <div key={inp} className="space-y-1">
                <Label htmlFor={inp} className="text-xs">
                  {inp}
                </Label>
                <Input
                  id={inp}
                  placeholder={`Value for ${inp}`}
                  value={inputs[inp] || ""}
                  onChange={(e) => setInputs((prev) => ({ ...prev, [inp]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">No inputs required.</p>
        )}

        {result && (
          <div className="bg-muted p-2 rounded text-xs overflow-auto font-mono max-h-32">
            {JSON.stringify(result, null, 2)}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button className="w-full" onClick={handleRun} disabled={isRunning}>
          {isRunning ? <Spinner className="mr-2" /> : <Play className="mr-2 h-4 w-4" />}
          Execute
        </Button>
      </CardFooter>
    </Card>
  );
};
