// src/ui/components/error-boundary.tsx
// Reusable error boundary — wraps views and catches errors gracefully

import { ErrorBoundary } from "solid-js"
import type { JSX } from "solid-js"
import { GitCommandError } from "../../core/git/commands.ts"
import { error as logError } from "../../lib/logger.ts"

// ── Props ────────────────────────────────────────────────────

interface ViewBoundaryProps {
  name: string
  children: JSX.Element
}

// ── Helpers ──────────────────────────────────────────────────

function classifyError(err: unknown): string {
  if (err instanceof GitCommandError) {
    return `Git operation failed: ${err.message}`
  }

  const message = err instanceof Error ? err.message : String(err)

  if (message.includes("gh ") || message.includes("GitHub") || message.includes("gh:")) {
    return `GitHub CLI error: ${message}\n  Hint: check 'gh auth status' or retry`
  }

  return message
}

// ── Component ────────────────────────────────────────────────

export function ViewBoundary(props: ViewBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={(err: unknown, reset: () => void) => {
        logError(`[ViewBoundary:${props.name}] ${err instanceof Error ? err.message : String(err)}`, {
          name: props.name,
          error: err instanceof Error ? err.stack : String(err),
        })

        const friendly = classifyError(err)

        return (
          <box flexDirection="column" padding={1}>
            <text fg="#f38ba8">
              <b> Error in {props.name} </b>
            </text>
            <text fg="#cdd6f4"> {friendly}</text>
            <text fg="#6c7086"> Press R to retry</text>
          </box>
        )
      }}
    >
      {props.children}
    </ErrorBoundary>
  )
}
