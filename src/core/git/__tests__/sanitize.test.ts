// src/core/git/__tests__/sanitize.test.ts
// Tests for branch name sanitization

import { describe, expect, test } from "bun:test"
import { sanitizeBranchName } from "../commands"

describe("sanitizeBranchName", () => {
  test("replaces spaces with hyphens", () => {
    expect(sanitizeBranchName("testig v2")).toBe("testig-v2")
  })

  test("replaces multiple spaces with single hyphen", () => {
    expect(sanitizeBranchName("my   new   branch")).toBe("my-new-branch")
  })

  test("trims whitespace", () => {
    expect(sanitizeBranchName("  feature  ")).toBe("feature")
  })

  test("replaces tabs and mixed whitespace", () => {
    expect(sanitizeBranchName("feat\tnew")).toBe("feat-new")
  })

  test("collapses consecutive dots to single", () => {
    expect(sanitizeBranchName("feat..test")).toBe("feat.test")
  })

  test("strips invalid git ref characters", () => {
    expect(sanitizeBranchName("feat~1")).toBe("feat1")
    expect(sanitizeBranchName("feat^2")).toBe("feat2")
    expect(sanitizeBranchName("feat:bar")).toBe("featbar")
    expect(sanitizeBranchName("feat?bar")).toBe("featbar")
    expect(sanitizeBranchName("feat*bar")).toBe("featbar")
    expect(sanitizeBranchName("feat[0]")).toBe("feat0")
    expect(sanitizeBranchName("feat\\bar")).toBe("featbar")
    expect(sanitizeBranchName("feat@{bar")).toBe("featbar")
  })

  test("strips leading dash, dot, or slash", () => {
    expect(sanitizeBranchName("-feature")).toBe("feature")
    expect(sanitizeBranchName(".feature")).toBe("feature")
    expect(sanitizeBranchName("/feature")).toBe("feature")
    expect(sanitizeBranchName("--feature")).toBe("feature")
    expect(sanitizeBranchName("..feature")).toBe("feature")
  })

  test("strips trailing .lock", () => {
    expect(sanitizeBranchName("feature.lock")).toBe("feature")
  })

  test("strips trailing dot or slash", () => {
    expect(sanitizeBranchName("feature.")).toBe("feature")
    expect(sanitizeBranchName("feature/")).toBe("feature")
  })

  test("collapses consecutive hyphens", () => {
    expect(sanitizeBranchName("feat--test")).toBe("feat-test")
    expect(sanitizeBranchName("a---b")).toBe("a-b")
  })

  test("collapses double slashes", () => {
    expect(sanitizeBranchName("feat//bar")).toBe("feat/bar")
  })

  test("preserves valid branch names unchanged", () => {
    expect(sanitizeBranchName("feature/add-auth")).toBe("feature/add-auth")
    expect(sanitizeBranchName("fix/bug-123")).toBe("fix/bug-123")
    expect(sanitizeBranchName("main")).toBe("main")
    expect(sanitizeBranchName("release/v1.0.0")).toBe("release/v1.0.0")
  })

  test("handles complex real-world cases", () => {
    expect(sanitizeBranchName("my new feature branch")).toBe("my-new-feature-branch")
    expect(sanitizeBranchName("feat: add login")).toBe("feat-add-login")
    expect(sanitizeBranchName("fix(auth): token [refresh]")).toBe("fix(auth)-token-refresh")
  })

  test("returns empty string for whitespace-only input", () => {
    expect(sanitizeBranchName("   ")).toBe("")
  })

  test("returns empty string for only invalid characters", () => {
    expect(sanitizeBranchName("~^:")).toBe("")
  })
})
