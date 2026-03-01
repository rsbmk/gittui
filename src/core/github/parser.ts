// src/core/github/parser.ts
// Minimal mappers — gh CLI outputs JSON directly, we just normalize field names

import type {
  PullRequest,
  PRReview,
  PRComment,
  PRFile,
  PRState,
  ReviewDecision,
  MergeableStatus,
  ReviewState,
  PRFileStatus,
  CommentSide,
} from "./types.ts"

// ── PR Mapper ────────────────────────────────────────────────

export function mapPR(raw: Record<string, unknown>): PullRequest {
  const author = raw.author as Record<string, unknown> | undefined
  const labels = raw.labels as Array<Record<string, unknown>> | undefined
  const assignees = raw.assignees as Array<Record<string, unknown>> | undefined
  const reviewRequests = raw.reviewRequests as Array<Record<string, unknown>> | undefined

  return {
    number: raw.number as number,
    title: (raw.title as string) ?? "",
    body: (raw.body as string) ?? "",
    state: mapPRState(raw.state as string),
    draft: (raw.isDraft as boolean) ?? false,
    author: (author?.login as string) ?? "",
    branch: (raw.headRefName as string) ?? "",
    baseBranch: (raw.baseRefName as string) ?? "",
    url: (raw.url as string) ?? "",
    createdAt: (raw.createdAt as string) ?? "",
    updatedAt: (raw.updatedAt as string) ?? "",
    reviewDecision: mapReviewDecision(raw.reviewDecision as string | null),
    labels: labels?.map((l) => (l.name as string) ?? "") ?? [],
    assignees: assignees?.map((a) => (a.login as string) ?? "") ?? [],
    reviewers: reviewRequests?.map((r) => {
      // reviewRequests can contain users or teams
      const login = (r as Record<string, unknown>).login as string | undefined
      const name = (r as Record<string, unknown>).name as string | undefined
      return login ?? name ?? ""
    }) ?? [],
    additions: (raw.additions as number) ?? 0,
    deletions: (raw.deletions as number) ?? 0,
    changedFiles: (raw.changedFiles as number) ?? 0,
    mergeable: mapMergeable(raw.mergeable as string),
  }
}

// ── Review Mapper ────────────────────────────────────────────

export function mapReview(raw: Record<string, unknown>): PRReview {
  const author = raw.author as Record<string, unknown> | undefined

  return {
    id: (raw.id as number) ?? 0,
    author: (author?.login as string) ?? "",
    state: (raw.state as ReviewState) ?? "COMMENTED",
    body: (raw.body as string) ?? "",
    submittedAt: (raw.submittedAt as string) ?? "",
  }
}

// ── Comment Mapper ───────────────────────────────────────────

export function mapComment(raw: Record<string, unknown>): PRComment {
  const author = raw.author as Record<string, unknown> | undefined

  return {
    id: (raw.id as number) ?? 0,
    author: (author?.login as string) ?? "",
    body: (raw.body as string) ?? "",
    path: (raw.path as string) ?? "",
    line: (raw.line as number) ?? 0,
    side: ((raw.side as string) ?? "RIGHT") as CommentSide,
    createdAt: (raw.createdAt as string) ?? "",
    diffHunk: (raw.diffHunk as string) ?? "",
  }
}

// ── File Mapper ──────────────────────────────────────────────

export function mapFile(raw: Record<string, unknown>): PRFile {
  return {
    path: (raw.path as string) ?? (raw.filename as string) ?? "",
    status: mapFileStatus(raw.status as string),
    additions: (raw.additions as number) ?? 0,
    deletions: (raw.deletions as number) ?? 0,
    patch: (raw.patch as string) ?? "",
  }
}

// ── Internal Helpers ─────────────────────────────────────────

function mapPRState(state: string | undefined): PRState {
  switch (state?.toUpperCase()) {
    case "OPEN":
      return "open"
    case "CLOSED":
      return "closed"
    case "MERGED":
      return "merged"
    default:
      return "open"
  }
}

function mapReviewDecision(decision: string | null | undefined): ReviewDecision | null {
  if (!decision) return null
  switch (decision) {
    case "APPROVED":
    case "CHANGES_REQUESTED":
    case "REVIEW_REQUIRED":
      return decision
    default:
      return null
  }
}

function mapMergeable(mergeable: string | undefined): MergeableStatus {
  switch (mergeable) {
    case "MERGEABLE":
    case "CONFLICTING":
    case "UNKNOWN":
      return mergeable
    default:
      return "UNKNOWN"
  }
}

function mapFileStatus(status: string | undefined): PRFileStatus {
  switch (status) {
    case "added":
      return "added"
    case "removed":
      return "removed"
    case "modified":
      return "modified"
    case "renamed":
      return "renamed"
    default:
      return "modified"
  }
}
