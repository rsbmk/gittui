// src/state/repo.ts
// Repository state — Solid.js store wrapping git command outputs

import { createStore } from "solid-js/store"
import type { FileDiff, GitBranch, GitCommit, GitStash, GitStatus, MergeState } from "../core/git/types.ts"
import { fetchRemote, getBranches, getDiff, getLog, getMergeState, getStashList, getStatus, pull, push } from "../core/git/commands.ts"
import { error as logError } from "../lib/logger.ts"
import { config } from "./config.ts"
import { showStatusMessage } from "./ui.ts"

// ── State Interface ───────────────────────────────────────────

interface RepoState {
  status: GitStatus | null
  diff: FileDiff[]
  commits: GitCommit[]
  branches: GitBranch[]
  stashes: GitStash[]
  mergeState: MergeState | null
  loading: boolean
  pushPullState: "idle" | "pushing" | "pulling" | "fetching"
  error: string | null
}

// ── Store ─────────────────────────────────────────────────────

const [repo, setRepo] = createStore<RepoState>({
  status: null,
  diff: [],
  commits: [],
  branches: [],
  stashes: [],
  mergeState: null,
  loading: false,
  pushPullState: "idle",
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

    // Always keep merge state in sync — passing the status we just fetched
    // avoids a redundant getStatus() call inside getMergeState()
    const mergeState = await getMergeState(undefined, status)
    setRepo("mergeState", mergeState)
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

export async function refreshMergeState(): Promise<void> {
  try {
    const state = await getMergeState()
    setRepo("mergeState", state)
  } catch (err) {
    logError("Failed to detect merge state", { error: err instanceof Error ? err.message : String(err) })
    setRepo("mergeState", null)
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
      refreshMergeState(),
    ])
  } catch (err) {
    setRepo("error", err instanceof Error ? err.message : String(err))
  } finally {
    setRepo("loading", false)
  }
}

// ── Remote Operations ─────────────────────────────────────────

export async function pushBranch(): Promise<void> {
  setRepo("pushPullState", "pushing")
  try {
    await push()
    await refreshBranches()
    showStatusMessage("✓ Pushed successfully")
  } catch (err) {
    throw err
  } finally {
    setRepo("pushPullState", "idle")
  }
}

export async function pullBranch(): Promise<void> {
  setRepo("pushPullState", "pulling")
  try {
    await pull()
    await refreshBranches()
    await refreshStatus()
    showStatusMessage("✓ Pulled successfully")
  } catch (err) {
    throw err
  } finally {
    setRepo("pushPullState", "idle")
  }
}

export async function fetchAll(): Promise<void> {
  setRepo("pushPullState", "fetching")
  try {
    await fetchRemote()
    await refreshBranches()
    showStatusMessage("✓ Fetched all remotes")
  } catch (err) {
    throw err
  } finally {
    setRepo("pushPullState", "idle")
  }
}
