import type { ReactNode } from 'react'
import { HotkeysProvider as TanStackHotkeysProvider } from '@tanstack/react-hotkeys'

export function HotkeysProvider({ children }: { children: ReactNode }) {
  return <TanStackHotkeysProvider>{children}</TanStackHotkeysProvider>
}
