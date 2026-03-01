// src/ui/views/commits.tsx
// Commits tab view — master-detail: sidebar lists commits, main panel shows detail
// Layout: compact header (2 lines) + horizontal split (file tree | diff)

import { createSignal, createEffect, Show, For, onMount, onCleanup, type Accessor } from "solid-js"
import { useDialog } from "@opentui-ui/dialog/solid"
import { FileTree } from "../components/file-tree.tsx"
import { ScrollList } from "../components/scroll-list.tsx"
import { ConfirmDialog } from "../components/confirm-dialog.tsx"
import { PromptDialog } from "../components/prompt-dialog.tsx"
import { AlertDialog, formatGitError } from "../components/alert-dialog.tsx"
import { RevertDialog, REVERT_MODE } from "../components/revert-dialog.tsx"
import { dialogConfig } from "../components/dialog-styles.ts"
import { DiffView } from "./diff.tsx"
import { repo, refreshCommits } from "../../state/repo.ts"
import {
  cherryPick,
  revertCommit,
  getLog,
  getCommitFiles,
  getCommitDiff,
  getCommitStats,
} from "../../core/git/commands.ts"
import { refreshStatus } from "../../state/repo.ts"
import { registerAction, unregisterAction } from "../../state/actions.ts"
import { withDialog } from "../../state/ui.ts"
import { config } from "../../state/config.ts"
import type { RevertMode } from "../components/revert-dialog.tsx"
import type { CommitStats, FileDiff, GitCommit, GitFile } from "../../core/git/types.ts"

// ── State ────────────────────────────────────────────────────

const [commitSelectedIndex, setCommitSelectedIndex] = createSignal(0)
const [commitFileIndex, setCommitFileIndex] = createSignal(0)
const [commitFiles, setCommitFiles] = createSignal<GitFile[]>([])
const [commitFileDiff, setCommitFileDiff] = createSignal<FileDiff | null>(null)
const [commitStats, setCommitStats] = createSignal<CommitStats | null>(null)
const [filterQuery, setFilterQuery] = createSignal("")
const [showBody, setShowBody] = createSignal(false)

// ── Commit detail loading ────────────────────────────────────

async function loadCommitDetail(hash: string): Promise<void> {
  try {
    const [files, stats] = await Promise.all([
      getCommitFiles(hash),
      getCommitStats(hash),
    ])
    setCommitFiles(files)
    setCommitStats(stats)

    // Load diff for first file
    if (files.length > 0) {
      const { context_lines } = config().diff
      const diffs = await getCommitDiff(hash, { path: files[0]!.path, contextLines: context_lines })
      setCommitFileDiff(diffs[0] ?? null)
    }
  } catch {
    // Silent — signals already cleared before this call
  }
}

async function loadFileDiff(hash: string, path: string): Promise<void> {
  try {
    const { context_lines } = config().diff
    const diffs = await getCommitDiff(hash, { path, contextLines: context_lines })
    setCommitFileDiff(diffs[0] ?? null)
  } catch {
    setCommitFileDiff(null)
  }
}

// Reactive: load commit detail when selection changes
createEffect(() => {
  const index = commitSelectedIndex()
  const commit = repo.commits[index]
  if (!commit) {
    setCommitFiles([])
    setCommitStats(null)
    setCommitFileDiff(null)
    return
  }

  // Clear immediately, then load async
  setCommitFiles([])
  setCommitStats(null)
  setCommitFileDiff(null)
  setCommitFileIndex(0)

  void loadCommitDetail(commit.hash)
})

// Reactive: load diff when file selection changes
createEffect(() => {
  const idx = commitFileIndex()
  const files = commitFiles()
  const file = files[idx]
  if (!file) {
    setCommitFileDiff(null)
    return
  }

  const commit = repo.commits[commitSelectedIndex()]
  if (!commit) return

  void loadFileDiff(commit.hash, file.path)
})

// ── Actions (exported for global-keys) ───────────────────────

// Kept for backward compat with global-keys — now a no-op since detail is always visible
export async function viewCommitDetail(): Promise<void> {
  // No-op: detail always shown in main panel
}

export function closeCommitDetail(): void {
  // No-op: detail always shown in main panel
}

// Kept for backward compat — always returns null
export function detailCommit(): null {
  return null
}

export async function handleCherryPick(): Promise<void> {
  const commit = repo.commits[commitSelectedIndex()]
  if (!commit) return

  await cherryPick(commit.hash)
  await refreshStatus()
  await refreshCommits()
}

export async function handleRevert(mode: RevertMode = REVERT_MODE.COMMIT): Promise<void> {
  const commit = repo.commits[commitSelectedIndex()]
  if (!commit) return

  await revertCommit(commit.hash, { noCommit: mode === REVERT_MODE.STAGE })
  await refreshStatus()
  await refreshCommits()
}

// ── Body toggle ──────────────────────────────────────────────

export function toggleCommitBody(): void {
  setShowBody((prev) => !prev)
}

// ── Navigation exports ───────────────────────────────────────

export function commitListLength(): number {
  return repo.commits.length
}

export function commitFileListLength(): number {
  return commitFiles().length
}

export function commitFileSelectedIndex(): number {
  return commitFileIndex()
}

export function setCommitFileSelectedIndex(idx: number): void {
  const max = commitFiles().length
  setCommitFileIndex(Math.max(0, Math.min(idx, max - 1)))
}

export { commitSelectedIndex, setCommitSelectedIndex }

// ── Helpers ──────────────────────────────────────────────────

function truncateBody(body: string, maxLines: number): string {
  if (!body) return ""
  const lines = body.split("\n")
  if (lines.length <= maxLines) return body
  return lines.slice(0, maxLines).join("\n") + "\u2026"
}

// ── Component ────────────────────────────────────────────────

export function CommitsView() {
  const dialog = useDialog()

  onMount(() => {
    refreshCommits()

    registerAction("cherryPick", confirmCherryPick)
    registerAction("revert", confirmRevert)
    registerAction("search", openFilterDialog)
    registerAction("toggleBody", toggleCommitBody)
  })

  onCleanup(() => {
    unregisterAction("cherryPick")
    unregisterAction("revert")
    unregisterAction("search")
    unregisterAction("toggleBody")
  })

  // ── Derived state ──────────────────────────────────────────

  function selectedCommit() {
    return repo.commits[commitSelectedIndex()]
  }

  // ── Dialogs ────────────────────────────────────────────────

  async function openFilterDialog(): Promise<void> {
    const query = await withDialog(() => dialog.prompt<string>({
      content: (ctx) => () => (
        <PromptDialog
          title="Filter Commits"
          label="Search (author, message, path)"
          confirmLabel="filter"
          initialValue={filterQuery()}
          allowEmpty={true}
          resolve={ctx.resolve}
          dismiss={ctx.dismiss}
          dialogId={ctx.dialogId}
        />
      ),
      ...dialogConfig(),
    }))

    if (query !== undefined) {
      setFilterQuery(query)
      setCommitSelectedIndex(0)

      try {
        if (query) {
          await getLog({ grep: query })
        }
        await refreshCommits()
      } catch {
        // TODO: show error
      }
    }
  }

  async function showError(title: string, err: unknown): Promise<void> {
    const { errors, hints } = formatGitError(err)
    await withDialog(() => dialog.alert({
      content: (ctx) => () => (
        <AlertDialog
          title={title}
          errors={errors}
          hints={hints}
          error={true}
          dismiss={ctx.dismiss}
          dialogId={ctx.dialogId}
        />
      ),
      ...dialogConfig(),
    }))
  }

  async function confirmCherryPick(): Promise<void> {
    const commit = selectedCommit()
    if (!commit) return

    const confirmed = await withDialog(() => dialog.confirm({
      content: (ctx) => () => (
        <ConfirmDialog
          title="Cherry-pick Commit"
          message={`Cherry-pick ${commit.shortHash}: ${commit.message}?`}
          confirmLabel="confirm"
          resolve={ctx.resolve}
          dismiss={ctx.dismiss}
          dialogId={ctx.dialogId}
        />
      ),
      fallback: false,
      ...dialogConfig(),
    }))

    if (confirmed) {
      try {
        await handleCherryPick()
      } catch (err) {
        await showError("Cherry-pick Failed", err)
      }
    }
  }

  async function confirmRevert(): Promise<void> {
    const commit = selectedCommit()
    if (!commit) return

    // getCommitFiles returns GitFile[] — map to string[] for RevertDialog
    let files: string[] = []
    try {
      const gitFiles = await getCommitFiles(commit.hash)
      files = gitFiles.map((f) => f.path)
    } catch {
      // Non-critical — show dialog without file list
    }

    const mode = await withDialog(() => dialog.prompt<RevertMode>({
      content: (ctx) => () => (
        <RevertDialog
          shortHash={commit.shortHash}
          message={commit.message}
          files={files}
          resolve={ctx.resolve}
          dismiss={ctx.dismiss}
          dialogId={ctx.dialogId}
        />
      ),
      ...dialogConfig(),
    }))

    if (mode) {
      try {
        await handleRevert(mode)
      } catch (err) {
        await showError("Revert Failed", err)
      }
    }
  }

  // ── Render ─────────────────────────────────────────────────

  return (
    <box flexDirection="column" flexGrow={1}>
      <Show
        when={selectedCommit()}
        fallback={
          <box flexGrow={1} justifyContent="center" alignItems="center">
            <text fg="#6c7086">No commits found</text>
          </box>
        }
      >
        {(commit: Accessor<GitCommit>) => (
          <box flexDirection="column" flexGrow={1}>
            {/* ── Compact Header (2 lines) ────────────────── */}
            <box flexDirection="column" paddingX={1} flexShrink={0}>
              {/* Line 1: hash + message + refs */}
              <box flexDirection="row">
                <text fg="#f9e2af">
                  <b>{commit().shortHash}</b>
                </text>
                <text fg="#cdd6f4">{"  "}{commit().message}</text>
                <Show when={commit().refs.length > 0}>
                  <text fg="#585b70">{"  "}</text>
                  <For each={commit().refs}>
                    {(ref) => (
                      <text fg="#89b4fa">[{ref}] </text>
                    )}
                  </For>
                </Show>
              </box>

              {/* Line 2: author + date + stats */}
              <box flexDirection="row">
                <text fg="#6c7086">{commit().author}</text>
                <text fg="#585b70">{" \u00b7 "}{commit().relativeDate}</text>
                <Show when={commitStats()}>
                  <text fg="#585b70">{" \u00b7 "}</text>
                  <Show when={commitStats()!.insertions > 0}>
                    <text fg="#a6e3a1">+{commitStats()!.insertions}</text>
                    <text fg="#585b70">{" "}</text>
                  </Show>
                  <Show when={commitStats()!.deletions > 0}>
                    <text fg="#f38ba8">-{commitStats()!.deletions}</text>
                    <text fg="#585b70">{" "}</text>
                  </Show>
                  <text fg="#585b70">
                    {"\u00b7 "}{commitStats()!.filesChanged} file{commitStats()!.filesChanged !== 1 ? "s" : ""}
                  </text>
                </Show>
              </box>
            </box>

            {/* ── Body (toggleable with 'b') ──────────────── */}
            <Show when={showBody() && commit().body}>
              <box paddingX={1} flexShrink={0}>
                <text fg="#a6adc8">{truncateBody(commit().body, 4)}</text>
              </box>
            </Show>

            {/* ── Horizontal Split: file tree | diff ──────── */}
            <box flexDirection="row" flexGrow={1}>
              {/* Left panel: file tree */}
              <box flexDirection="column" width={35}>
                <ScrollList selectedRow={1 + commitFileIndex()} flexGrow={1}>
                  <FileTree
                    files={commitFiles()}
                    title="CHANGED"
                    selectedIndex={commitFileIndex()}
                    indexOffset={0}
                    onSelect={(_, idx) => setCommitFileIndex(idx)}
                  />
                  <Show when={commitFiles().length === 0 && commitStats() !== null}>
                    <text fg="#6c7086"> No files changed</text>
                  </Show>
                </ScrollList>
              </box>

              {/* Right panel: diff */}
              <DiffView fileDiff={commitFileDiff()} />
            </box>
          </box>
        )}
      </Show>
    </box>
  )
}
