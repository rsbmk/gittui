// src/state/repo.ts
// Repository state — Solid.js store wrapping git command outputs

import { createStore } from "solid-js/store"
import type { FileDiff, GitBranch, GitCommit, GitStash, GitStatus } from "../core/git/types.ts"
import { getBranches, getDiff, getLog, getStashList, getStatus } from "../core/git/commands.ts"
import { error as logError } from "../lib/logger.ts"
import { config } from "./config.ts"

// ── State Interface ───────────────────────────────────────────

interface RepoState {
  status: GitStatus | null
  diff: FileDiff[]
  commits: GitCommit[]
  branches: GitBranch[]
  stashes: GitStash[]
  loading: boolean
  error: string | null
}

// ── Store ─────────────────────────────────────────────────────

const [repo, setRepo] = createStore<RepoState>({
  status: null,
  diff: [],
  commits: [],
  branches: [],
  stashes: [],
  loading: false,
  error: null,
})

export { repo, setRepo }

// ── Actions ───────────────────────────────────────────────────

export async function refreshStatus(): Promise<void> {
  setRepo("loading", true)
  setRepo("error", null)

  try {
    const status = await getStatus()
    setRepo("status", status)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logError("Failed to refresh status", { error: msg })
    setRepo("error", msg)
  } finally {
    setRepo("loading", false)
  }
}

export async function refreshDiff(path?: string, staged?: boolean): Promise<void> {
  try {
    const { context_lines } = config().diff
    const diff = await getDiff({ path, staged, contextLines: context_lines })
    setRepo("diff", diff)
  } catch (err) {
    setRepo("error", err instanceof Error ? err.message : String(err))
  }
}

export async function refreshCommits(): Promise<void> {
  try {
    const commits = await getLog()
    setRepo("commits", commits)
  } catch (err) {
    setRepo("error", err instanceof Error ? err.message : String(err))
  }
}

export async function refreshBranches(): Promise<void> {
  try {
    const branches = await getBranches()
    setRepo("branches", branches)
  } catch (err) {
    setRepo("error", err instanceof Error ? err.message : String(err))
  }
}

export async function refreshStashes(): Promise<void> {
  try {
    const stashes = await getStashList()
    setRepo("stashes", stashes)
  } catch (err) {
    setRepo("error", err instanceof Error ? err.message : String(err))
  }
}

export async function refreshAll(): Promise<void> {
  setRepo("loading", true)
  setRepo("error", null)

  try {
    await Promise.all([
      refreshStatus(),
      refreshDiff(),
      refreshCommits(),
      refreshBranches(),
      refreshStashes(),
    ])
  } catch (err) {
    setRepo("error", err instanceof Error ? err.message : String(err))
  } finally {
    setRepo("loading", false)
  }
}
