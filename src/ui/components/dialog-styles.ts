// src/ui/components/dialog-styles.ts
// Shared dialog styling config — ensures all modals have a consistent look

import { color } from "../../state/config.ts"

// ── Shared Constants ─────────────────────────────────────────

const BACKDROP_COLOR = "#000000"
const BACKDROP_OPACITY = 0.55
const PADDING_X = 2
const PADDING_Y = 1

// ── Dialog Config ────────────────────────────────────────────

/**
 * Returns the shared dialog configuration for style, backdrop, and padding.
 * Must be called inside a reactive context (during dialog.prompt / dialog.confirm).
 */
export function dialogConfig() {
  return {
    style: {
      backgroundColor: color("bg"),
      paddingX: PADDING_X,
      paddingY: PADDING_Y,
    },
    backdropColor: BACKDROP_COLOR,
    backdropOpacity: BACKDROP_OPACITY,
  }
}

// ── Wide Dialog Config ───────────────────────────────────────

/**
 * Explicit width dialog for two-panel layouts (commit modal, etc.).
 * Width is set directly in style to avoid relying on unknown size presets.
 * All content widths in commit-modal.tsx derive from COMMIT_DIALOG_WIDTH.
 */
export const COMMIT_DIALOG_WIDTH = 100

export function commitDialogConfig() {
  return {
    style: {
      backgroundColor: color("bg"),
      paddingX: PADDING_X,
      paddingY: PADDING_Y,
      width: COMMIT_DIALOG_WIDTH,
    },
    backdropColor: BACKDROP_COLOR,
    backdropOpacity: BACKDROP_OPACITY,
  }
}

// ── Dialog Content Width ─────────────────────────────────────

// Default dialog (size "medium") = 60 wide. paddingX (2 each side) = 56 inner.
export const DIALOG_CONTENT_WIDTH = 56

// Commit dialog: explicit width, derive inner from constant.
// 100 total - 2 paddingX left - 2 paddingX right = 96 inner.
export const COMMIT_DIALOG_INNER_WIDTH = COMMIT_DIALOG_WIDTH - (PADDING_X * 2)
