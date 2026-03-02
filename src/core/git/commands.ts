// src/core/git/commands.ts
// Typed async wrappers around git CLI commands

import { exec } from "../../lib/shell.ts"
import { parseBranches, parseCommitFiles, parseCommitStats, parseDiff, parseLog, parseMergeState, parseStash, parseStatus } from "./parser.ts"
import type { CommitStats, FileDiff, GitBranch, GitCommit, GitFile, GitStash, GitStatus, MergeState } from "./types.ts"
import { FILE_STATUS, MERGE_STATE } from "./types.ts"

// ── Error ─────────────────────────────────────────────────────

export class GitCommandError extends Error {
  readonly command: string
  readonly stderr: string

  constructor(command: string, stderr: string) {
    super(`git ${command} failed: ${stderr.trim()}`)
    this.name = "GitCommandError"
    this.command = command
    this.stderr = stderr.trim()
  }
}

// ── Helpers ───────────────────────────────────────────────────

async function run(args: string[], cwd?: string): Promise<string> {
  const result = await exec(["git", ...args], { cwd })

  if (!result.ok) {
    throw new GitCommandError(args[0] ?? "unknown", result.stderr)
  }

  return result.stdout
}

// ── Queries ───────────────────────────────────────────────────

export async function getStatus(cwd?: string): Promise<GitStatus> {
  const stdout = await run(["status", "--porcelain=v2", "--branch", "-uall"], cwd)
  return parseStatus(stdout)
}

export async function getDiff(opts?: {
  path?: string
  staged?: boolean
  contextLines?: number
  cwd?: string
}): Promise<FileDiff[]> {
  const args = ["diff"]

  if (opts?.contextLines !== undefined) args.push(`-U${opts.contextLines}`)
  if (opts?.staged) args.push("--cached")
  if (opts?.path) args.push("--", opts.path)

  const stdout = await run(args, opts?.cwd)
  return parseDiff(stdout)
}

export async function getLog(opts?: {
  limit?: number
  author?: string
  grep?: string
  path?: string
  cwd?: string
}): Promise<GitCommit[]> {
  const limit = opts?.limit ?? 50

  const args = [
    "log",
    `--format=%H%x00%h%x00%an%x00%ae%x00%aI%x00%ar%x00%s%x00%b%x00%D%x1e`,
    `-n`,
    String(limit),
  ]

  if (opts?.author) args.push(`--author=${opts.author}`)
  if (opts?.grep) args.push(`--grep=${opts.grep}`)
  if (opts?.path) args.push("--", opts.path)

  const stdout = await run(args, opts?.cwd)
  return parseLog(stdout)
}

export async function getBranches(cwd?: string): Promise<GitBranch[]> {
  const stdout = await run(
    [
      "branch",
      "-a",
      `--format=%(HEAD)%(refname:short)%00%(upstream:short)%00%(upstream:track,nobracket)%00%(objectname:short)`,
    ],
    cwd,
  )
  return parseBranches(stdout)
}

export async function getStashList(cwd?: string): Promise<GitStash[]> {
  const result = await exec(["git", "stash", "list", `--format=%gd%x00%gs%x00%aI`], { cwd })

  // stash list returns exit 0 even when empty — no need to throw on !ok for empty repos
  if (!result.ok) {
    throw new GitCommandError("stash list", result.stderr)
  }

  return parseStash(result.stdout)
}

export async function getUntrackedDiff(path: string, opts?: {
  contextLines?: number
  cwd?: string
}): Promise<FileDiff[]> {
  const args = ["diff", "--no-index"]

  if (opts?.contextLines !== undefined) args.push(`-U${opts.contextLines}`)
  args.push("--", "/dev/null", path)

  // git diff --no-index exits with 1 when differences exist (always for untracked)
  const result = await exec(["git", ...args], { cwd: opts?.cwd })
  if (result.exitCode > 1) {
    throw new GitCommandError("diff --no-index", result.stderr)
  }

  const diffs = parseDiff(result.stdout)
  // Clean up /dev/null artifact — parser extracts "dev/null" as oldPath
  for (const d of diffs) {
    if (d.oldPath === "dev/null") d.oldPath = undefined
  }
  return diffs
}

export async function getRawDiff(opts?: { staged?: boolean; path?: string; cwd?: string }): Promise<string> {
  const args = ["diff"]
  if (opts?.staged) args.push("--cached")
  if (opts?.path) args.push("--", opts.path)
  return run(args, opts?.cwd)
}

// ── Mutations ─────────────────────────────────────────────────

export async function stageFile(path: string, cwd?: string): Promise<void> {
  await run(["add", "--", path], cwd)
}

export async function unstageFile(path: string, cwd?: string): Promise<void> {
  await run(["restore", "--staged", "--", path], cwd)
}

export async function stageAll(cwd?: string): Promise<void> {
  await run(["add", "-A"], cwd)
}

export async function discardFile(path: string, cwd?: string): Promise<void> {
  await run(["checkout", "--", path], cwd)
}

export async function commit(message: string, cwd?: string): Promise<string> {
  const stdout = await run(["commit", "-m", message], cwd)

  // Parse commit hash from output like: "[main abc1234] commit message"
  const match = stdout.match(/\[.+ ([0-9a-f]+)\]/)
  return match?.[1] ?? ""
}

export async function checkout(branch: string, cwd?: string): Promise<void> {
  await run(["checkout", branch], cwd)
}

export async function createBranch(name: string, from?: string, cwd?: string): Promise<void> {
  const args = ["checkout", "-b", name]
  if (from) args.push(from)
  await run(args, cwd)
}

export async function deleteBranch(name: string, force?: boolean, cwd?: string): Promise<void> {
  await run(["branch", force ? "-D" : "-d", name], cwd)
}

export async function mergeBranch(branch: string, cwd?: string): Promise<void> {
  await run(["merge", branch], cwd)
}

export async function rebaseBranch(onto: string, cwd?: string): Promise<void> {
  await run(["rebase", onto], cwd)
}

export async function getCommitFiles(hash: string, cwd?: string): Promise<GitFile[]> {
  const stdout = await run(["diff-tree", "--no-commit-id", "--name-status", "-r", hash], cwd)
  return parseCommitFiles(stdout)
}

export async function getCommitDiff(hash: string, opts?: {
  path?: string
  contextLines?: number
  cwd?: string
}): Promise<FileDiff[]> {
  // For the root commit (no parent), use --root flag with diff-tree
  // Otherwise use standard diff between parent and commit
  const args = ["diff"]

  if (opts?.contextLines !== undefined) args.push(`-U${opts.contextLines}`)

  try {
    // Try parent ref first: <hash>^..<hash>
    const diffArgs = [...args, `${hash}^..${hash}`]
    if (opts?.path) diffArgs.push("--", opts.path)
    const stdout = await run(diffArgs, opts?.cwd)
    return parseDiff(stdout)
  } catch {
    // Likely first commit — no parent exists. Use diff against empty tree.
    const emptyTree = "4b825dc642cb6eb9a060e54bf899d15363da7b23"
    const rootArgs = [...args, `${emptyTree}..${hash}`]
    if (opts?.path) rootArgs.push("--", opts.path)
    const stdout = await run(rootArgs, opts?.cwd)
    return parseDiff(stdout)
  }
}

export async function getCommitStats(hash: string, cwd?: string): Promise<CommitStats> {
  try {
    const stdout = await run(["diff", "--stat", `${hash}^..${hash}`], cwd)
    return parseCommitStats(stdout)
  } catch {
    // First commit — diff against empty tree
    const emptyTree = "4b825dc642cb6eb9a060e54bf899d15363da7b23"
    const stdout = await run(["diff", "--stat", `${emptyTree}..${hash}`], cwd)
    return parseCommitStats(stdout)
  }
}

export async function cherryPick(hash: string, cwd?: string): Promise<void> {
  await run(["cherry-pick", hash], cwd)
}

export async function revertCommit(
  hash: string,
  opts?: { noCommit?: boolean; cwd?: string },
): Promise<void> {
  const args = ["revert"]
  if (opts?.noCommit) {
    args.push("--no-commit")
  } else {
    args.push("--no-edit")
  }
  args.push(hash)
  await run(args, opts?.cwd)
}

export async function resetToCommit(
  hash: string,
  mode: "soft" | "mixed" | "hard",
  cwd?: string,
): Promise<void> {
  await run(["reset", `--${mode}`, hash], cwd)
}

export async function stashSave(message?: string, cwd?: string): Promise<void> {
  const args = ["stash", "push"]
  if (message) args.push("-m", message)
  await run(args, cwd)
}

export async function stashApply(index: number, cwd?: string): Promise<void> {
  await run(["stash", "apply", `stash@{${index}}`], cwd)
}

export async function stashPop(index: number, cwd?: string): Promise<void> {
  await run(["stash", "pop", `stash@{${index}}`], cwd)
}

export async function stashDrop(index: number, cwd?: string): Promise<void> {
  await run(["stash", "drop", `stash@{${index}}`], cwd)
}

export async function stageHunk(patchContent: string, cwd?: string): Promise<void> {
  const proc = Bun.spawn(["git", "apply", "--cached"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
    cwd: cwd ?? process.cwd(),
  })

  proc.stdin.write(patchContent)
  proc.stdin.end()

  const exitCode = await proc.exited

  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text()
    throw new GitCommandError("apply --cached", stderr)
  }
}

// ── Conflict Resolution ───────────────────────────────────────

export async function getMergeState(cwd?: string, existingStatus?: GitStatus): Promise<MergeState> {
  const gitDir = (await run(["rev-parse", "--git-dir"], cwd)).trim()
  const { stat } = await import("node:fs/promises")
  const { join } = await import("node:path")

  const exists = async (p: string) => {
    try { await stat(join(gitDir, p)); return true } catch { return false }
  }

  const readFile = async (p: string): Promise<string | null> => {
    try {
      const file = Bun.file(join(gitDir, p))
      return await file.text()
    } catch { return null }
  }

  const [mergeHead, rebaseDir, cherryPickHead, revertHead, mergeMsg] = await Promise.all([
    exists("MERGE_HEAD"),
    exists("rebase-merge").then(v => v || exists("rebase-apply")).then(Boolean),
    exists("CHERRY_PICK_HEAD"),
    exists("REVERT_HEAD"),
    readFile("MERGE_MSG"),
  ])

  const type = parseMergeState(mergeHead, rebaseDir, cherryPickHead, revertHead, mergeMsg)

  // Count conflicted files from status (reuse existing if provided)
  let conflictCount = 0
  let source: string | undefined
  if (type !== MERGE_STATE.NONE) {
    const status = existingStatus ?? await getStatus(cwd)
    conflictCount = status.unstaged.filter(f => f.status === FILE_STATUS.UNMERGED).length

    // Try to extract source branch from MERGE_MSG
    if (mergeMsg) {
      const match = mergeMsg.match(/^Merge branch '([^']+)'/)
      if (match) source = match[1]
    }
  }

  return { type, source, conflictCount }
}

export async function checkoutOurs(path: string, cwd?: string): Promise<void> {
  await run(["checkout", "--ours", "--", path], cwd)
}

export async function checkoutTheirs(path: string, cwd?: string): Promise<void> {
  await run(["checkout", "--theirs", "--", path], cwd)
}

export async function markResolved(path: string, cwd?: string): Promise<void> {
  await run(["add", "--", path], cwd)
}

export async function mergeAbort(cwd?: string): Promise<void> {
  await run(["merge", "--abort"], cwd)
}

export async function mergeContinue(cwd?: string): Promise<void> {
  await run(["merge", "--continue", "--no-edit"], cwd)
}

export async function rebaseAbort(cwd?: string): Promise<void> {
  await run(["rebase", "--abort"], cwd)
}

export async function rebaseContinue(cwd?: string): Promise<void> {
  await run(["rebase", "--continue"], cwd)
}

export async function getConflictDiff(path: string, cwd?: string): Promise<FileDiff[]> {
  // During a merge conflict, git diff shows the combined diff with conflict markers
  const result = await exec(["git", "diff", "--", path], { cwd })
  // git diff may return exit code 1 during conflicts
  if (result.exitCode > 1) {
    throw new GitCommandError("diff (conflict)", result.stderr)
  }
  return parseDiff(result.stdout)
}

export async function getFileVersion(path: string, stage: 1 | 2 | 3, cwd?: string): Promise<string> {
  // Stage 1 = common ancestor, 2 = ours (HEAD), 3 = theirs (incoming)
  return run(["show", `:${stage}:${path}`], cwd)
}
