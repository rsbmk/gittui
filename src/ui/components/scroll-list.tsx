// src/ui/components/scroll-list.tsx
// Scrollable list with automatic scroll-follow — keeps the selected row visible

import { createEffect } from "solid-js"
import type { ScrollBoxRenderable } from "@opentui/core"
import type { JSX } from "solid-js"

// ── Constants ────────────────────────────────────────────────

const DEFAULT_OFFSET_FRACTION = 3

// ── Props ────────────────────────────────────────────────────

export interface ScrollListProps {
  selectedRow: number
  offsetFraction?: number
  flexGrow?: number
  children: JSX.Element
}

// ── Component ────────────────────────────────────────────────

export function ScrollList(props: ScrollListProps) {
  let scrollRef: ScrollBoxRenderable | null = null

  createEffect(() => {
    const row = props.selectedRow
    const ref = scrollRef
    if (!ref?.viewport) return

    const vh = ref.viewport.height
    if (vh <= 0) return

    // Always reposition: keep selected row at ~1/3 from top
    const offset = Math.floor(vh / (props.offsetFraction ?? DEFAULT_OFFSET_FRACTION))
    ref.scrollTo(Math.max(0, row - offset))
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
