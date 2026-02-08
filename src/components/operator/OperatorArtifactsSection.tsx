import React from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@embeddr/react-ui/components/card'

export const OperatorArtifactsSection = () => (
  <Card>
    <CardHeader>
      <CardTitle>Artifacts & Visibility</CardTitle>
      <CardDescription>
        Control what this operator shares and exposes.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div className="text-sm text-muted-foreground">
        Artifact visibility controls are coming next. This section will manage
        operator-owned artifacts and permissions.
      </div>
    </CardContent>
  </Card>
)
