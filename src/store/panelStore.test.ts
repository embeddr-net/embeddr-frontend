import { describe, it, expect, beforeEach } from 'vitest'
import { usePanelStore } from './panelStore'

describe('usePanelStore', () => {
  beforeEach(() => {
    usePanelStore.setState({ activePanelId: null, panelOrder: [] })
  })

  it('should set active panel', () => {
    usePanelStore.getState().setActivePanel('panel1')
    expect(usePanelStore.getState().activePanelId).toBe('panel1')
  })

  it('should bring panel to front', () => {
    usePanelStore.setState({ panelOrder: ['p1', 'p2', 'p3'] })

    usePanelStore.getState().bringToFront('p2')

    expect(usePanelStore.getState().panelOrder).toEqual(['p1', 'p3', 'p2'])
    expect(usePanelStore.getState().activePanelId).toBe('p2')
  })
})
