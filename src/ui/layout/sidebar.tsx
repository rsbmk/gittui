// src/ui/layout/sidebar.tsx
// Collapsible sidebar — file list from working tree (unstaged + staged)

import { createEffect, createMemo, For, Show } from "solid-js"
import { repo } from "../../state/repo.ts"
import {
  selectedIndex,
  setSelectedIndex,
  setSelectedFile,
  sidebarWidth,
} from "../../state/ui.ts"
import type { GitFile } from "../../core/git/types.ts"

// ── Status colors by file status code ────────────────────────

const STATUS_COLORS: Record<string, string> = {
  M: "#f9e2af",
  A: "#a6e3a1",
  D: "#f38ba8",
  R: "#89b4fa",
  C: "#89b4fa",
  U: "#fab387",
  "?": "#6c7086",
}

function statusColor(status: string): string {
  return STATUS_COLORS[status] ?? "#cdd6f4"
}

// ── Component ────────────────────────────────────────────────

export function Sidebar() {
  const unstaged = () => repo.status?.unstaged ?? []
  const staged = () => repo.status?.staged ?? []

  const allFiles = createMemo<GitFile[]>(() => [...unstaged(), ...staged()])

  // When the file list changes, clamp selectedIndex
  createEffect(() => {
    const len = allFiles().length
    if (len === 0) {
      setSelectedIndex(0)
      setSelectedFile(null)
    } else if (selectedIndex() >= len) {
      setSelectedIndex(len - 1)
    }
  })

  // Keep selectedFile in sync with selectedIndex
  createEffect(() => {
    const files = allFiles()
    const idx = selectedIndex()
    const file = files[idx]
    setSelectedFile(file?.path ?? null)
  })

  const unstagedCount = () => unstaged().length

  return (
    <box
      flexDirection="column"
      width={sidebarWidth()}
      height="100%"
      borderStyle="single"
      borderColor="#313244"
    >
      <scrollbox flexGrow={1}>
        {/* UNSTAGED section */}
        <Show when={unstaged().length > 0}>
          <text fg="#6c7086">
            <b> UNSTAGED </b>
          </text>
          <For each={unstaged()}>
            {(file, i) => {
              const isSelected = () => selectedIndex() === i()
              return (
                <text
                  bg={isSelected() ? "#313244" : undefined}
                  fg={statusColor(file.status)}
                >
                  {isSelected() ? "▸" : " "} {file.status} {file.path}
                </text>
              )
            }}
          </For>
        </Show>

        {/* STAGED section */}
        <Show when={staged().length > 0}>
          <text fg="#6c7086">
            <b> STAGED </b>
          </text>
          <For each={staged()}>
            {(file, i) => {
              const globalIdx = () => i() + unstagedCount()
              const isSelected = () => selectedIndex() === globalIdx()
              return (
                <text
                  bg={isSelected() ? "#313244" : undefined}
                  fg={statusColor(file.status)}
                >
                  {isSelected() ? "▸" : " "} {file.status} {file.path}
                </text>
              )
            }}
          </For>
        </Show>

        {/* Empty state */}
        <Show when={allFiles().length === 0}>
          <text fg="#6c7086"> No changes</text>
        </Show>
      </scrollbox>
    </box>
  )
}
