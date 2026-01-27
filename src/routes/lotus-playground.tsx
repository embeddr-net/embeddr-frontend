import { createFileRoute } from '@tanstack/react-router'
import { LotusExplorer } from '@/features/lotus/LotusExplorer'

export const Route = createFileRoute('/lotus-playground')({
  component: LotusPlaygroundPage,
})

function LotusPlaygroundPage() {
  return (
    <div className="flex h-full min-h-0 flex-col p-4">
      <LotusExplorer />
    </div>
  )
}
