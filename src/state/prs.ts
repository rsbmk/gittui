// src/state/prs.ts
// PR state — Solid.js store wrapping GitHub CLI operations

import { createSignal, createEffect, createMemo } from "solid-js"
import { createStore, reconcile } from "solid-js/store"
import type {
  PullRequest,
  PRFile,
  PRReview,
  PRComment,
} from "../core/github/types.ts"
import {
  isGhAvailable,
  listPRs,
  getPRFiles,
  getPRReviews,
  getPRComments,
  createReview,
  addComment as addCommentCmd,
  mergePR,
  openPRInBrowser,
  getPRDiff,
} from "../core/github/commands.ts"
import type { ReviewEvent, MergeMethod, PRState } from "../core/github/types.ts"
import { createCache } from "../lib/perf.ts"
import { error as logError } from "../lib/logger.ts"

// ── Constants ────────────────────────────────────────────────

const DETAIL_CACHE_TTL_MS = 3 * 60 * 1000 // 3 minutes
const LOAD_DEBOUNCE_MS = 300

// ── Per-PR Detail Cache ──────────────────────────────────────

interface PRDetailCacheEntry {
  files: PRFile[]
  reviews: PRReview[]
  comments: PRComment[]
  diff: string
  loadedAt: number
}

const prDetailCache = new Map<number, PRDetailCacheEntry>()

function getCachedDetail(prNumber: number): PRDetailCacheEntry | null {
  const entry = prDetailCache.get(prNumber)
  if (!entry) return null
  if (Date.now() - entry.loadedAt >= DETAIL_CACHE_TTL_MS) {
    prDetailCache.delete(prNumber)
    return null
  }
  return entry
}

function setCachedDetail(prNumber: number, detail: Omit<PRDetailCacheEntry, "loadedAt">): void {
  prDetailCache.set(prNumber, { ...detail, loadedAt: Date.now() })
}

function invalidateDetailCache(prNumber: number): void {
  prDetailCache.delete(prNumber)
}

// ── State Interface ──────────────────────────────────────────

interface PRStoreState {
  list: PullRequest[]
  selected: PullRequest | null
  files: PRFile[]
  reviews: PRReview[]
  comments: PRComment[]
  diff: string
  loading: boolean
  detailLoading: boolean
  error: string | null
  ghAvailable: boolean
  filter: PRState | "all"
}

// ── Store ────────────────────────────────────────────────────

const [prs, setPRs] = createStore<PRStoreState>({
  list: [],
  selected: null,
  files: [],
  reviews: [],
  comments: [],
  diff: "",
  loading: false,
  detailLoading: false,
  error: null,
  ghAvailable: false,
  filter: "open",
})

export { prs }

// ── PR list cache (30s TTL) ──────────────────────────────────

const prListCache = createCache(async () => {
  return listPRs(prs.filter)
}, 30_000)

// ── Selection ────────────────────────────────────────────────

const [prSelectedIndex, setPRSelectedIndex] = createSignal(0)
const [prFileSelectedIndex, setPRFileSelectedIndex] = createSignal(0)
const [viewingFileDiff, setViewingFileDiff] = createSignal(false)

export { prSelectedIndex, setPRSelectedIndex, prFileSelectedIndex, setPRFileSelectedIndex }
export { viewingFileDiff, setViewingFileDiff }

/** The PR currently focused in the sidebar list */
export const focusedPR = createMemo<PullRequest | null>(() => {
  const idx = prSelectedIndex()
  const list = prs.list
  if (list.length === 0) return null
  return list[idx] ?? null
})

export function prListLength(): number {
  return prs.list.length
}

// ── Debounced Auto-Load ──────────────────────────────────────

let debounceTimer: ReturnType<typeof setTimeout> | null = null

/** Load PR detail (files, reviews, comments, diff) for the given PR number */
async function loadPRDetail(prNumber: number): Promise<void> {
  setPRs("detailLoading", true)

  try {
    const [files, reviews, comments, diff] = await Promise.all([
      getPRFiles(prNumber),
      getPRReviews(prNumber),
      getPRComments(prNumber),
      getPRDiff(prNumber),
    ])

    // Only apply if the focused PR hasn't changed while we were loading
    const currentFocused = focusedPR()
    if (currentFocused && currentFocused.number === prNumber) {
      setPRs("files", files)
      setPRs("reviews", reviews)
      setPRs("comments", comments)
      setPRs("diff", diff)
    }

    // Cache regardless
    setCachedDetail(prNumber, { files, reviews, comments, diff })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logError("Failed to auto-load PR detail", { prNumber, error: msg })
    // Don't set global error for background loads — only clear loading
  } finally {
    setPRs("detailLoading", false)
  }
}

/**
 * Effect: when the focused PR changes, set selected immediately from list data
 * and debounce-load the detail (files, reviews, comments, diff).
 */
export function initPRAutoLoad(): void {
  createEffect(() => {
    const pr = focusedPR()

    // Clear any pending debounce
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }

    if (!pr || !prs.ghAvailable) {
      setPRs("selected", null)
      setPRs("files", [])
      setPRs("reviews", [])
      setPRs("comments", [])
      setPRs("diff", "")
      setPRs("detailLoading", false)
      return
    }

    // Set selected immediately from list data (no API call)
    setPRs("selected", pr)

    // Reset file diff view when switching PRs
    setViewingFileDiff(false)
    setPRFileSelectedIndex(0)

    // Check per-PR cache
    const cached = getCachedDetail(pr.number)
    if (cached) {
      setPRs("files", cached.files)
      setPRs("reviews", cached.reviews)
      setPRs("comments", cached.comments)
      setPRs("diff", cached.diff)
      setPRs("detailLoading", false)
      return
    }

    // Clear stale detail data and show loading
    setPRs("files", [])
    setPRs("reviews", [])
    setPRs("comments", [])
    setPRs("diff", "")
    setPRs("detailLoading", true)

    // Debounce the API call
    debounceTimer = setTimeout(() => {
      loadPRDetail(pr.number).catch((err: unknown) => {
        logError("PR auto-load failed", {
          prNumber: pr.number,
          error: err instanceof Error ? err.message : String(err),
        })
      })
    }, LOAD_DEBOUNCE_MS)
  })
}

// ── Actions ──────────────────────────────────────────────────

export async function checkGhAvailable(): Promise<void> {
  const available = await isGhAvailable()
  setPRs("ghAvailable", available)
}

export async function refreshPRs(forceRefresh = false): Promise<void> {
  if (!prs.ghAvailable) return

  setPRs("loading", true)
  setPRs("error", null)

  try {
    if (forceRefresh) prListCache.invalidate()
    const list = await prListCache.get()

    // Deduplicate by PR number (safety net against API/cache edge cases)
    const seen = new Set<number>()
    const unique = list.filter((pr) => {
      if (seen.has(pr.number)) return false
      seen.add(pr.number)
      return true
    })

    // reconcile diffs by PR number — reuses existing store proxies,
    // preventing <For> from seeing all items as "new" on every refresh
    setPRs("list", reconcile(unique, { key: "number" }))
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logError("Failed to refresh PRs", { error: msg })
    setPRs("error", msg)
  } finally {
    setPRs("loading", false)
  }
}

export function closeFileDiff(): void {
  setViewingFileDiff(false)
}

export async function submitReview(event: ReviewEvent, body: string): Promise<void> {
  const pr = prs.selected
  if (!pr) return

  try {
    await createReview(pr.number, event, body)
    // Refresh reviews after submitting — invalidate cache
    invalidateDetailCache(pr.number)
    const reviews = await getPRReviews(pr.number)
    setPRs("reviews", reviews)
  } catch (err) {
    setPRs("error", err instanceof Error ? err.message : String(err))
  }
}

export async function submitComment(body: string, path: string, line: number): Promise<void> {
  const pr = prs.selected
  if (!pr) return

  try {
    await addCommentCmd(pr.number, body, path, line)
    // Refresh comments after adding — invalidate cache
    invalidateDetailCache(pr.number)
    const comments = await getPRComments(pr.number)
    setPRs("comments", comments)
  } catch (err) {
    setPRs("error", err instanceof Error ? err.message : String(err))
  }
}

export async function merge(method: MergeMethod): Promise<void> {
  const pr = prs.selected
  if (!pr) return

  try {
    await mergePR(pr.number, method)
    // Invalidate caches
    invalidateDetailCache(pr.number)
    prListCache.invalidate()
    // Refresh list
    await refreshPRs(true)
  } catch (err) {
    setPRs("error", err instanceof Error ? err.message : String(err))
  }
}

export async function openInBrowser(): Promise<void> {
  const pr = prs.selected
  if (!pr) return

  try {
    await openPRInBrowser(pr.number)
  } catch {
    // Silent fail — browser might not open in terminal
  }
}

export function setFilter(filter: PRState | "all"): void {
  setPRs("filter", filter)
  prListCache.invalidate()
  refreshPRs()
}

export function cycleFilter(): void {
  const current = prs.filter
  const order: Array<PRState | "all"> = ["open", "closed", "all"]
  const idx = order.indexOf(current)
  const next = order[(idx + 1) % order.length]!
  setFilter(next)
}
