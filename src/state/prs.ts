// src/state/prs.ts
// PR state — Solid.js store wrapping GitHub CLI operations

import { createSignal, createMemo } from "solid-js"
import { createStore } from "solid-js/store"
import type {
  PullRequest,
  PRFile,
  PRReview,
  PRComment,
} from "../core/github/types.ts"
import {
  isGhAvailable,
  listPRs,
  getPRDetail,
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

// ── State Interface ──────────────────────────────────────────

interface PRStoreState {
  list: PullRequest[]
  selected: PullRequest | null
  files: PRFile[]
  reviews: PRReview[]
  comments: PRComment[]
  diff: string
  loading: boolean
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
const [viewingPRDetail, setViewingPRDetail] = createSignal(false)

export { prSelectedIndex, setPRSelectedIndex, prFileSelectedIndex, setPRFileSelectedIndex, viewingPRDetail }

export function prListLength(): number {
  return prs.list.length
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
    setPRs("list", list)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logError("Failed to refresh PRs", { error: msg })
    setPRs("error", msg)
  } finally {
    setPRs("loading", false)
  }
}

export async function selectPR(number: number): Promise<void> {
  setPRs("loading", true)
  setPRs("error", null)

  try {
    const [detail, files, reviews, comments, diff] = await Promise.all([
      getPRDetail(number),
      getPRFiles(number),
      getPRReviews(number),
      getPRComments(number),
      getPRDiff(number),
    ])

    setPRs("selected", detail)
    setPRs("files", files)
    setPRs("reviews", reviews)
    setPRs("comments", comments)
    setPRs("diff", diff)
    setPRFileSelectedIndex(0)
    setViewingPRDetail(true)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logError("Failed to load PR detail", { prNumber: number, error: msg })
    setPRs("error", msg)
  } finally {
    setPRs("loading", false)
  }
}

export function closePRDetail(): void {
  setPRs("selected", null)
  setPRs("files", [])
  setPRs("reviews", [])
  setPRs("comments", [])
  setPRs("diff", "")
  setViewingPRDetail(false)
}

export async function submitReview(event: ReviewEvent, body: string): Promise<void> {
  const pr = prs.selected
  if (!pr) return

  try {
    await createReview(pr.number, event, body)
    // Refresh reviews after submitting
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
    // Refresh comments after adding
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
    closePRDetail()
    await refreshPRs()
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
