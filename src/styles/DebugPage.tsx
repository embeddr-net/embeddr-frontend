import { cn } from '@/lib/utils'

const tabContentClasses = cn('flex-1 min-h-0 mt-0 p-0 overflow-hidden ')

const tabsTriggerClasses = cn(
  'data-[state=active]:bg-background border-b-2 border-transparent data-[state=active]:border-primary px-4',
)

export { tabsTriggerClasses, tabContentClasses }
