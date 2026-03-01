// src/core/git/hunk-patch.ts
// Generate a git-apply compatible patch from a single hunk

import type { DiffHunk, DiffLine, FileDiff } from "./types.ts"
import { DIFF_LINE_TYPE } from "./types.ts"

/**
 * Build a minimal patch string for a single hunk that git apply --cached can consume.
 *
 * Format:
 *   diff --git a/{path} b/{path}
 *   --- a/{path}
 *   +++ b/{path}
 *   @@ -{oldStart},{oldCount} +{newStart},{newCount} @@
 *   <lines>
 */
export function buildHunkPatch(fileDiff: FileDiff, hunkIndex: number): string {
  const hunk = fileDiff.hunks[hunkIndex]
  if (!hunk) throw new Error(`Hunk at index ${hunkIndex} not found`)

  const path = fileDiff.path
  const oldPath = fileDiff.oldPath ?? path

  const lines: string[] = [
    `diff --git a/${oldPath} b/${path}`,
    `--- a/${oldPath}`,
    `+++ b/${path}`,
    hunk.header,
  ]

  for (const line of hunk.lines) {
    switch (line.type) {
      case DIFF_LINE_TYPE.ADD:
        lines.push(`+${line.content}`)
        break
      case DIFF_LINE_TYPE.DELETE:
        lines.push(`-${line.content}`)
        break
      case DIFF_LINE_TYPE.CONTEXT:
        lines.push(` ${line.content}`)
        break
    }
  }

  // Ensure trailing newline for git apply
  return lines.join("\n") + "\n"
}
