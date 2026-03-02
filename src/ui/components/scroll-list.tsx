// src/ui/components/scroll-list.tsx
// Scrollable list with automatic scroll-follow — keeps the selected row visible
//
// Uses incremental scrolling (scrollTop += delta) for j/k navigation so we
// never depend on viewport.height which is unreliable in OpenTUI.
// For large jumps (tab switch, clicks) it repositions absolutely.

import { createEffect } from "solid-js"
import type { ScrollBoxRenderable } from "@opentui/core"
import type { JSX } from "solid-js"

// ── Constants ────────────────────────────────────────────────

/** Rows of context above selection on absolute repositioning (like vim scrolloff) */
const SCROLL_MARGIN = 3

/** Incremental navigation moves ≤2 rows (PR cards use 2 rows per item) */
const MAX_INCREMENTAL_DELTA = 2

// ── Props ────────────────────────────────────────────────────

export interface ScrollListProps {
  selectedRow: number
  scrollMargin?: number
  flexGrow?: number
  children: JSX.Element
}

// ── Component ────────────────────────────────────────────────

export function ScrollList(props: ScrollListProps) {
  let scrollRef: ScrollBoxRenderable | null = null
  let prevRow = -1

  createEffect(() => {
    const row = props.selectedRow
    const ref = scrollRef
    if (!ref) return

    const margin = props.scrollMargin ?? SCROLL_MARGIN

    // First render or large jump (tab switch, click, etc.) — absolute positioning
    if (prevRow < 0 || Math.abs(row - prevRow) > MAX_INCREMENTAL_DELTA) {
      ref.scrollTop = Math.max(0, row - margin)
      prevRow = row
      return
    }

    const delta = row - prevRow
    prevRow = row
    if (delta === 0) return

    // Incremental navigation (j/k): scroll by exact row delta — selection stays locked
    ref.scrollTop = Math.max(0, ref.scrollTop + delta)
  })

  return (
    <scrollbox
      ref={(el: ScrollBoxRenderable) => { scrollRef = el }}
      flexGrow={props.flexGrow}
    >
      {props.children}
    </scrollbox>
  )
}
