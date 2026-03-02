// src/core/git/conflict-parser.ts
// Parser for git merge conflict markers in file content

// ── Types ─────────────────────────────────────────────────────

export interface ConflictRegion {
  /** Line number where <<<<<<< starts (1-indexed) */
  oursStart: number
  /** Line number where ======= divider is */
  divider: number
  /** Line number where >>>>>>> ends */
  theirsEnd: number
  /** Content from our side (HEAD) */
  oursContent: string[]
  /** Content from their side (incoming) */
  theirsContent: string[]
  /** Label from <<<<<<< marker (e.g. "HEAD") */
  oursLabel: string
  /** Label from >>>>>>> marker (e.g. "feature/rename") */
  theirsLabel: string
}

export interface ConflictFile {
  /** Original file content with conflict markers */
  rawContent: string
  /** All lines of the file */
  lines: string[]
  /** Parsed conflict regions */
  conflicts: ConflictRegion[]
  /** Total number of conflicts */
  conflictCount: number
}

// ── Constants ─────────────────────────────────────────────────

const CONFLICT_START = /^<{7}\s*(.*)$/
const CONFLICT_DIVIDER = /^={7}$/
const CONFLICT_END = /^>{7}\s*(.*)$/

// ── Parser ────────────────────────────────────────────────────

/**
 * Parses file content to extract conflict regions.
 * Returns a ConflictFile with all conflict regions identified.
 */
export function parseConflictMarkers(content: string): ConflictFile {
  const lines = content.split("\n")
  const conflicts: ConflictRegion[] = []

  let i = 0
  while (i < lines.length) {
    const startMatch = lines[i]!.match(CONFLICT_START)
    if (!startMatch) {
      i++
      continue
    }

    const oursStart = i + 1 // 1-indexed
    const oursLabel = startMatch[1]?.trim() ?? "HEAD"
    const oursContent: string[] = []

    // Collect "ours" content until =======
    i++
    while (i < lines.length && !CONFLICT_DIVIDER.test(lines[i]!)) {
      // Check for nested conflict or unexpected end
      if (CONFLICT_END.test(lines[i]!)) break
      oursContent.push(lines[i]!)
      i++
    }

    if (i >= lines.length || !CONFLICT_DIVIDER.test(lines[i]!)) {
      // Malformed conflict — skip
      continue
    }

    const divider = i + 1 // 1-indexed

    // Collect "theirs" content until >>>>>>>
    const theirsContent: string[] = []
    i++
    while (i < lines.length && !CONFLICT_END.test(lines[i]!)) {
      theirsContent.push(lines[i]!)
      i++
    }

    if (i >= lines.length) {
      // Malformed conflict — no closing marker
      continue
    }

    const endMatch = lines[i]!.match(CONFLICT_END)
    const theirsLabel = endMatch?.[1]?.trim() ?? "incoming"
    const theirsEnd = i + 1 // 1-indexed

    conflicts.push({
      oursStart,
      divider,
      theirsEnd,
      oursContent,
      theirsContent,
      oursLabel,
      theirsLabel,
    })

    i++
  }

  return {
    rawContent: content,
    lines,
    conflicts,
    conflictCount: conflicts.length,
  }
}

// ── Resolution ────────────────────────────────────────────────

export const RESOLVE_STRATEGY = {
  OURS: "ours",
  THEIRS: "theirs",
  BOTH: "both",
} as const

export type ResolveStrategy = (typeof RESOLVE_STRATEGY)[keyof typeof RESOLVE_STRATEGY]

/**
 * Resolves a single conflict region by replacing the markers with chosen content.
 * Returns a new file content string with the conflict resolved.
 */
export function resolveConflict(
  file: ConflictFile,
  conflictIndex: number,
  strategy: ResolveStrategy,
): string {
  const conflict = file.conflicts[conflictIndex]
  if (!conflict) return file.rawContent

  const lines = [...file.lines]

  // Determine replacement content based on strategy
  let replacement: string[]
  switch (strategy) {
    case RESOLVE_STRATEGY.OURS:
      replacement = conflict.oursContent
      break
    case RESOLVE_STRATEGY.THEIRS:
      replacement = conflict.theirsContent
      break
    case RESOLVE_STRATEGY.BOTH:
      replacement = [...conflict.oursContent, ...conflict.theirsContent]
      break
  }

  // Replace from oursStart-1 (0-indexed) through theirsEnd-1 (inclusive)
  const startIdx = conflict.oursStart - 1
  const endIdx = conflict.theirsEnd - 1
  const removeCount = endIdx - startIdx + 1

  lines.splice(startIdx, removeCount, ...replacement)

  return lines.join("\n")
}

/**
 * Checks if a file still has unresolved conflict markers.
 * Uses multiline flag so anchors match at line boundaries.
 */
export function hasConflictMarkers(content: string): boolean {
  const startPattern = /^<{7}\s/m
  const endPattern = /^>{7}\s/m
  return startPattern.test(content) || endPattern.test(content)
}
