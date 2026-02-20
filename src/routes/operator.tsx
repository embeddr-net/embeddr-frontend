import React, { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@embeddr/react-ui/components/ui'
import { ScrollArea } from '@embeddr/react-ui/components/ui'
import { useOperatorConsoleData } from '@/hooks/useOperatorConsoleData'
import { OperatorOverviewSection } from '@/components/operator/OperatorOverviewSection'
import { OperatorArtifactsSection } from '@/components/operator/OperatorArtifactsSection'
import { OperatorClientsSection } from '@/components/operator/OperatorClientsSection'
import { OperatorRolesSection } from '@/components/operator/OperatorRolesSection'
import { OperatorKeysSection } from '@/components/operator/OperatorKeysSection'
import { OperatorOperatorsSection } from '@/components/operator/OperatorOperatorsSection'

const OperatorConsolePage = () => {
  const [activeSection, setActiveSection] = useState<
    'overview' | 'users' | 'roles' | 'keys' | 'operators' | 'artifacts'
  >('overview')

  const data = useOperatorConsoleData()

  return (
    <ScrollArea className="h-full w-full">
      <div className="min-h-full w-full p-4">
        <div className="mb-6">
          <div className="text-2xl font-semibold">Operator Console</div>
          <div className="text-sm text-muted-foreground">
            Manage clients, roles, keys, and operator data for this workspace.
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Operator workspace
            </div>
            <div className="flex flex-col gap-1">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'users', label: 'Clients' },
                { id: 'roles', label: 'Roles' },
                { id: 'keys', label: 'Client Keys' },
                { id: 'artifacts', label: 'Artifacts' },
                { id: 'operators', label: 'Operators' },
              ].map((section) => (
                <Button
                  key={section.id}
                  variant={activeSection === section.id ? 'default' : 'ghost'}
                  className="justify-start"
                  onClick={() =>
                    setActiveSection(
                      section.id as
                        | 'overview'
                        | 'users'
                        | 'roles'
                        | 'keys'
                        | 'artifacts'
                        | 'operators',
                    )
                  }
                >
                  {section.label}
                </Button>
              ))}
            </div>
            {data.isForbidden && (
              <div className="rounded border border-destructive/40 p-3 text-xs text-destructive">
                Operator access required for client, role, and key management.
              </div>
            )}
          </div>
          <div className="space-y-6">
            {activeSection === 'overview' && (
              <OperatorOverviewSection operatorQuery={data.operatorQuery} />
            )}
            {activeSection === 'artifacts' && <OperatorArtifactsSection />}
            {activeSection === 'users' && (
              <OperatorClientsSection
                users={data.users}
                roles={data.roles}
                usersQuery={data.usersQuery}
                isForbidden={data.isForbidden}
              />
            )}
            {activeSection === 'roles' && (
              <OperatorRolesSection
                roles={data.roles}
                rolesQuery={data.rolesQuery}
                capabilityScopes={data.capabilityScopes}
                isForbidden={data.isForbidden}
              />
            )}
            {activeSection === 'keys' && (
              <OperatorKeysSection
                users={data.users}
                keys={data.keys}
                keysQuery={data.keysQuery}
                capabilityScopes={data.capabilityScopes}
                isForbidden={data.isForbidden}
              />
            )}
            {activeSection === 'operators' && (
              <OperatorOperatorsSection
                operators={data.operators}
                operatorsQuery={data.operatorsQuery}
                isForbidden={data.isForbidden}
              />
            )}
          </div>
        </div>
      </div>
    </ScrollArea>
  )
}

export const Route = createFileRoute('/operator')({
  component: OperatorConsolePage,
})
