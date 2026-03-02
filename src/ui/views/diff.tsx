// src/ui/views/diff.tsx
// Diff viewer — renders FileDiff using OpenTUI's <diff> component

import { Show, type Accessor } from "solid-js"
import type { ScrollBoxRenderable } from "@opentui/core"
import { FILE_STATUS } from "../../core/git/types.ts"
import type { FileDiff } from "../../core/git/types.ts"
import { config, syntaxStyle } from "../../state/config.ts"
import { repo } from "../../state/repo.ts"
import { getFiletype } from "../../lib/syntax/filetype-map.ts"

// ── Scroll state ─────────────────────────────────────────────

const SCROLL_STEP = 3

let scrollboxRef: ScrollBoxRenderable | null = null

export function scrollDiffDown(): void {
  scrollboxRef?.scrollBy(SCROLL_STEP)
}

export function scrollDiffUp(): void {
  scrollboxRef?.scrollBy(-SCROLL_STEP)
}

// ── Helpers ──────────────────────────────────────────────────

function isFileUnmerged(path: string): boolean {
  return repo.status?.unstaged.some(
    (f) => f.path === path && f.status === FILE_STATUS.UNMERGED,
  ) ?? false
}

// ── Props ────────────────────────────────────────────────────

export interface DiffViewProps {
  fileDiff: FileDiff | null
}

// ── Component ────────────────────────────────────────────────

export function DiffView(props: DiffViewProps) {
  return (
    <box flexDirection="column" flexGrow={1}>
      <Show
        when={props.fileDiff}
        fallback={
          <box flexGrow={1} justifyContent="center" alignItems="center">
            <text fg="#6c7086">Select a file to view diff</text>
          </box>
        }
      >
        {(fileDiff: Accessor<FileDiff>) => (
          <>
            {/* File header */}
            <box height={1} backgroundColor="#1e1e2e" padding={1} flexDirection="row">
              <text fg="#89b4fa">
                <b>{fileDiff().path}</b>
              </text>
              <Show when={fileDiff().oldPath}>
                <text fg="#6c7086"> (renamed from {fileDiff().oldPath})</text>
              </Show>
              <Show when={isFileUnmerged(fileDiff().path)}>
                <text fg="#f38ba8"> ⚡ CONFLICT — press [o] to resolve</text>
              </Show>
            </box>

            {/* Diff content */}
            <Show
              when={!fileDiff().binary}
              fallback={
                <box flexGrow={1} justifyContent="center" alignItems="center">
                  <text fg="#fab387">Binary file — cannot display diff</text>
                </box>
              }
            >
              <scrollbox flexGrow={1} ref={scrollboxRef!}>
                <Show
                  when={fileDiff().raw.trim().length > 0}
                  fallback={
                    <text fg="#6c7086"> No changes to display</text>
                  }
                >
                  <diff
                    diff={fileDiff().raw}
                    view={config().diff.view}
                    showLineNumbers={config().diff.show_line_numbers}
                    filetype={getFiletype(fileDiff().path)}
                    syntaxStyle={syntaxStyle()}
                    addedBg="#1a3a1a"
                    removedBg="#3a1a1a"
                    addedSignColor="#a6e3a1"
                    removedSignColor="#f38ba8"
                    contextBg="#11111b"
                  />
                </Show>
              </scrollbox>
            </Show>
          </>
        )}
      </Show>
    </box>
  )
}
