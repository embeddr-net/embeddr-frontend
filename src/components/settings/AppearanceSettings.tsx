import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
  Switch,
} from "@embeddr/react-ui/ui";
import { useSettingsStore } from "@/store/settingsStore";

export function AppearanceSettings() {
  const { vhsEnabled, setVhsEnabled } = useSettingsStore();

  return (
    <Card className="my-1">
      <CardHeader>
        <CardTitle>Appearance Settings</CardTitle>
        <CardDescription>Customize the visual look and feel of the application.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between space-x-2">
          <div className="space-y-1">
            <Label htmlFor="vhs-mode">VHS Effect Mode</Label>
            <p className="text-xs text-muted-foreground">
              Enable a retro VHS overlay effect across the entire application. Fun mode!
            </p>
          </div>
          <Switch id="vhs-mode" checked={vhsEnabled} onCheckedChange={setVhsEnabled} />
        </div>
      </CardContent>
    </Card>
  );
}
