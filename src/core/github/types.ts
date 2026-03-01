// src/core/github/types.ts
// GitHub type definitions using const object + type extraction pattern

// ── PR State ──────────────────────────────────────────────────

export const PR_STATE = {
  OPEN: "open",
  CLOSED: "closed",
  MERGED: "merged",
} as const

export type PRState = (typeof PR_STATE)[keyof typeof PR_STATE]

// ── Review Decision ───────────────────────────────────────────

export const REVIEW_DECISION = {
  APPROVED: "APPROVED",
  CHANGES_REQUESTED: "CHANGES_REQUESTED",
  REVIEW_REQUIRED: "REVIEW_REQUIRED",
} as const

export type ReviewDecision = (typeof REVIEW_DECISION)[keyof typeof REVIEW_DECISION]

// ── Mergeable Status ──────────────────────────────────────────

export const MERGEABLE_STATUS = {
  MERGEABLE: "MERGEABLE",
  CONFLICTING: "CONFLICTING",
  UNKNOWN: "UNKNOWN",
} as const

export type MergeableStatus = (typeof MERGEABLE_STATUS)[keyof typeof MERGEABLE_STATUS]

// ── Review State ──────────────────────────────────────────────

export const REVIEW_STATE = {
  APPROVED: "APPROVED",
  CHANGES_REQUESTED: "CHANGES_REQUESTED",
  COMMENTED: "COMMENTED",
  PENDING: "PENDING",
} as const

export type ReviewState = (typeof REVIEW_STATE)[keyof typeof REVIEW_STATE]

// ── Review Event (for submitting) ─────────────────────────────

export const REVIEW_EVENT = {
  APPROVE: "APPROVE",
  REQUEST_CHANGES: "REQUEST_CHANGES",
  COMMENT: "COMMENT",
} as const

export type ReviewEvent = (typeof REVIEW_EVENT)[keyof typeof REVIEW_EVENT]

// ── Merge Method ──────────────────────────────────────────────

export const MERGE_METHOD = {
  SQUASH: "squash",
  MERGE: "merge",
  REBASE: "rebase",
} as const

export type MergeMethod = (typeof MERGE_METHOD)[keyof typeof MERGE_METHOD]

// ── PR File Status ────────────────────────────────────────────

export const PR_FILE_STATUS = {
  ADDED: "added",
  REMOVED: "removed",
  MODIFIED: "modified",
  RENAMED: "renamed",
} as const

export type PRFileStatus = (typeof PR_FILE_STATUS)[keyof typeof PR_FILE_STATUS]

// ── Comment Side ──────────────────────────────────────────────

export const COMMENT_SIDE = {
  LEFT: "LEFT",
  RIGHT: "RIGHT",
} as const

export type CommentSide = (typeof COMMENT_SIDE)[keyof typeof COMMENT_SIDE]

// ── Core Interfaces ───────────────────────────────────────────

export interface PullRequest {
  number: number
  title: string
  body: string
  state: PRState
  draft: boolean
  author: string
  branch: string
  baseBranch: string
  url: string
  createdAt: string
  updatedAt: string
  reviewDecision: ReviewDecision | null
  labels: string[]
  assignees: string[]
  reviewers: string[]
  additions: number
  deletions: number
  changedFiles: number
  mergeable: MergeableStatus
}

export interface PRReview {
  id: number
  author: string
  state: ReviewState
  body: string
  submittedAt: string
}

export interface PRComment {
  id: number
  author: string
  body: string
  path: string
  line: number
  side: CommentSide
  createdAt: string
  diffHunk: string
}

export interface PRFile {
  path: string
  status: PRFileStatus
  additions: number
  deletions: number
  patch: string
}
