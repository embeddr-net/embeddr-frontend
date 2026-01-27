// lotus.route.tsx (single-file route, adds click-to-dispatch)
// Keeps your inline types and BACKEND_V2_URL usage.

import React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { LotusDashboard } from '@/features/lotus/LotusDashboard'

const LotusPage = () => {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <LotusDashboard />
    </div>
  )
}

export const Route = createFileRoute('/lotus')({
  component: LotusPage,
})
