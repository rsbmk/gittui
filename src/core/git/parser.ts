// src/core/git/parser.ts
// Porcelain parsers for git CLI output

import type {
  DiffHunk,
  DiffLine,
  DiffLineType,
  FileDiff,
  FileStatus,
  GitBranch,
  GitCommit,
  GitFile,
  GitStash,
  GitStatus,
} from "./types"
import { DIFF_LINE_TYPE, FILE_STATUS } from "./types"

// ── Status Parser ─────────────────────────────────────────────

const STATUS_MAP: Record<string, FileStatus> = {
  M: FILE_STATUS.MODIFIED,
  A: FILE_STATUS.ADDED,
  D: FILE_STATUS.DELETED,
  R: FILE_STATUS.RENAMED,
  C: FILE_STATUS.COPIED,
  U: FILE_STATUS.UNMERGED,
}

/**
 * Parses output from `git status --porcelain=v2 --branch`
 *
 * Header lines start with `#`:
 *   # branch.head main
 *   # branch.upstream origin/main
 *   # branch.ab +2 -1
 *
 * Entry lines:
 *   1 XY sub mH mI mW hH hI path           (ordinary)
 *   2 XY sub mH mI mW hH hI xNN path\toldPath  (renamed/copied)
 *   ? path                                  (untracked)
 */
export function parseStatus(output: string): GitStatus {
  const result: GitStatus = {
    branch: "",
    ahead: 0,
    behind: 0,
    staged: [],
    unstaged: [],
    untracked: [],
  }

  const lines = output.split("\n")

  for (const line of lines) {
    if (line === "") continue

    // Branch headers
    if (line.startsWith("# ")) {
      parseBranchHeader(line, result)
      continue
    }

    // Untracked
    if (line.startsWith("? ")) {
      result.untracked.push({
        path: line.slice(2),
        status: FILE_STATUS.UNTRACKED,
        staged: false,
      })
      continue
    }

    // Ordinary tracked file: 1 XY ...
    if (line.startsWith("1 ")) {
      parseOrdinaryEntry(line, result)
      continue
    }

    // Renamed/copied file: 2 XY ...
    if (line.startsWith("2 ")) {
      parseRenamedEntry(line, result)
      continue
    }

    // Unmerged file: u XY ...
    if (line.startsWith("u ")) {
      parseUnmergedEntry(line, result)
      continue
    }
  }

  return result
}

function parseBranchHeader(line: string, result: GitStatus): void {
  if (line.startsWith("# branch.head ")) {
    result.branch = line.slice("# branch.head ".length)
  } else if (line.startsWith("# branch.upstream ")) {
    result.upstream = line.slice("# branch.upstream ".length)
  } else if (line.startsWith("# branch.ab ")) {
    const match = line.match(/\+(\d+) -(\d+)/)
    if (match) {
      result.ahead = parseInt(match[1]!, 10)
      result.behind = parseInt(match[2]!, 10)
    }
  }
}

function parseOrdinaryEntry(line: string, result: GitStatus): void {
  // Format: 1 XY sub mH mI mW hH hI path
  const parts = line.split(" ")
  const xy = parts[1]!
  const path = parts.slice(8).join(" ")
  const indexStatus = xy[0]!
  const worktreeStatus = xy[1]!

  if (indexStatus !== ".") {
    const status = STATUS_MAP[indexStatus]
    if (status) {
      result.staged.push({ path, status, staged: true })
    }
  }

  if (worktreeStatus !== ".") {
    const status = STATUS_MAP[worktreeStatus]
    if (status) {
      result.unstaged.push({ path, status, staged: false })
    }
  }
}

function parseRenamedEntry(line: string, result: GitStatus): void {
  // Format: 2 XY sub mH mI mW hH hI xNN path\toldPath
  const parts = line.split(" ")
  const xy = parts[1]!
  const indexStatus = xy[0]!
  const worktreeStatus = xy[1]!
  const rest = parts.slice(9).join(" ")
  const [path, oldPath] = rest.split("\t")

  if (indexStatus !== ".") {
    const status = indexStatus === "R" ? FILE_STATUS.RENAMED : (STATUS_MAP[indexStatus] ?? FILE_STATUS.MODIFIED)
    result.staged.push({ path: path!, status, staged: true, oldPath })
  }

  if (worktreeStatus !== ".") {
    const status = STATUS_MAP[worktreeStatus] ?? FILE_STATUS.MODIFIED
    result.unstaged.push({ path: path!, status, staged: false, oldPath })
  }
}

function parseUnmergedEntry(line: string, result: GitStatus): void {
  // Format: u XY sub m1 m2 m3 mW h1 h2 h3 path
  const parts = line.split(" ")
  const path = parts.slice(10).join(" ")

  result.unstaged.push({
    path,
    status: FILE_STATUS.UNMERGED,
    staged: false,
  })
}

// ── Diff Parser ───────────────────────────────────────────────

/**
 * Parses unified diff output from `git diff` or `git diff --cached`.
 *
 * Splits on `diff --git a/... b/...` boundaries.
 * Extracts file paths from `--- a/path` and `+++ b/path`.
 * Parses hunk headers: `@@ -oldStart,oldCount +newStart,newCount @@`
 */
export function parseDiff(output: string): FileDiff[] {
  if (!output.trim()) return []

  // Split on diff boundaries, keeping the delimiter
  const chunks = output.split(/(?=^diff --git )/m)
  const diffs: FileDiff[] = []

  for (const chunk of chunks) {
    if (!chunk.startsWith("diff --git ")) continue

    const diff = parseSingleDiff(chunk)
    if (diff) diffs.push(diff)
  }

  return diffs
}

function parseSingleDiff(raw: string): FileDiff | null {
  const lines = raw.split("\n")
  const firstLine = lines[0]!

  // Extract paths from "diff --git a/path b/path"
  const diffMatch = firstLine.match(/^diff --git a\/(.+) b\/(.+)$/)
  if (!diffMatch) return null

  const aPath = diffMatch[1]!
  const bPath = diffMatch[2]!

  // Detect binary
  const isBinary = lines.some(
    (l) => l.includes("Binary files") || l.includes("GIT binary patch")
  )

  if (isBinary) {
    return {
      path: bPath,
      oldPath: aPath !== bPath ? aPath : undefined,
      hunks: [],
      binary: true,
      raw,
    }
  }

  // Extract --- and +++ paths for rename detection
  let oldPath: string | undefined
  let filePath = bPath

  for (const line of lines) {
    if (line.startsWith("--- a/")) {
      const p = line.slice("--- a/".length)
      if (p !== bPath) oldPath = p
    } else if (line.startsWith("+++ b/")) {
      filePath = line.slice("+++ b/".length)
    } else if (line.startsWith("--- /dev/null")) {
      // New file, no old path
    } else if (line.startsWith("+++ /dev/null")) {
      // Deleted file
      filePath = aPath
    }
  }

  // Also handle rename detected from diff --git line
  if (aPath !== bPath && !oldPath) {
    oldPath = aPath
  }

  const hunks = parseHunks(lines)

  return {
    path: filePath,
    oldPath,
    hunks,
    binary: false,
    raw,
  }
}

function parseHunks(lines: string[]): DiffHunk[] {
  const hunks: DiffHunk[] = []
  let currentHunk: DiffHunk | null = null

  for (const line of lines) {
    // Hunk header: @@ -oldStart,oldCount +newStart,newCount @@
    const hunkMatch = line.match(
      /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/
    )

    if (hunkMatch) {
      currentHunk = {
        header: line,
        oldStart: parseInt(hunkMatch[1]!, 10),
        oldCount: parseInt(hunkMatch[2] ?? "1", 10),
        newStart: parseInt(hunkMatch[3]!, 10),
        newCount: parseInt(hunkMatch[4] ?? "1", 10),
        lines: [],
      }
      hunks.push(currentHunk)
      continue
    }

    if (!currentHunk) continue

    // Diff content lines
    if (line.startsWith("+")) {
      currentHunk.lines.push(makeDiffLine(DIFF_LINE_TYPE.ADD, line.slice(1), currentHunk))
    } else if (line.startsWith("-")) {
      currentHunk.lines.push(makeDiffLine(DIFF_LINE_TYPE.DELETE, line.slice(1), currentHunk))
    } else if (line.startsWith(" ")) {
      currentHunk.lines.push(makeDiffLine(DIFF_LINE_TYPE.CONTEXT, line.slice(1), currentHunk))
    }
    // Lines starting with \ (e.g. "\ No newline at end of file") are ignored
  }

  return hunks
}

function makeDiffLine(
  type: DiffLineType,
  content: string,
  hunk: DiffHunk
): DiffLine {
  // Calculate line numbers from existing lines in the hunk
  const existingLines = hunk.lines

  // Find the last old and new line numbers
  let oldLineNumber: number | undefined
  let newLineNumber: number | undefined

  if (existingLines.length === 0) {
    // First line in the hunk
    if (type === DIFF_LINE_TYPE.ADD) {
      newLineNumber = hunk.newStart
    } else if (type === DIFF_LINE_TYPE.DELETE) {
      oldLineNumber = hunk.oldStart
    } else {
      oldLineNumber = hunk.oldStart
      newLineNumber = hunk.newStart
    }
  } else {
    // Get next line numbers from previous lines
    const lastOld = findLastLineNumber(existingLines, "old")
    const lastNew = findLastLineNumber(existingLines, "new")

    if (type === DIFF_LINE_TYPE.ADD) {
      newLineNumber = (lastNew ?? hunk.newStart - 1) + 1
    } else if (type === DIFF_LINE_TYPE.DELETE) {
      oldLineNumber = (lastOld ?? hunk.oldStart - 1) + 1
    } else {
      oldLineNumber = (lastOld ?? hunk.oldStart - 1) + 1
      newLineNumber = (lastNew ?? hunk.newStart - 1) + 1
    }
  }

  return { type, content, oldLineNumber, newLineNumber }
}

function findLastLineNumber(
  lines: DiffLine[],
  side: "old" | "new"
): number | undefined {
  for (let i = lines.length - 1; i >= 0; i--) {
    const ln = side === "old" ? lines[i]!.oldLineNumber : lines[i]!.newLineNumber
    if (ln !== undefined) return ln
  }
  return undefined
}

// ── Log Parser ────────────────────────────────────────────────

/**
 * Parses output from:
 *   git log --format='%H%x00%h%x00%an%x00%ae%x00%aI%x00%ar%x00%s%x00%b%x00%D%x1e'
 *
 * Fields separated by NULL byte (\0), records by record separator (\x1e)
 */
export function parseLog(output: string): GitCommit[] {
  if (!output.trim()) return []

  const records = output.split("\x1e")
  const commits: GitCommit[] = []

  for (const record of records) {
    const trimmed = record.trim()
    if (!trimmed) continue

    const fields = trimmed.split("\0")
    if (fields.length < 7) continue

    const refs = (fields[8] ?? "")
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean)

    commits.push({
      hash: fields[0]!,
      shortHash: fields[1]!,
      author: fields[2]!,
      email: fields[3]!,
      date: fields[4]!,
      relativeDate: fields[5]!,
      message: fields[6]!,
      body: (fields[7] ?? "").trim(),
      refs,
    })
  }

  return commits
}

// ── Branch Parser ─────────────────────────────────────────────

/**
 * Parses output from:
 *   git branch -a --format='%(HEAD)%(refname:short)%00%(upstream:short)%00%(upstream:track,nobracket)%00%(objectname:short)'
 *
 * HEAD indicator is `*` for current branch, ` ` otherwise
 */
export function parseBranches(output: string): GitBranch[] {
  if (!output.trim()) return []

  const lines = output.split("\n")
  const branches: GitBranch[] = []

  for (const line of lines) {
    if (!line) continue

    const current = line[0] === "*"
    const rest = line.slice(1)
    const parts = rest.split("\0")

    if (parts.length < 4) continue

    const name = parts[0]!.trim()
    const upstream = parts[1]!.trim() || undefined
    const track = parts[2]!.trim()
    const lastCommit = parts[3]!.trim()

    const { ahead, behind } = parseTrack(track)

    // Remote branches have no upstream and typically follow "remote/branch" pattern.
    // Local branches with slashes (feature/auth) should NOT be flagged as remote.
    // A branch is remote if it has no upstream and no tracking info — remotes don't track.
    const isLikelyRemote = !upstream && !track && name.includes("/")
    const remote = isLikelyRemote ? name.split("/")[0] : undefined

    branches.push({
      name,
      current,
      remote,
      upstream,
      ahead,
      behind,
      lastCommit,
    })
  }

  return branches
}

function parseTrack(track: string): { ahead: number; behind: number } {
  let ahead = 0
  let behind = 0

  const aheadMatch = track.match(/ahead (\d+)/)
  if (aheadMatch) ahead = parseInt(aheadMatch[1]!, 10)

  const behindMatch = track.match(/behind (\d+)/)
  if (behindMatch) behind = parseInt(behindMatch[1]!, 10)

  return { ahead, behind }
}

// ── Stash Parser ──────────────────────────────────────────────

/**
 * Parses output from:
 *   git stash list --format='%gd%x00%gs%x00%aI'
 *
 * %gd = stash ref (stash@{0})
 * %gs = stash message
 * %aI = ISO date
 */
export function parseStash(output: string): GitStash[] {
  if (!output.trim()) return []

  const lines = output.split("\n")
  const stashes: GitStash[] = []

  for (const line of lines) {
    if (!line) continue

    const parts = line.split("\0")
    if (parts.length < 3) continue

    const ref = parts[0]!
    const message = parts[1]!
    const date = parts[2]!

    // Extract index from stash@{N}
    const indexMatch = ref.match(/stash@\{(\d+)\}/)
    const index = indexMatch ? parseInt(indexMatch[1]!, 10) : 0

    // Extract branch from message "On branchName: actual message"
    // or "WIP on branchName: hash message"
    const branchMatch = message.match(/(?:On|WIP on) ([^:]+):/)
    const branch = branchMatch ? branchMatch[1]! : ""

    stashes.push({ index, message, branch, date })
  }

  return stashes
}
