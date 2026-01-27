import React from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Card } from '@embeddr/react-ui/components/card'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'

const OnboardingPage = () => {
  const navigate = useNavigate()

  return (
    <div className="flex h-full min-h-0 flex-col p-2">
      <Card className="mx-auto w-full max-w-4xl p-4">
        <div className="mb-4">
          <h1 className="text-xl font-semibold">Embeddr Setup Wizard</h1>
          <p className="text-sm text-muted-foreground">
            Walk through a quick system check and ingest setup.
          </p>
        </div>
        <OnboardingWizard
          onComplete={() => navigate({ to: '/' })}
          onOpenSettingsTab={(tab) =>
            navigate({ to: '/settings', search: { tab } })
          }
        />
      </Card>
    </div>
  )
}

export const Route = createFileRoute('/onboarding')({
  component: OnboardingPage,
})
