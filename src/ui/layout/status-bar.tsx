// src/ui/layout/status-bar.tsx
// Top bar: repo name, branch info, file counters

import { repo } from "../../state/repo.ts"

export function StatusBar() {
  const branch = () => repo.status?.branch ?? "unknown"
  const stagedCount = () => repo.status?.staged.length ?? 0
  const unstagedCount = () => repo.status?.unstaged.length ?? 0
  const untrackedCount = () => repo.status?.untracked.length ?? 0

  return (
    <box flexDirection="row" width="100%" height={1} backgroundColor="#1e1e2e">
      <text fg="#89b4fa">
        <b> gittui </b>
      </text>

      <box flexGrow={1} />

      <text fg="#cba6f7"> {branch()} </text>
      <text fg="#a6e3a1">+{stagedCount()}</text>
      <text fg="#f9e2af"> ~{unstagedCount()}</text>
      <text fg="#6c7086"> ?{untrackedCount()}</text>

      <box flexGrow={1} />
    </box>
  )
}
