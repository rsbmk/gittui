import { describe, expect, test } from "bun:test"

import {
  parseBranches,
  parseDiff,
  parseLog,
  parseStash,
  parseStatus,
} from "../parser"
import { DIFF_LINE_TYPE, FILE_STATUS } from "../types"

// ── parseStatus ───────────────────────────────────────────────

describe("parseStatus", () => {
  test("parses branch info with upstream and ahead/behind", () => {
    const output = [
      "# branch.oid abc123def456",
      "# branch.head main",
      "# branch.upstream origin/main",
      "# branch.ab +2 -1",
    ].join("\n")

    const status = parseStatus(output)

    expect(status.branch).toBe("main")
    expect(status.upstream).toBe("origin/main")
    expect(status.ahead).toBe(2)
    expect(status.behind).toBe(1)
  })

  test("parses mixed staged, unstaged, and untracked files", () => {
    const output = [
      "# branch.oid abc123def456",
      "# branch.head feature/auth",
      "# branch.ab +0 -0",
      "1 M. N... 100644 100644 100644 abc123 def456 src/app.ts",
      "1 .M N... 100644 100644 100644 abc123 def456 src/lib.ts",
      "1 A. N... 100644 100644 100644 abc123 def456 src/new.ts",
      "1 .D N... 100644 100644 100644 abc123 def456 src/old.ts",
      "? src/untracked.ts",
      "? docs/readme.md",
    ].join("\n")

    const status = parseStatus(output)

    expect(status.branch).toBe("feature/auth")
    expect(status.staged).toHaveLength(2)
    expect(status.unstaged).toHaveLength(2)
    expect(status.untracked).toHaveLength(2)

    // Staged files
    expect(status.staged[0]).toEqual({
      path: "src/app.ts",
      status: FILE_STATUS.MODIFIED,
      staged: true,
    })
    expect(status.staged[1]).toEqual({
      path: "src/new.ts",
      status: FILE_STATUS.ADDED,
      staged: true,
    })

    // Unstaged files
    expect(status.unstaged[0]).toEqual({
      path: "src/lib.ts",
      status: FILE_STATUS.MODIFIED,
      staged: false,
    })
    expect(status.unstaged[1]).toEqual({
      path: "src/old.ts",
      status: FILE_STATUS.DELETED,
      staged: false,
    })

    // Untracked files
    expect(status.untracked[0]).toEqual({
      path: "src/untracked.ts",
      status: FILE_STATUS.UNTRACKED,
      staged: false,
    })
  })

  test("parses empty status (clean working tree)", () => {
    const output = [
      "# branch.oid abc123def456",
      "# branch.head main",
      "# branch.upstream origin/main",
      "# branch.ab +0 -0",
    ].join("\n")

    const status = parseStatus(output)

    expect(status.branch).toBe("main")
    expect(status.staged).toHaveLength(0)
    expect(status.unstaged).toHaveLength(0)
    expect(status.untracked).toHaveLength(0)
  })

  test("parses file with changes in both index and worktree (MM)", () => {
    const output = [
      "# branch.oid abc123",
      "# branch.head main",
      "1 MM N... 100644 100644 100644 abc123 def456 src/both.ts",
    ].join("\n")

    const status = parseStatus(output)

    expect(status.staged).toHaveLength(1)
    expect(status.unstaged).toHaveLength(1)

    expect(status.staged[0]!.path).toBe("src/both.ts")
    expect(status.staged[0]!.status).toBe(FILE_STATUS.MODIFIED)
    expect(status.staged[0]!.staged).toBe(true)

    expect(status.unstaged[0]!.path).toBe("src/both.ts")
    expect(status.unstaged[0]!.status).toBe(FILE_STATUS.MODIFIED)
    expect(status.unstaged[0]!.staged).toBe(false)
  })

  test("parses renamed file (porcelain v2 type 2)", () => {
    const output = [
      "# branch.oid abc123",
      "# branch.head main",
      "2 R. N... 100644 100644 100644 abc123 def456 R100 src/new-name.ts\tsrc/old-name.ts",
    ].join("\n")

    const status = parseStatus(output)

    expect(status.staged).toHaveLength(1)
    expect(status.staged[0]!.path).toBe("src/new-name.ts")
    expect(status.staged[0]!.status).toBe(FILE_STATUS.RENAMED)
    expect(status.staged[0]!.oldPath).toBe("src/old-name.ts")
  })

  test("parses status without upstream", () => {
    const output = [
      "# branch.oid abc123",
      "# branch.head new-branch",
    ].join("\n")

    const status = parseStatus(output)

    expect(status.branch).toBe("new-branch")
    expect(status.upstream).toBeUndefined()
    expect(status.ahead).toBe(0)
    expect(status.behind).toBe(0)
  })
})

// ── parseDiff ─────────────────────────────────────────────────

describe("parseDiff", () => {
  test("parses single file diff with one hunk", () => {
    const output = `diff --git a/src/app.ts b/src/app.ts
index abc1234..def5678 100644
--- a/src/app.ts
+++ b/src/app.ts
@@ -10,6 +10,8 @@
 import { foo } from './foo'
+import { bar } from './bar'
+import { baz } from './baz'
 const x = 1
-const y = 2
 const z = 3`

    const diffs = parseDiff(output)

    expect(diffs).toHaveLength(1)
    const diff = diffs[0]!

    expect(diff.path).toBe("src/app.ts")
    expect(diff.oldPath).toBeUndefined()
    expect(diff.binary).toBe(false)
    expect(diff.hunks).toHaveLength(1)

    const hunk = diff.hunks[0]!
    expect(hunk.oldStart).toBe(10)
    expect(hunk.oldCount).toBe(6)
    expect(hunk.newStart).toBe(10)
    expect(hunk.newCount).toBe(8)

    expect(hunk.lines).toHaveLength(6)

    // Context line
    expect(hunk.lines[0]!.type).toBe(DIFF_LINE_TYPE.CONTEXT)
    expect(hunk.lines[0]!.content).toBe("import { foo } from './foo'")
    expect(hunk.lines[0]!.oldLineNumber).toBe(10)
    expect(hunk.lines[0]!.newLineNumber).toBe(10)

    // Added lines
    expect(hunk.lines[1]!.type).toBe(DIFF_LINE_TYPE.ADD)
    expect(hunk.lines[1]!.content).toBe("import { bar } from './bar'")
    expect(hunk.lines[1]!.newLineNumber).toBe(11)
    expect(hunk.lines[1]!.oldLineNumber).toBeUndefined()

    expect(hunk.lines[2]!.type).toBe(DIFF_LINE_TYPE.ADD)
    expect(hunk.lines[2]!.content).toBe("import { baz } from './baz'")
    expect(hunk.lines[2]!.newLineNumber).toBe(12)

    // Context line after additions
    expect(hunk.lines[3]!.type).toBe(DIFF_LINE_TYPE.CONTEXT)
    expect(hunk.lines[3]!.content).toBe("const x = 1")
    expect(hunk.lines[3]!.oldLineNumber).toBe(11)
    expect(hunk.lines[3]!.newLineNumber).toBe(13)

    // Deleted line
    expect(hunk.lines[4]!.type).toBe(DIFF_LINE_TYPE.DELETE)
    expect(hunk.lines[4]!.content).toBe("const y = 2")
    expect(hunk.lines[4]!.oldLineNumber).toBe(12)
    expect(hunk.lines[4]!.newLineNumber).toBeUndefined()

    // Final context line
    expect(hunk.lines[5]!.type).toBe(DIFF_LINE_TYPE.CONTEXT)
    expect(hunk.lines[5]!.content).toBe("const z = 3")
    expect(hunk.lines[5]!.oldLineNumber).toBe(13)
    expect(hunk.lines[5]!.newLineNumber).toBe(14)
  })

  test("parses multi-file diff with multiple hunks", () => {
    const output = `diff --git a/src/app.ts b/src/app.ts
index abc1234..def5678 100644
--- a/src/app.ts
+++ b/src/app.ts
@@ -1,3 +1,4 @@
 line1
+added
 line2
 line3
@@ -20,3 +21,3 @@
 old context
-removed line
+replacement line
 more context
diff --git a/src/lib.ts b/src/lib.ts
index 111..222 100644
--- a/src/lib.ts
+++ b/src/lib.ts
@@ -5,3 +5,4 @@
 existing
+new line in lib
 trailing`

    const diffs = parseDiff(output)

    expect(diffs).toHaveLength(2)

    // First file - two hunks
    expect(diffs[0]!.path).toBe("src/app.ts")
    expect(diffs[0]!.hunks).toHaveLength(2)
    expect(diffs[0]!.hunks[0]!.oldStart).toBe(1)
    expect(diffs[0]!.hunks[1]!.oldStart).toBe(20)

    // Second file - one hunk
    expect(diffs[1]!.path).toBe("src/lib.ts")
    expect(diffs[1]!.hunks).toHaveLength(1)
    expect(diffs[1]!.hunks[0]!.newStart).toBe(5)
  })

  test("detects binary files", () => {
    const output = `diff --git a/logo.png b/logo.png
index abc1234..def5678 100644
Binary files a/logo.png and b/logo.png differ`

    const diffs = parseDiff(output)

    expect(diffs).toHaveLength(1)
    expect(diffs[0]!.path).toBe("logo.png")
    expect(diffs[0]!.binary).toBe(true)
    expect(diffs[0]!.hunks).toHaveLength(0)
  })

  test("detects GIT binary patch", () => {
    const output = `diff --git a/font.woff2 b/font.woff2
index abc1234..def5678 100644
GIT binary patch
literal 12345
zcmZ`

    const diffs = parseDiff(output)

    expect(diffs).toHaveLength(1)
    expect(diffs[0]!.binary).toBe(true)
  })

  test("handles rename detection (different a/ and b/ paths)", () => {
    const output = `diff --git a/src/old-name.ts b/src/new-name.ts
similarity index 95%
rename from src/old-name.ts
rename to src/new-name.ts
index abc1234..def5678 100644
--- a/src/old-name.ts
+++ b/src/new-name.ts
@@ -1,3 +1,3 @@
 const x = 1
-const y = 2
+const y = 3
 const z = 4`

    const diffs = parseDiff(output)

    expect(diffs).toHaveLength(1)
    expect(diffs[0]!.path).toBe("src/new-name.ts")
    expect(diffs[0]!.oldPath).toBe("src/old-name.ts")
    expect(diffs[0]!.binary).toBe(false)
  })

  test("handles empty diff output", () => {
    expect(parseDiff("")).toEqual([])
    expect(parseDiff("  \n  ")).toEqual([])
  })

  test("stores raw diff string in each FileDiff", () => {
    const output = `diff --git a/src/app.ts b/src/app.ts
index abc..def 100644
--- a/src/app.ts
+++ b/src/app.ts
@@ -1,2 +1,2 @@
-old
+new`

    const diffs = parseDiff(output)

    expect(diffs[0]!.raw).toContain("diff --git")
    expect(diffs[0]!.raw).toContain("-old")
    expect(diffs[0]!.raw).toContain("+new")
  })
})

// ── parseLog ──────────────────────────────────────────────────

// Helper: build a log record with NULL-separated fields + record separator
function logRecord(...fields: string[]): string {
  return fields.join("\x00") + "\x1e"
}

describe("parseLog", () => {
  test("parses multiple commits with all fields", () => {
    const output = [
      logRecord(
        "abc123def456789", "abc123d", "John Doe", "john@example.com",
        "2026-02-27T10:30:00+00:00", "2 hours ago", "feat: add auth",
        "", "HEAD -> main, origin/main"
      ),
      logRecord(
        "def456abc789012", "def456a", "Jane Smith", "jane@example.com",
        "2026-02-26T15:00:00+00:00", "yesterday", "fix: typo in docs",
        "", ""
      ),
    ].join("")

    const commits = parseLog(output)

    expect(commits).toHaveLength(2)

    expect(commits[0]).toEqual({
      hash: "abc123def456789",
      shortHash: "abc123d",
      author: "John Doe",
      email: "john@example.com",
      date: "2026-02-27T10:30:00+00:00",
      relativeDate: "2 hours ago",
      message: "feat: add auth",
      body: "",
      refs: ["HEAD -> main", "origin/main"],
    })

    expect(commits[1]).toEqual({
      hash: "def456abc789012",
      shortHash: "def456a",
      author: "Jane Smith",
      email: "jane@example.com",
      date: "2026-02-26T15:00:00+00:00",
      relativeDate: "yesterday",
      message: "fix: typo in docs",
      body: "",
      refs: [],
    })
  })

  test("parses commit with multi-line body", () => {
    const body = "This commit adds OAuth2 login support.\n\nIt includes:\n- Google provider\n- GitHub provider\n- Session management"
    const output = logRecord(
      "abc123", "abc1", "John Doe", "john@example.com",
      "2026-02-27T10:30:00+00:00", "2 hours ago", "feat: add auth",
      body, "HEAD -> main"
    )

    const commits = parseLog(output)

    expect(commits).toHaveLength(1)
    expect(commits[0]!.body).toBe(body)
  })

  test("parses commit with ref decorations (branches and tags)", () => {
    const output = logRecord(
      "abc123", "abc1", "John", "john@test.com",
      "2026-01-01T00:00:00Z", "1 month ago", "release 1.0",
      "", "tag: v1.0.0, main, origin/main"
    )

    const commits = parseLog(output)

    expect(commits[0]!.refs).toEqual(["tag: v1.0.0", "main", "origin/main"])
  })

  test("handles empty log output", () => {
    expect(parseLog("")).toEqual([])
    expect(parseLog("  \n  ")).toEqual([])
  })

  test("empty body results in empty string, not undefined", () => {
    const output = logRecord(
      "abc123", "abc1", "John", "john@test.com",
      "2026-01-01T00:00:00Z", "now", "msg", "", ""
    )

    const commits = parseLog(output)

    expect(commits[0]!.body).toBe("")
    expect(typeof commits[0]!.body).toBe("string")
  })
})

// ── parseBranches ─────────────────────────────────────────────

describe("parseBranches", () => {
  test("parses mix of local and remote branches", () => {
    const NUL = "\x00"
    const output = [
      `*main${NUL}origin/main${NUL}ahead 2, behind 1${NUL}abc1234`,
      ` feature/auth${NUL}origin/feature/auth${NUL}ahead 3${NUL}def5678`,
      ` origin/develop${NUL}${NUL}${NUL}ghi9012`,
    ].join("\n")

    const branches = parseBranches(output)

    expect(branches).toHaveLength(3)

    // Current branch with upstream tracking
    expect(branches[0]).toEqual({
      name: "main",
      current: true,
      remote: undefined,
      upstream: "origin/main",
      ahead: 2,
      behind: 1,
      lastCommit: "abc1234",
    })

    // Non-current branch with ahead only
    expect(branches[1]).toEqual({
      name: "feature/auth",
      current: false,
      remote: undefined,
      upstream: "origin/feature/auth",
      ahead: 3,
      behind: 0,
      lastCommit: "def5678",
    })

    // Remote branch (has slash in name)
    expect(branches[2]).toEqual({
      name: "origin/develop",
      current: false,
      remote: "origin",
      upstream: undefined,
      ahead: 0,
      behind: 0,
      lastCommit: "ghi9012",
    })
  })

  test("parses current branch indicator", () => {
    const output = [
      " develop\0\0\0abc1234",
      "*main\0origin/main\0\0def5678",
      " hotfix\0\0\0ghi9012",
    ].join("\n")

    const branches = parseBranches(output)

    expect(branches[0]!.current).toBe(false)
    expect(branches[1]!.current).toBe(true)
    expect(branches[2]!.current).toBe(false)
  })

  test("parses branches with behind only tracking", () => {
    const output = " stale-branch\0origin/stale-branch\0behind 5\0abc1234"

    const branches = parseBranches(output)

    expect(branches[0]!.ahead).toBe(0)
    expect(branches[0]!.behind).toBe(5)
  })

  test("handles empty branches output", () => {
    expect(parseBranches("")).toEqual([])
    expect(parseBranches("  \n  ")).toEqual([])
  })
})

// ── parseStash ────────────────────────────────────────────────

// Helper: build a stash line with NULL-separated fields
function stashLine(ref: string, message: string, date: string): string {
  return [ref, message, date].join("\x00")
}

describe("parseStash", () => {
  test("parses multiple stash entries", () => {
    const output = [
      stashLine("stash@{0}", "On main: WIP saving progress", "2026-02-27T10:30:00+00:00"),
      stashLine("stash@{1}", "WIP on feature/auth: abc1234 initial commit", "2026-02-26T15:00:00+00:00"),
      stashLine("stash@{2}", "On develop: fix styling", "2026-02-25T09:00:00+00:00"),
    ].join("\n")

    const stashes = parseStash(output)

    expect(stashes).toHaveLength(3)

    expect(stashes[0]).toEqual({
      index: 0,
      message: "On main: WIP saving progress",
      branch: "main",
      date: "2026-02-27T10:30:00+00:00",
    })

    expect(stashes[1]).toEqual({
      index: 1,
      message: "WIP on feature/auth: abc1234 initial commit",
      branch: "feature/auth",
      date: "2026-02-26T15:00:00+00:00",
    })

    expect(stashes[2]).toEqual({
      index: 2,
      message: "On develop: fix styling",
      branch: "develop",
      date: "2026-02-25T09:00:00+00:00",
    })
  })

  test("handles empty stash list", () => {
    expect(parseStash("")).toEqual([])
    expect(parseStash("  \n  ")).toEqual([])
  })

  test("extracts correct index from stash ref", () => {
    const output = stashLine("stash@{42}", "On main: some stash", "2026-01-01T00:00:00Z")

    const stashes = parseStash(output)

    expect(stashes[0]!.index).toBe(42)
  })
})
