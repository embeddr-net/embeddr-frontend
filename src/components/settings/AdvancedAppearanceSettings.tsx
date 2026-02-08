import React from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@embeddr/react-ui/components/card'
import { Textarea } from '@embeddr/react-ui/components/textarea'
import { Label } from '@embeddr/react-ui/components/label'
import { Switch } from '@embeddr/react-ui/components/switch'
import { useSettingsStore } from '@/store/settingsStore'

export function AdvancedAppearanceSettings() {
  const { customCss, setCustomCss, customCssEnabled, setCustomCssEnabled } =
    useSettingsStore()

  return (
    <Card className="my-1">
      <CardHeader>
        <CardTitle>Advanced Appearance</CardTitle>
        <div className="flex items-center justify-between">
          <CardDescription>
            Customize the UI with custom CSS. Use stable classes like
            <code>.embeddr-panel</code>.
          </CardDescription>
          <div className="flex items-center space-x-2">
            <Switch
              id="custom-css-enabled"
              checked={customCssEnabled}
              onCheckedChange={setCustomCssEnabled}
            />
            <Label htmlFor="custom-css-enabled">Enable Custom CSS</Label>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="custom-css">Custom CSS</Label>
          <Textarea
            id="custom-css"
            placeholder="/* Add your custom CSS here */\n.embeddr-command-bar {\n  opacity: 0.9;\n}"
            className="font-mono text-xs min-h-[300px]"
            value={customCss}
            onChange={(e) => setCustomCss(e.target.value)}
          />
          <div className="text-[10px] text-muted-foreground space-y-1">
            <p>Example selectors:</p>
            <ul className="list-disc list-inside">
              <li>
                <code>.embeddr-panel</code>: Target all floating panels
              </li>
              <li>
                <code>.embeddr-panel-header</code>: Panel title bar
              </li>
              <li>
                <code>.embeddr-panel-button-close</code>: Panel close button
              </li>
              <li>
                <code>.embeddr-command-bar</code>: Target the global command bar
              </li>
              <li>
                <code>.embeddr-command-bar-profile-button</code>: Profile button
              </li>
              <li>
                <code>.embeddr-panel-PLUGID</code>: Target a specific plugin's
                panel
              </li>
              <li>
                <code>.embeddr-component-NAME</code>: Target a specific
                component
              </li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
