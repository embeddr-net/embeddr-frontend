type Listener = (...args: Array<any>) => void

class EventBus {
  private listeners: Record<string, Array<Listener>> = {}

  on(event: string, listener: Listener) {
    console.log(
      `[EventBus] Subscribing to '${event}'. Total listeners before: ${this.listeners[event]?.length || 0}`,
    )
    if (!this.listeners[event]) {
      this.listeners[event] = []
    }
    this.listeners[event].push(listener)
    return () => this.off(event, listener)
  }

  off(event: string, listener: Listener) {
    console.log(`[EventBus] Unsubscribing from '${event}'`)
    if (!this.listeners[event]) return
    this.listeners[event] = this.listeners[event].filter((l) => l !== listener)
    console.log(
      `[EventBus] Remaining listeners for '${event}': ${this.listeners[event].length}`,
    )
  }

  emit(event: string, ...args: Array<any>) {
    console.log(`[EventBus] Emitting '${event}' with args:`, args)
    if (!this.listeners[event]) {
      console.log(`[EventBus] No listeners for '${event}'`)
      return
    }
    console.log(
      `[EventBus] Notifying ${this.listeners[event].length} listeners for '${event}'`,
    )
    this.listeners[event].forEach((listener) => {
      try {
        listener(...args)
      } catch (e) {
        console.error(`Error in event listener for ${event}:`, e)
      }
    })
  }
}

export const globalEventBus = new EventBus()
