// src/state/actions.ts
// Global action registry — views register dialog-based handlers at mount time

type ActionHandler = () => void | Promise<void>

const handlers: Map<string, ActionHandler> = new Map()

export function registerAction(action: string, handler: ActionHandler): void {
  handlers.set(action, handler)
}

export function unregisterAction(action: string): void {
  handlers.delete(action)
}

export function executeAction(action: string): boolean {
  const handler = handlers.get(action)
  if (handler) {
    handler()
    return true
  }
  return false
}

export function hasAction(action: string): boolean {
  return handlers.has(action)
}
