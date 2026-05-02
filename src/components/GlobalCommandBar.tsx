import React, { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@embeddr/react-ui/ui";
import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Settings, Shield } from "lucide-react";
import { embeddrApi } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { useUserStore } from "@/store/userStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useCommandBarStore } from "@/store/commandBarStore";
import { useWebSocket } from "@/providers/WebSocketProvider";

const SectionDivider = () => (
  <div className="embeddr-command-bar-divider h-4 w-px bg-border/50 mx-2 shrink-0" />
);

export function GlobalCommandBar() {
  const { isConnected } = useWebSocket();
  const { pageControls, widgets } = useCommandBarStore();
  const { commandBarHoverParams, commandBarPosition, commandBarShowDividers, commandBarCompact } =
    useSettingsStore(
      useShallow((s) => ({
        commandBarHoverParams: s.commandBarHoverParams,
        commandBarPosition: s.commandBarPosition,
        commandBarShowDividers: s.commandBarShowDividers,
        commandBarCompact: s.commandBarCompact,
      })),
    );

  const { leftWidgets, centerWidgets, rightWidgets } = useMemo(() => {
    const sorted = [...widgets].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return {
      leftWidgets: sorted.filter((w) => w.location === "left"),
      centerWidgets: sorted.filter((w) => w.location === "center"),
      rightWidgets: sorted.filter((w) => w.location === "right"),
    };
  }, [widgets]);

  const isHoverEnabled = commandBarHoverParams?.enabled ?? false;

  return (
    <div
      id="embeddr-command-bar"
      className={cn(
        "embeddr-command-bar embeddr-top-bar shrink-0 border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 flex items-center text-[10px] z-10 relative select-none overflow-hidden transition-all duration-300",
        commandBarPosition === "top" ? "  mt-1!" : "mb-1!",
        commandBarCompact ? "h-8 px-1 my-0!" : "h-9 px-2 mx-1! rounded-md",
        !isConnected && "opacity-50",
        isHoverEnabled &&
          (commandBarCompact
            ? "opacity-0 hover:opacity-100 h-2 hover:h-8 delay-200"
            : "opacity-0 hover:opacity-100 h-2 hover:h-9 delay-200"),
      )}
    >
      {/* Left Section */}
      <div
        id="command-bar-left"
        className="command-bar-section embeddr-command-bar-section embeddr-command-bar-left flex items-center h-full z-10 shrink-0"
      >
        <div className="embeddr-command-bar-section-inner flex items-center gap-1">
          {leftWidgets.map((w, i) => (
            <React.Fragment key={w.id}>
              {i > 0 && commandBarShowDividers && <SectionDivider />}
              <div
                id={`widget-${w.id.replace(/[^a-zA-Z0-9]/g, "-")}`}
                className={cn(
                  "embeddr-widget embeddr-command-bar-widget",
                  `widget-${w.id.replace(/[^a-zA-Z0-9]/g, "-")}`,
                  w.id.startsWith("plugin:") &&
                    `plugin-widget-${w.id
                      .split(":")[1]
                      .split("/")[0]
                      .replace(/[^a-zA-Z0-9]/g, "-")}`,
                )}
              >
                {w.component}
              </div>
            </React.Fragment>
          ))}
        </div>

        {pageControls && (
          <>
            {commandBarShowDividers && <SectionDivider />}
            <div className="embeddr-command-bar-page-controls flex items-center h-full mx-1 gap-1">
              {pageControls}
            </div>
          </>
        )}
      </div>

      {/* Center Section - Absolute Centered */}
      <div
        id="command-bar-center"
        className="command-bar-section embeddr-command-bar-section embeddr-command-bar-center absolute inset-x-0 top-0 bottom-0 flex items-center justify-center pointer-events-none z-0"
      >
        <div
          className={cn(
            "embeddr-command-bar-section-inner pointer-events-auto flex items-center bg-background/0 transition-all gap-1",
            commandBarCompact ? "px-2" : "px-4",
          )}
        >
          {centerWidgets.map((w) => (
            <div
              key={w.id}
              id={`widget-${w.id.replace(/[^a-zA-Z0-9]/g, "-")}`}
              className={cn(
                "embeddr-widget embeddr-command-bar-widget",
                `widget-${w.id.replace(/[^a-zA-Z0-9]/g, "-")}`,
                w.id.startsWith("plugin:") &&
                  `plugin-widget-${w.id
                    .split(":")[1]
                    .split("/")[0]
                    .replace(/[^a-zA-Z0-9]/g, "-")}`,
              )}
            >
              {w.component}
            </div>
          ))}
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right Section */}
      <div
        id="command-bar-right"
        className="command-bar-section embeddr-command-bar-section embeddr-command-bar-right flex items-center justify-end h-full z-10 shrink-0 gap-0"
      >
        <div className="embeddr-command-bar-section-inner flex items-center gap-1">
          {rightWidgets.map((w) => (
            <React.Fragment key={w.id}>
              {commandBarShowDividers && <SectionDivider />}
              <div
                id={`widget-${w.id.replace(/[^a-zA-Z0-9]/g, "-")}`}
                className={cn(
                  "embeddr-widget embeddr-command-bar-widget flex items-center",
                  `widget-${w.id.replace(/[^a-zA-Z0-9]/g, "-")}`,
                )}
              >
                {w.component}
              </div>
            </React.Fragment>
          ))}
          {commandBarShowDividers && <SectionDivider />}
          <UserProfileWidget />
        </div>
      </div>
    </div>
  );
}

const UserProfileWidget = () => {
  const navigate = useNavigate();
  const {
    displayName,
    avatarUrl,
    isOperator,
    setApiKey,
    setDisplayName,
    setAvatarUrl,
    setIsOperator,
  } = useUserStore();

  const handleLogout = async () => {
    try {
      await embeddrApi.auth.setSession({ apiKey: null, clear: true });
    } catch (err) {
      console.error(err);
    } finally {
      setApiKey(null);
      setDisplayName("Guest User");
      setAvatarUrl("");
      setIsOperator(false);
      navigate({ to: "/" });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="embeddr-command-bar-profile-button h-6 w-6 p-0 rounded-full"
        >
          <Avatar className="h-6 w-6">
            <AvatarImage src={avatarUrl} />
            <AvatarFallback className="text-[10px] bg-primary/20">
              {(displayName || "U").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="embeddr-command-bar-profile-menu w-48">
        <DropdownMenuLabel className="font-normal">
          <div className="text-xs text-muted-foreground">Signed in as</div>
          <div className="text-sm font-medium truncate">{displayName || "User"}</div>
          <div className="mt-1">
            <Badge variant={isOperator ? "default" : "secondary"}>
              {isOperator ? "Operator" : "Client"}
            </Badge>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/settings" search={{ tab: "profile" }}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        {isOperator && (
          <DropdownMenuItem asChild>
            <Link to="/operator">
              <Shield className="mr-2 h-4 w-4" />
              Operator Settings
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
