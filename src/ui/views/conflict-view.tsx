// src/ui/views/conflict-view.tsx
// Interactive conflict resolution view — shows file with colored conflict regions

import { createSignal, For, Show } from "solid-js"
import type { Accessor } from "solid-js"
import type { ScrollBoxRenderable } from "@opentui/core"
import type { ConflictFile, ConflictRegion, ResolveStrategy } from "../../core/git/conflict-parser.ts"
import { parseConflictMarkers, resolveConflict, RESOLVE_STRATEGY } from "../../core/git/conflict-parser.ts"
import { markResolved } from "../../core/git/commands.ts"
import { refreshStatus, refreshMergeState } from "../../state/repo.ts"
import { showStatusMessage } from "../../state/ui.ts"

// ── State ────────────────────────────────────────────────────

const [conflictFile, setConflictFile] = createSignal<ConflictFile | null>(null)
const [currentConflictIndex, setCurrentConflictIndex] = createSignal(0)
const [filePath, setFilePath] = createSignal<string | null>(null)

let scrollboxRef: ScrollBoxRenderable | null = null

// ── Loading ──────────────────────────────────────────────────

export async function loadConflictFile(path: string): Promise<void> {
  try {
    const file = Bun.file(path)
    const content = await file.text()
    const parsed = parseConflictMarkers(content)
    setConflictFile(parsed)
    setFilePath(path)
    setCurrentConflictIndex(0)
  } catch {
    setConflictFile(null)
    setFilePath(null)
  }
}

export function clearConflictFile(): void {
  setConflictFile(null)
  setFilePath(null)
  setCurrentConflictIndex(0)
}

// ── Navigation ───────────────────────────────────────────────

export function nextConflict(): void {
  const cf = conflictFile()
  if (!cf) return
  setCurrentConflictIndex((prev) => Math.min(prev + 1, cf.conflictCount - 1))
}

export function prevConflict(): void {
  setCurrentConflictIndex((prev) => Math.max(prev - 1, 0))
}

// ── Resolution ───────────────────────────────────────────────

export async function resolveCurrentConflict(strategy: ResolveStrategy): Promise<void> {
  const cf = conflictFile()
  const path = filePath()
  if (!cf || !path) return

  const idx = currentConflictIndex()
  const resolved = resolveConflict(cf, idx, strategy)

  try {
    // Write resolved content back to file
    await Bun.write(path, resolved)

    // Re-parse the file to update conflict regions
    const reParsed = parseConflictMarkers(resolved)
    setConflictFile(reParsed)

    // Adjust conflict index
    if (reParsed.conflictCount === 0) {
      // All conflicts resolved — mark as resolved in git
      await markResolved(path)
      await refreshStatus()
      await refreshMergeState()
      showStatusMessage(`All conflicts resolved: ${path}`)
      setCurrentConflictIndex(0)
    } else {
      // Clamp index
      setCurrentConflictIndex((prev) => Math.min(prev, reParsed.conflictCount - 1))
      showStatusMessage(`Conflict ${idx + 1} resolved — ${reParsed.conflictCount} remaining`)
    }
  } catch (err) {
    showStatusMessage(`Failed to resolve: ${err instanceof Error ? err.message : String(err)}`)
  }
}

// ── Scrolling ────────────────────────────────────────────────

export function scrollConflictDown(): void {
  scrollboxRef?.scrollBy(3)
}

export function scrollConflictUp(): void {
  scrollboxRef?.scrollBy(-3)
}

// ── Exports for external use ─────────────────────────────────

export { conflictFile, currentConflictIndex }

// ── Line coloring ────────────────────────────────────────────

const COLORS = {
  // Conflict markers
  oursMarkerBg: "#1a4a1a",
  theirsMarkerBg: "#4a1a1a",
  dividerBg: "#3a3a1a",
  // Content regions
  oursContentBg: "#0d2d0d",
  theirsContentBg: "#2d0d0d",
  // Active conflict (brighter)
  activeOursMarkerBg: "#2a6a2a",
  activeTheirsMarkerBg: "#6a2a2a",
  activeDividerBg: "#5a5a2a",
  activeOursContentBg: "#1a4a1a",
  activeTheirsContentBg: "#4a1a1a",
  // Text
  markerFg: "#cdd6f4",
  contextFg: "#bac2de",
} as const

interface LineStyle {
  fg: string
  bg?: string
}

function getLineStyle(
  lineIdx: number,
  conflicts: ConflictRegion[],
  activeConflictIdx: number,
): LineStyle {
  const lineNum = lineIdx + 1 // Convert to 1-indexed

  for (let ci = 0; ci < conflicts.length; ci++) {
    const c = conflicts[ci]!
    const isActive = ci === activeConflictIdx

    // <<<<<<< marker
    if (lineNum === c.oursStart) {
      return {
        fg: COLORS.markerFg,
        bg: isActive ? COLORS.activeOursMarkerBg : COLORS.oursMarkerBg,
      }
    }

    // Ours content (between <<<<<<< and =======)
    if (lineNum > c.oursStart && lineNum < c.divider) {
      return {
        fg: "#a6e3a1",
        bg: isActive ? COLORS.activeOursContentBg : COLORS.oursContentBg,
      }
    }

    // ======= divider
    if (lineNum === c.divider) {
      return {
        fg: COLORS.markerFg,
        bg: isActive ? COLORS.activeDividerBg : COLORS.dividerBg,
      }
    }

    // Theirs content (between ======= and >>>>>>>)
    if (lineNum > c.divider && lineNum < c.theirsEnd) {
      return {
        fg: "#f38ba8",
        bg: isActive ? COLORS.activeTheirsContentBg : COLORS.theirsContentBg,
      }
    }

    // >>>>>>> marker
    if (lineNum === c.theirsEnd) {
      return {
        fg: COLORS.markerFg,
        bg: isActive ? COLORS.activeTheirsMarkerBg : COLORS.theirsMarkerBg,
      }
    }
  }

  // Normal context line
  return { fg: COLORS.contextFg }
}

// ── Component ────────────────────────────────────────────────

export interface ConflictViewProps {
  path: string
}

export function ConflictView(props: ConflictViewProps) {
  const cf = () => conflictFile()
  const activeIdx = () => currentConflictIndex()

  return (
    <box flexDirection="column" flexGrow={1}>
      <Show
        when={cf()}
        fallback={
          <box flexGrow={1} justifyContent="center" alignItems="center">
            <text fg="#6c7086">Loading conflict view...</text>
          </box>
        }
      >
        {(file: Accessor<ConflictFile>) => (
          <>
            {/* File header */}
            <box
              height={1}
              backgroundColor="#1e1e2e"
              paddingLeft={1}
              paddingRight={1}
              flexDirection="row"
              flexShrink={0}
            >
              <text fg="#f38ba8">
                <b>⚡ {props.path}</b>
              </text>
              <text fg="#fab387">
                {" "}— conflict {activeIdx() + 1}/{file().conflictCount}
              </text>
            </box>

            {/* File content with colored conflict regions */}
            <scrollbox flexGrow={1} ref={scrollboxRef!}>
              <For each={file().lines}>
                {(line, lineIdx) => {
                  const style = () =>
                    getLineStyle(lineIdx(), file().conflicts, activeIdx())
                  return (
                    <text fg={style().fg} bg={style().bg} wrapMode="none">
                      {" "}{line || " "}
                    </text>
                  )
                }}
              </For>
            </scrollbox>

            {/* Footer — keybinding hints */}
            <box
              height={1}
              backgroundColor="#1e1e2e"
              paddingLeft={1}
              flexDirection="row"
              gap={2}
              flexShrink={0}
            >
              <box flexDirection="row">
                <text fg="#89b4fa">[Space]</text>
                <text fg="#6c7086"> ours</text>
              </box>
              <box flexDirection="row">
                <text fg="#89b4fa">[t]</text>
                <text fg="#6c7086"> theirs</text>
              </box>
              <box flexDirection="row">
                <text fg="#89b4fa">[b]</text>
                <text fg="#6c7086"> both</text>
              </box>
              <box flexDirection="row">
                <text fg="#89b4fa">[n/p]</text>
                <text fg="#6c7086"> prev/next</text>
              </box>
              <box flexDirection="row">
                <text fg="#89b4fa">[Esc]</text>
                <text fg="#6c7086"> back</text>
              </box>
            </box>
          </>
        )}
      </Show>
    </box>
  )
}
