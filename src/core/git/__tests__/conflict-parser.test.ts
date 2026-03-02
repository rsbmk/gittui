// src/core/git/__tests__/conflict-parser.test.ts
// Tests for git merge conflict marker parser

import { describe, expect, test } from "bun:test"

import {
  parseConflictMarkers,
  resolveConflict,
  hasConflictMarkers,
  RESOLVE_STRATEGY,
} from "../conflict-parser.ts"

// ── parseConflictMarkers ──────────────────────────────────────

describe("parseConflictMarkers", () => {
  test("parses single conflict with labels", () => {
    const content = [
      "line 1",
      "<<<<<<< HEAD",
      "our content",
      "=======",
      "their content",
      ">>>>>>> feature/branch",
      "line after",
    ].join("\n")

    const result = parseConflictMarkers(content)

    expect(result.conflictCount).toBe(1)
    expect(result.conflicts[0]).toEqual({
      oursStart: 2,
      divider: 4,
      theirsEnd: 6,
      oursContent: ["our content"],
      theirsContent: ["their content"],
      oursLabel: "HEAD",
      theirsLabel: "feature/branch",
    })
  })

  test("parses multi-line conflict content", () => {
    const content = [
      "<<<<<<< HEAD",
      "line 1 ours",
      "line 2 ours",
      "line 3 ours",
      "=======",
      "line 1 theirs",
      "line 2 theirs",
      ">>>>>>> develop",
    ].join("\n")

    const result = parseConflictMarkers(content)

    expect(result.conflictCount).toBe(1)
    expect(result.conflicts[0]!.oursContent).toEqual([
      "line 1 ours",
      "line 2 ours",
      "line 3 ours",
    ])
    expect(result.conflicts[0]!.theirsContent).toEqual([
      "line 1 theirs",
      "line 2 theirs",
    ])
  })

  test("parses multiple conflicts in same file", () => {
    const content = [
      "before",
      "<<<<<<< HEAD",
      "ours 1",
      "=======",
      "theirs 1",
      ">>>>>>> branch-a",
      "between",
      "<<<<<<< HEAD",
      "ours 2",
      "=======",
      "theirs 2",
      ">>>>>>> branch-a",
      "after",
    ].join("\n")

    const result = parseConflictMarkers(content)

    expect(result.conflictCount).toBe(2)
    expect(result.conflicts[0]!.oursContent).toEqual(["ours 1"])
    expect(result.conflicts[1]!.oursContent).toEqual(["ours 2"])
  })

  test("handles empty ours section", () => {
    const content = [
      "<<<<<<< HEAD",
      "=======",
      "their new content",
      ">>>>>>> branch",
    ].join("\n")

    const result = parseConflictMarkers(content)

    expect(result.conflictCount).toBe(1)
    expect(result.conflicts[0]!.oursContent).toEqual([])
    expect(result.conflicts[0]!.theirsContent).toEqual(["their new content"])
  })

  test("handles empty theirs section", () => {
    const content = [
      "<<<<<<< HEAD",
      "our existing content",
      "=======",
      ">>>>>>> branch",
    ].join("\n")

    const result = parseConflictMarkers(content)

    expect(result.conflictCount).toBe(1)
    expect(result.conflicts[0]!.oursContent).toEqual(["our existing content"])
    expect(result.conflicts[0]!.theirsContent).toEqual([])
  })

  test("handles both sections empty", () => {
    const content = [
      "<<<<<<< HEAD",
      "=======",
      ">>>>>>> branch",
    ].join("\n")

    const result = parseConflictMarkers(content)

    expect(result.conflictCount).toBe(1)
    expect(result.conflicts[0]!.oursContent).toEqual([])
    expect(result.conflicts[0]!.theirsContent).toEqual([])
  })

  test("returns zero conflicts for clean file", () => {
    const content = "line 1\nline 2\nline 3"

    const result = parseConflictMarkers(content)

    expect(result.conflictCount).toBe(0)
    expect(result.conflicts).toEqual([])
  })

  test("handles empty content", () => {
    const result = parseConflictMarkers("")

    expect(result.conflictCount).toBe(0)
    expect(result.lines).toEqual([""])
  })

  test("preserves labels without trailing whitespace", () => {
    const content = [
      "<<<<<<< HEAD  ",
      "content",
      "=======",
      "other",
      ">>>>>>> feature/my-branch  ",
    ].join("\n")

    const result = parseConflictMarkers(content)

    expect(result.conflicts[0]!.oursLabel).toBe("HEAD")
    expect(result.conflicts[0]!.theirsLabel).toBe("feature/my-branch")
  })

  test("skips malformed conflict without divider", () => {
    const content = [
      "<<<<<<< HEAD",
      "some content",
      ">>>>>>> branch",
      "normal line",
    ].join("\n")

    const result = parseConflictMarkers(content)

    // Should skip malformed conflict
    expect(result.conflictCount).toBe(0)
  })

  test("skips malformed conflict without end marker", () => {
    const content = [
      "<<<<<<< HEAD",
      "some content",
      "=======",
      "their content",
      "no end marker here",
    ].join("\n")

    const result = parseConflictMarkers(content)

    expect(result.conflictCount).toBe(0)
  })
})

// ── resolveConflict ───────────────────────────────────────────

describe("resolveConflict", () => {
  const baseContent = [
    "before",
    "<<<<<<< HEAD",
    "our line",
    "=======",
    "their line",
    ">>>>>>> branch",
    "after",
  ].join("\n")

  test("resolves with ours strategy", () => {
    const file = parseConflictMarkers(baseContent)
    const result = resolveConflict(file, 0, RESOLVE_STRATEGY.OURS)

    expect(result).toBe("before\nour line\nafter")
  })

  test("resolves with theirs strategy", () => {
    const file = parseConflictMarkers(baseContent)
    const result = resolveConflict(file, 0, RESOLVE_STRATEGY.THEIRS)

    expect(result).toBe("before\ntheir line\nafter")
  })

  test("resolves with both strategy", () => {
    const file = parseConflictMarkers(baseContent)
    const result = resolveConflict(file, 0, RESOLVE_STRATEGY.BOTH)

    expect(result).toBe("before\nour line\ntheir line\nafter")
  })

  test("resolves multi-line conflict with ours", () => {
    const content = [
      "top",
      "<<<<<<< HEAD",
      "line a",
      "line b",
      "=======",
      "line x",
      "line y",
      "line z",
      ">>>>>>> branch",
      "bottom",
    ].join("\n")

    const file = parseConflictMarkers(content)
    const result = resolveConflict(file, 0, RESOLVE_STRATEGY.OURS)

    expect(result).toBe("top\nline a\nline b\nbottom")
  })

  test("returns original content for invalid conflict index", () => {
    const file = parseConflictMarkers(baseContent)
    const result = resolveConflict(file, 99, RESOLVE_STRATEGY.OURS)

    expect(result).toBe(baseContent)
  })

  test("resolves empty ours section (deletion)", () => {
    const content = [
      "keep",
      "<<<<<<< HEAD",
      "=======",
      "their addition",
      ">>>>>>> branch",
      "also keep",
    ].join("\n")

    const file = parseConflictMarkers(content)
    const result = resolveConflict(file, 0, RESOLVE_STRATEGY.OURS)

    expect(result).toBe("keep\nalso keep")
  })
})

// ── hasConflictMarkers ────────────────────────────────────────

describe("hasConflictMarkers", () => {
  test("returns true for content with conflict markers", () => {
    const content = "<<<<<<< HEAD\nours\n=======\ntheirs\n>>>>>>> branch"
    expect(hasConflictMarkers(content)).toBe(true)
  })

  test("returns false for clean content", () => {
    expect(hasConflictMarkers("normal file content")).toBe(false)
  })

  test("returns true for partial markers (start only)", () => {
    expect(hasConflictMarkers("<<<<<<< HEAD\nsome content")).toBe(true)
  })

  test("returns true for partial markers (end only)", () => {
    expect(hasConflictMarkers("some content\n>>>>>>> branch")).toBe(true)
  })

  test("returns false for empty content", () => {
    expect(hasConflictMarkers("")).toBe(false)
  })
})
