import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button, Card, ScrollArea } from "@embeddr/react-ui/ui";
import { cn } from "@/lib/utils";
import { Route } from "@/routes/settings";
import { getTabById, settingsConfig } from "@/components/settings/settingsConfig";

const SettingsPage = () => {
  const { tab: activeTab } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const setActiveTab = (tab: string) => {
    navigate({ search: { tab } });
  };

  // Ensure activeTab is valid or default
  useEffect(() => {
    if (activeTab && !getTabById(activeTab)) {
      // Fallback to profile if invalid
      navigate({ search: { tab: "profile" }, replace: true });
    }
  }, [activeTab, navigate]);

  const currentConfig = getTabById(activeTab) || getTabById("profile");

  return (
    <div className="p-1 w-full grid grid-cols-12 grid-rows-[auto_1fr] md:grid-rows-[1fr] gap-1 h-full overflow-hidden">
      {/* Sidebar */}
      <div className="col-span-12 md:col-span-3 lg:col-span-2 shrink-0 h-auto md:h-full min-h-0 flex flex-col gap-1">
        <Card className="flex-1 overflow-hidden flex flex-col bg-background/50 border-border/50 backdrop-blur-sm py-0!">
          <div className="flex items-center justify-between shrink-0 border-b border-border/40 p-3 bg-muted/20">
            <span className="text-xs font-semibold text-foreground/80 uppercase tracking-widest">
              Settings
            </span>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-4">
              {settingsConfig.map((section, idx) => (
                <div key={idx} className="space-y-1">
                  {section.label && (
                    <h4 className="px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 opacity-70">
                      {section.label}
                    </h4>
                  )}
                  {section.items.map((item) => (
                    <Button
                      key={item.id}
                      variant={activeTab === item.id ? "secondary" : "ghost"}
                      size="sm"
                      className={cn(
                        "w-full justify-start h-8 px-2",
                        activeTab === item.id && "bg-primary/10 text-primary hover:bg-primary/15",
                      )}
                      onClick={() => setActiveTab(item.id)}
                    >
                      <span className="flex items-center gap-2.5 truncate">
                        {item.icon}
                        <span className="truncate">{item.label}</span>
                      </span>
                    </Button>
                  ))}
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Mobile view active indicator */}
          <div className="md:hidden flex items-center justify-between p-2 border-t border-border/40 bg-card/50">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Current: {currentConfig?.label}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content Area */}
      <Card className="col-span-12 md:col-span-9 lg:col-span-10 flex flex-col overflow-hidden h-full border-border/50 bg-background/30 backdrop-blur-sm shadow-none py-0!">
        <div className="h-full flex flex-col w-full min-h-0">
          {/* Header */}
          <div className="h-12 border-b border-border/40 flex items-center px-6 bg-muted/10">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              {currentConfig?.icon}
              {currentConfig?.label}
            </h2>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden relative">
            <div className="absolute inset-0 overflow-y-auto">
              <div className="min-h-full w-full">{currentConfig?.component}</div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SettingsPage;
