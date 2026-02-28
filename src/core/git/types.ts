// src/core/git/types.ts
// Git type definitions using const object + type extraction pattern

// ── Status Enums ──────────────────────────────────────────────

export const FILE_STATUS = {
  MODIFIED: "M",
  ADDED: "A",
  DELETED: "D",
  RENAMED: "R",
  COPIED: "C",
  UNMERGED: "U",
  UNTRACKED: "?",
} as const

export type FileStatus = (typeof FILE_STATUS)[keyof typeof FILE_STATUS]

// ── Diff Line Type ────────────────────────────────────────────

export const DIFF_LINE_TYPE = {
  ADD: "add",
  DELETE: "delete",
  CONTEXT: "context",
} as const

export type DiffLineType = (typeof DIFF_LINE_TYPE)[keyof typeof DIFF_LINE_TYPE]

// ── Core Interfaces ───────────────────────────────────────────

export interface GitFile {
  path: string
  status: FileStatus
  staged: boolean
  oldPath?: string
}

export interface GitStatus {
  branch: string
  upstream?: string
  ahead: number
  behind: number
  staged: GitFile[]
  unstaged: GitFile[]
  untracked: GitFile[]
}

export interface GitCommit {
  hash: string
  shortHash: string
  author: string
  email: string
  date: string
  relativeDate: string
  message: string
  body: string
  refs: string[]
}

export interface GitBranch {
  name: string
  current: boolean
  remote?: string
  upstream?: string
  ahead: number
  behind: number
  lastCommit: string
}

export interface GitStash {
  index: number
  message: string
  branch: string
  date: string
}

// ── Diff Interfaces ───────────────────────────────────────────

export interface DiffLine {
  type: DiffLineType
  content: string
  oldLineNumber?: number
  newLineNumber?: number
}

export interface DiffHunk {
  header: string
  oldStart: number
  oldCount: number
  newStart: number
  newCount: number
  lines: DiffLine[]
}

export interface FileDiff {
  path: string
  oldPath?: string
  hunks: DiffHunk[]
  binary: boolean
  raw: string
}
