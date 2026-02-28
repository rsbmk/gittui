// src/core/git/commands.ts
// Typed async wrappers around git CLI commands

import { exec } from "../../lib/shell.ts"
import { parseBranches, parseDiff, parseLog, parseStash, parseStatus } from "./parser.ts"
import type { FileDiff, GitBranch, GitCommit, GitStash, GitStatus } from "./types.ts"

// ── Error ─────────────────────────────────────────────────────

export class GitCommandError extends Error {
  constructor(command: string, stderr: string) {
    super(`git ${command} failed: ${stderr.trim()}`)
    this.name = "GitCommandError"
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
  const stdout = await run(["status", "--porcelain=v2", "--branch"], cwd)
  return parseStatus(stdout)
}

export async function getDiff(opts?: {
  path?: string
  staged?: boolean
  cwd?: string
}): Promise<FileDiff[]> {
  const args = ["diff"]

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

export async function cherryPick(hash: string, cwd?: string): Promise<void> {
  await run(["cherry-pick", hash], cwd)
}

export async function revertCommit(hash: string, cwd?: string): Promise<void> {
  await run(["revert", "--no-edit", hash], cwd)
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
