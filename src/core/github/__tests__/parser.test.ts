// src/core/github/__tests__/parser.test.ts

import { test, expect, describe } from "bun:test"
import { mapPR, mapReview, mapComment, mapFile } from "../parser.ts"

// ── mapPR ────────────────────────────────────────────────────

describe("mapPR", () => {
  test("maps complete PR JSON from gh CLI", () => {
    const raw = {
      number: 42,
      title: "feat: add user auth",
      body: "Implements OAuth2 login flow",
      state: "OPEN",
      isDraft: false,
      author: { login: "johndoe" },
      headRefName: "feat/user-auth",
      baseRefName: "main",
      url: "https://github.com/org/repo/pull/42",
      createdAt: "2026-02-27T10:00:00Z",
      updatedAt: "2026-02-27T12:00:00Z",
      reviewDecision: "REVIEW_REQUIRED",
      labels: [{ name: "feature" }, { name: "auth" }],
      assignees: [{ login: "johndoe" }],
      reviewRequests: [{ login: "janedoe" }],
      additions: 120,
      deletions: 45,
      changedFiles: 8,
      mergeable: "MERGEABLE",
    }

    const pr = mapPR(raw)

    expect(pr.number).toBe(42)
    expect(pr.title).toBe("feat: add user auth")
    expect(pr.body).toBe("Implements OAuth2 login flow")
    expect(pr.state).toBe("open")
    expect(pr.draft).toBe(false)
    expect(pr.author).toBe("johndoe")
    expect(pr.branch).toBe("feat/user-auth")
    expect(pr.baseBranch).toBe("main")
    expect(pr.url).toBe("https://github.com/org/repo/pull/42")
    expect(pr.createdAt).toBe("2026-02-27T10:00:00Z")
    expect(pr.updatedAt).toBe("2026-02-27T12:00:00Z")
    expect(pr.reviewDecision).toBe("REVIEW_REQUIRED")
    expect(pr.labels).toEqual(["feature", "auth"])
    expect(pr.assignees).toEqual(["johndoe"])
    expect(pr.reviewers).toEqual(["janedoe"])
    expect(pr.additions).toBe(120)
    expect(pr.deletions).toBe(45)
    expect(pr.changedFiles).toBe(8)
    expect(pr.mergeable).toBe("MERGEABLE")
  })

  test("handles draft PR", () => {
    const raw = {
      number: 41,
      title: "wip: refactor",
      state: "OPEN",
      isDraft: true,
      author: { login: "dev" },
      headRefName: "wip/refactor",
      baseRefName: "main",
    }

    const pr = mapPR(raw)
    expect(pr.draft).toBe(true)
    expect(pr.state).toBe("open")
  })

  test("handles merged PR", () => {
    const raw = {
      number: 40,
      title: "fix: typo",
      state: "MERGED",
      author: { login: "dev" },
    }

    const pr = mapPR(raw)
    expect(pr.state).toBe("merged")
  })

  test("handles closed PR", () => {
    const raw = {
      number: 39,
      title: "abandoned feature",
      state: "CLOSED",
      author: { login: "dev" },
    }

    const pr = mapPR(raw)
    expect(pr.state).toBe("closed")
  })

  test("handles missing optional fields gracefully", () => {
    const raw = {
      number: 38,
      title: "minimal PR",
      state: "OPEN",
    }

    const pr = mapPR(raw)
    expect(pr.number).toBe(38)
    expect(pr.author).toBe("")
    expect(pr.body).toBe("")
    expect(pr.branch).toBe("")
    expect(pr.baseBranch).toBe("")
    expect(pr.url).toBe("")
    expect(pr.reviewDecision).toBeNull()
    expect(pr.labels).toEqual([])
    expect(pr.assignees).toEqual([])
    expect(pr.reviewers).toEqual([])
    expect(pr.additions).toBe(0)
    expect(pr.deletions).toBe(0)
    expect(pr.changedFiles).toBe(0)
    expect(pr.mergeable).toBe("UNKNOWN")
    expect(pr.draft).toBe(false)
  })

  test("handles team reviewers (name instead of login)", () => {
    const raw = {
      number: 37,
      title: "team review",
      state: "OPEN",
      author: { login: "dev" },
      reviewRequests: [{ name: "backend-team" }, { login: "reviewer1" }],
    }

    const pr = mapPR(raw)
    expect(pr.reviewers).toEqual(["backend-team", "reviewer1"])
  })

  test("maps reviewDecision values correctly", () => {
    const approved = mapPR({ number: 1, state: "OPEN", reviewDecision: "APPROVED" })
    expect(approved.reviewDecision).toBe("APPROVED")

    const changes = mapPR({ number: 2, state: "OPEN", reviewDecision: "CHANGES_REQUESTED" })
    expect(changes.reviewDecision).toBe("CHANGES_REQUESTED")

    const none = mapPR({ number: 3, state: "OPEN", reviewDecision: null })
    expect(none.reviewDecision).toBeNull()

    const unknown = mapPR({ number: 4, state: "OPEN", reviewDecision: "GARBAGE" })
    expect(unknown.reviewDecision).toBeNull()
  })

  test("maps mergeable values correctly", () => {
    const mergeable = mapPR({ number: 1, state: "OPEN", mergeable: "MERGEABLE" })
    expect(mergeable.mergeable).toBe("MERGEABLE")

    const conflicting = mapPR({ number: 2, state: "OPEN", mergeable: "CONFLICTING" })
    expect(conflicting.mergeable).toBe("CONFLICTING")

    const unknown = mapPR({ number: 3, state: "OPEN", mergeable: "SOMETHING_ELSE" })
    expect(unknown.mergeable).toBe("UNKNOWN")
  })
})

// ── mapReview ────────────────────────────────────────────────

describe("mapReview", () => {
  test("maps complete review", () => {
    const raw = {
      id: 1234,
      author: { login: "reviewer" },
      state: "APPROVED",
      body: "LGTM!",
      submittedAt: "2026-02-27T14:00:00Z",
    }

    const review = mapReview(raw)
    expect(review.id).toBe(1234)
    expect(review.author).toBe("reviewer")
    expect(review.state).toBe("APPROVED")
    expect(review.body).toBe("LGTM!")
    expect(review.submittedAt).toBe("2026-02-27T14:00:00Z")
  })

  test("handles missing author", () => {
    const raw = {
      id: 5678,
      state: "COMMENTED",
      body: "Nice work",
    }

    const review = mapReview(raw)
    expect(review.author).toBe("")
  })

  test("defaults state to COMMENTED for unknown states", () => {
    const raw = { id: 9, state: "CHANGES_REQUESTED" }
    const review = mapReview(raw)
    expect(review.state).toBe("CHANGES_REQUESTED")
  })
})

// ── mapComment ───────────────────────────────────────────────

describe("mapComment", () => {
  test("maps complete inline comment", () => {
    const raw = {
      id: 999,
      author: { login: "reviewer" },
      body: "Use const here",
      path: "src/auth.ts",
      line: 42,
      side: "RIGHT",
      createdAt: "2026-02-27T15:00:00Z",
      diffHunk: "@@ -40,6 +40,8 @@\n context line\n+new line",
    }

    const comment = mapComment(raw)
    expect(comment.id).toBe(999)
    expect(comment.author).toBe("reviewer")
    expect(comment.body).toBe("Use const here")
    expect(comment.path).toBe("src/auth.ts")
    expect(comment.line).toBe(42)
    expect(comment.side).toBe("RIGHT")
    expect(comment.diffHunk).toContain("@@ -40,6 +40,8 @@")
  })

  test("defaults side to RIGHT when missing", () => {
    const raw = { id: 1, body: "comment" }
    const comment = mapComment(raw)
    expect(comment.side).toBe("RIGHT")
  })

  test("handles missing fields", () => {
    const raw = { id: 2 }
    const comment = mapComment(raw)
    expect(comment.author).toBe("")
    expect(comment.body).toBe("")
    expect(comment.path).toBe("")
    expect(comment.line).toBe(0)
  })
})

// ── mapFile ──────────────────────────────────────────────────

describe("mapFile", () => {
  test("maps file from REST API response", () => {
    const raw = {
      filename: "src/auth.ts",
      status: "modified",
      additions: 50,
      deletions: 2,
      patch: "@@ -1,5 +1,7 @@\n context\n+new line",
    }

    const file = mapFile(raw)
    expect(file.path).toBe("src/auth.ts")
    expect(file.status).toBe("modified")
    expect(file.additions).toBe(50)
    expect(file.deletions).toBe(2)
    expect(file.patch).toContain("@@ -1,5 +1,7 @@")
  })

  test("maps added file", () => {
    const raw = {
      filename: "src/new-file.ts",
      status: "added",
      additions: 120,
      deletions: 0,
    }

    const file = mapFile(raw)
    expect(file.status).toBe("added")
    expect(file.patch).toBe("")
  })

  test("maps removed file", () => {
    const raw = { filename: "src/old.ts", status: "removed" }
    const file = mapFile(raw)
    expect(file.status).toBe("removed")
  })

  test("maps renamed file", () => {
    const raw = { filename: "src/renamed.ts", status: "renamed" }
    const file = mapFile(raw)
    expect(file.status).toBe("renamed")
  })

  test("prefers path over filename", () => {
    const raw = { path: "src/from-path.ts", filename: "src/from-filename.ts", status: "modified" }
    const file = mapFile(raw)
    expect(file.path).toBe("src/from-path.ts")
  })

  test("defaults unknown status to modified", () => {
    const raw = { filename: "src/file.ts", status: "copied" }
    const file = mapFile(raw)
    expect(file.status).toBe("modified")
  })
})
