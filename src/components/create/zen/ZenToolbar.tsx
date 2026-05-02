import React from "react";
import {
  Button,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@embeddr/react-ui/ui";
import {
  Box,
  Database,
  Image as ImageIcon,
  List,
  Loader2,
  PanelLeftOpen,
  Play,
  Settings2,
  Sliders,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { useLocalStorage } from "@/hooks/useLocalStorage";
import { usePluginStore } from "@/plugins/store";
import { useWindowStore } from "@/store/windowStore";
import { useSettingsStore } from "@/store/settingsStore";
import { lucideIconFromName } from "@/lib/lucide";

interface ZenToolbarProps {
  panels: {
    settings: boolean;
    queue: boolean;
    toolbox: boolean;
    images: boolean;
    datasets: boolean;
  };
  togglePanel: (key: keyof ZenToolbarProps["panels"]) => void;
  isGenerating: boolean;
  handleGenerate: () => void;
  selectedWorkflow: any;
  hasPendingGenerations: boolean;
  onExitZenMode: () => void;
  hasZenInputs: boolean;
}

export function ZenToolbar({
  panels,
  togglePanel,
  isGenerating,
  // handleGenerate,
  // selectedWorkflow,
  hasPendingGenerations,
  // onExitZenMode,
  // hasZenInputs,
}: ZenToolbarProps) {
  const [generateText] = useLocalStorage("zen-generate-text", "Generate");
  const [generateTheme] = useLocalStorage("zen-generate-theme", "default");
  const showTimer = useSettingsStore(
    (state) => state.pluginSettings["core.zen-mode"]?.showTimer ?? true,
  );
  const [pinnedPanels] = useLocalStorage<Array<string>>("zen-pinned-panels", []);
  const getComponents = usePluginStore((s) => s.getComponents);
  const spawnWindow = useWindowStore((s) => s.spawnWindow);
  const pinnedPanelDefs = React.useMemo(() => {
    if (!pinnedPanels.length) return [];
    const defs = getComponents("zen-overlay").filter(({ def }) => !def.options?.spawnOnly);
    const map = new Map(
      defs.map(({ pluginId, def }) => [`${pluginId}-${def.id}`, { pluginId, def }]),
    );
    return pinnedPanels.map((id) => map.get(id)).filter(Boolean) as Array<{
      pluginId: string;
      def: any;
    }>;
  }, [getComponents, pinnedPanels]);

  const [elapsed, setElapsed] = React.useState(0);

  React.useEffect(() => {
    if (isGenerating) {
      const start = Date.now();
      const interval = setInterval(() => {
        setElapsed((Date.now() - start) / 1000);
      }, 100);
      return () => clearInterval(interval);
    } else {
      setElapsed(0);
    }
  }, [isGenerating]);

  const getGenerateButtonClass = () => {
    if (isGenerating) return "bg-amber-500 hover:bg-amber-600";

    switch (generateTheme) {
      case "amber":
        return "bg-amber-500 hover:bg-amber-600 text-white";
      case "blue":
        return "bg-blue-500 hover:bg-blue-600 text-white";
      case "green":
        return "bg-green-500 hover:bg-green-600 text-white";
      case "purple":
        return "bg-purple-500 hover:bg-purple-600 text-white";
      case "rose":
        return "bg-rose-500 hover:bg-rose-600 text-white";
      default:
        return "bg-primary hover:bg-primary/90";
    }
  };

  return (
    <div
      className="absolute left-1 z-40 flex flex-col gap-2 p-2 bg-background/80 backdrop-blur-md border shadow-lg animate-in slide-in-from-left-4 duration-300 rounded-lg overflow-hidden transition-[bottom]"
      style={{
        bottom: "calc(0.25rem + var(--layout-safe-bottom, 0px))",
      }}
    >
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={panels.toolbox ? "secondary" : "ghost"}
              size="icon"
              onClick={() => {
                spawnWindow("embeddr-core-control-panel", "Control Panel", {
                  pluginId: "embeddr-core",
                  componentName: "ControlPanel",
                  panelMode: "single",
                });
              }}
            >
              <Box className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Control Panel</TooltipContent>
        </Tooltip>

        {pinnedPanelDefs.length > 0 && <Separator className="my-1" />}

        {pinnedPanelDefs.map(({ pluginId, def }) => {
          const componentId = `${pluginId}-${def.id}`;
          const PanelIcon = lucideIconFromName(def.icon) || Box;
          return (
            <Tooltip key={componentId}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const componentName = def.exportName || def.component;
                    if (!componentName) return;
                    spawnWindow(componentId, def.label, {
                      pluginId,
                      componentName,
                      defaultPosition: def.defaultPosition,
                      defaultSize: def.defaultSize,
                      panelMode: def.options?.instanceMode,
                      hideHeader: def.options?.hideHeader,
                      transparent: def.options?.transparent,
                    });
                  }}
                >
                  <PanelIcon className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">{def.label || def.id}</TooltipContent>
            </Tooltip>
          );
        })}

        {/* <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={panels.settings ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => togglePanel('settings')}
              disabled={!hasZenInputs}
            >
              <Sliders className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Quick Settings</TooltipContent>
        </Tooltip> */}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={panels.queue ? "secondary" : "ghost"}
              size="icon"
              onClick={() => togglePanel("queue")}
            >
              <List className="h-5 w-5" />
              {hasPendingGenerations && (
                <span className="absolute top-1 right-1 h-2 w-2  bg-primary" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">History & Queue</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={panels.images ? "secondary" : "ghost"}
              size="icon"
              onClick={() => togglePanel("images")}
            >
              <ImageIcon className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Image Browser</TooltipContent>
        </Tooltip>

        {/* <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={panels.datasets ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => togglePanel('datasets')}
            >
              <Database className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Datasets</TooltipContent>
        </Tooltip> */}
        {/* 
        <Separator className="my-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="default"
              size="icon"
              className={cn(getGenerateButtonClass())}
              onClick={() => handleGenerate()}
              disabled={!selectedWorkflow}
            >
              {isGenerating ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Play className="h-5 w-5 fill-current" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {isGenerating ? 'Queueing...' : generateText}
          </TooltipContent>
        </Tooltip>

        {isGenerating && showTimer && (
          <div className="text-[10px] font-mono text-center text-muted-foreground animate-in fade-in">
            {elapsed.toFixed(1)}s
          </div>
        )} */}

        {/* <Separator className="my-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onExitZenMode}>
              <PanelLeftOpen className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Exit Zen Mode</TooltipContent>
        </Tooltip> */}
      </TooltipProvider>
    </div>
  );
}
