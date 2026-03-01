// src/ui/components/file-tree.tsx
// Reusable file list with colored status icons and selection tracking

import { For, Show } from "solid-js"
import type { GitFile } from "../../core/git/types.ts"

// ── Status colors ────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  M: "#f9e2af", // yellow
  A: "#a6e3a1", // green
  D: "#f38ba8", // red
  R: "#89b4fa", // blue
  C: "#89b4fa", // blue
  U: "#fab387", // orange
  "?": "#6c7086", // gray
}

function statusColor(status: string): string {
  return STATUS_COLORS[status] ?? "#cdd6f4"
}

// ── Props ────────────────────────────────────────────────────

export interface FileTreeProps {
  files: GitFile[]
  title: string
  selectedIndex: number
  indexOffset: number
  onSelect: (file: GitFile, globalIndex: number) => void
}

// ── Component ────────────────────────────────────────────────

export function FileTree(props: FileTreeProps) {
  return (
    <Show when={props.files.length > 0}>
      <text fg="#6c7086">
        <b> {props.title} ({props.files.length}) </b>
      </text>
      <For each={props.files}>
        {(file, i) => {
          const globalIdx = () => i() + props.indexOffset
          const isSelected = () => props.selectedIndex === globalIdx()

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
  )
}
