// src/core/github/commands.ts
// GitHub CLI wrappers — all operations go through `gh` CLI with --json flags

import { exec } from "../../lib/shell.ts"
import { mapPR, mapReview, mapComment, mapFile } from "./parser.ts"
import type {
  PullRequest,
  PRReview,
  PRComment,
  PRFile,
  PRState,
  ReviewEvent,
  MergeMethod,
} from "./types.ts"

// ── JSON field lists ─────────────────────────────────────────

const PR_FIELDS = [
  "number", "title", "body", "state", "isDraft",
  "author", "headRefName", "baseRefName", "url",
  "createdAt", "updatedAt", "reviewDecision",
  "labels", "assignees", "reviewRequests",
  "additions", "deletions", "changedFiles", "mergeable",
].join(",")

const REVIEW_FIELDS = ["id", "author", "state", "body", "submittedAt"].join(",")

const COMMENT_FIELDS = [
  "id", "author", "body", "path", "line", "side",
  "createdAt", "diffHunk",
].join(",")

// ── Availability Check ───────────────────────────────────────

export async function isGhAvailable(): Promise<boolean> {
  try {
    const result = await exec(["gh", "auth", "status"], { timeout: 5_000 })
    return result.ok
  } catch {
    return false
  }
}

// ── PR List ──────────────────────────────────────────────────

export async function listPRs(state: PRState | "all" = "open"): Promise<PullRequest[]> {
  const args = ["gh", "pr", "list", "--json", PR_FIELDS]

  if (state !== "all") {
    args.push("--state", state)
  }

  const result = await exec(args)
  if (!result.ok) {
    throw new Error(`gh pr list failed: ${result.stderr}`)
  }

  const raw = JSON.parse(result.stdout) as Record<string, unknown>[]
  return raw.map(mapPR)
}

// ── PR Detail ────────────────────────────────────────────────

export async function getPRDetail(number: number): Promise<PullRequest> {
  const result = await exec([
    "gh", "pr", "view", String(number), "--json", PR_FIELDS,
  ])

  if (!result.ok) {
    throw new Error(`gh pr view failed: ${result.stderr}`)
  }

  const raw = JSON.parse(result.stdout) as Record<string, unknown>
  return mapPR(raw)
}

// ── PR Files ─────────────────────────────────────────────────

export async function getPRFiles(number: number): Promise<PRFile[]> {
  const result = await exec([
    "gh", "api",
    `repos/{owner}/{repo}/pulls/${number}/files`,
    "--paginate",
  ])

  if (!result.ok) {
    throw new Error(`gh api pr files failed: ${result.stderr}`)
  }

  const raw = JSON.parse(result.stdout) as Record<string, unknown>[]
  return raw.map(mapFile)
}

// ── PR Diff (raw) ────────────────────────────────────────────

export async function getPRDiff(number: number): Promise<string> {
  const result = await exec(["gh", "pr", "diff", String(number)])

  if (!result.ok) {
    throw new Error(`gh pr diff failed: ${result.stderr}`)
  }

  return result.stdout
}

// ── PR Reviews ───────────────────────────────────────────────

export async function getPRReviews(number: number): Promise<PRReview[]> {
  const result = await exec([
    "gh", "api",
    `repos/{owner}/{repo}/pulls/${number}/reviews`,
    "--paginate",
  ])

  if (!result.ok) {
    throw new Error(`gh api pr reviews failed: ${result.stderr}`)
  }

  const raw = JSON.parse(result.stdout) as Record<string, unknown>[]
  return raw.map(mapReview)
}

// ── PR Comments ──────────────────────────────────────────────

export async function getPRComments(number: number): Promise<PRComment[]> {
  const result = await exec([
    "gh", "api",
    `repos/{owner}/{repo}/pulls/${number}/comments`,
    "--paginate",
  ])

  if (!result.ok) {
    throw new Error(`gh api pr comments failed: ${result.stderr}`)
  }

  const raw = JSON.parse(result.stdout) as Record<string, unknown>[]
  return raw.map(mapComment)
}

// ── Create Review ────────────────────────────────────────────

export async function createReview(
  number: number,
  event: ReviewEvent,
  body: string,
): Promise<void> {
  const args = ["gh", "pr", "review", String(number)]

  switch (event) {
    case "APPROVE":
      args.push("--approve")
      break
    case "REQUEST_CHANGES":
      args.push("--request-changes")
      break
    case "COMMENT":
      args.push("--comment")
      break
  }

  if (body.trim()) {
    args.push("--body", body)
  }

  const result = await exec(args)
  if (!result.ok) {
    throw new Error(`gh pr review failed: ${result.stderr}`)
  }
}

// ── Add Comment ──────────────────────────────────────────────

export async function addComment(
  number: number,
  body: string,
  path: string,
  line: number,
): Promise<void> {
  // Use the REST API for inline comments (gh CLI doesn't support inline directly)
  const result = await exec([
    "gh", "api",
    `repos/{owner}/{repo}/pulls/${number}/comments`,
    "-f", `body=${body}`,
    "-f", `path=${path}`,
    "-F", `line=${line}`,
    "-f", "side=RIGHT",
    "-f", `commit_id=$(gh pr view ${number} --json headRefOid -q .headRefOid)`,
  ])

  if (!result.ok) {
    // Fallback: add a general comment (not inline)
    const fallback = await exec([
      "gh", "pr", "comment", String(number), "--body", body,
    ])
    if (!fallback.ok) {
      throw new Error(`gh pr comment failed: ${fallback.stderr}`)
    }
  }
}

// ── Merge PR ─────────────────────────────────────────────────

export async function mergePR(number: number, method: MergeMethod): Promise<void> {
  const args = ["gh", "pr", "merge", String(number)]

  switch (method) {
    case "squash":
      args.push("--squash")
      break
    case "merge":
      args.push("--merge")
      break
    case "rebase":
      args.push("--rebase")
      break
  }

  const result = await exec(args)
  if (!result.ok) {
    throw new Error(`gh pr merge failed: ${result.stderr}`)
  }
}

// ── Open in Browser ──────────────────────────────────────────

export async function openPRInBrowser(number: number): Promise<void> {
  const result = await exec(["gh", "pr", "view", String(number), "--web"])
  if (!result.ok) {
    throw new Error(`gh pr view --web failed: ${result.stderr}`)
  }
}
