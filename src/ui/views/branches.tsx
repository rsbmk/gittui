// src/ui/views/branches.tsx
// Branches tab view — branch detail + checkout/create/delete/merge/rebase/rename/upstream

import { createSignal, createEffect, onMount, onCleanup } from "solid-js"
import { useDialog } from "@opentui-ui/dialog/solid"
import { BranchDetail } from "./branch-detail.tsx"
import { ConfirmDialog } from "../components/confirm-dialog.tsx"
import { PromptDialog } from "../components/prompt-dialog.tsx"
import { AlertDialog, formatGitError } from "../components/alert-dialog.tsx"
import { dialogConfig } from "../components/dialog-styles.ts"
import {
  checkout,
  createBranch,
  deleteBranch,
  deleteRemoteBranch,
  mergeBranch,
  rebaseBranch,
  renameBranch,
  setUpstream,
  getBranchDiff,
  sanitizeBranchName,
} from "../../core/git/commands.ts"
import { repo, refreshBranches, refreshStatus, pushBranch, pullBranch, fetchAll } from "../../state/repo.ts"
import { config } from "../../state/config.ts"
import { registerAction, unregisterAction } from "../../state/actions.ts"
import { withDialog, showStatusMessage } from "../../state/ui.ts"
import type { GitBranch } from "../../core/git/types.ts"
import type { BranchDiffFile } from "./branch-detail.tsx"

// ── State ────────────────────────────────────────────────────

const [branchSelectedIndex, setBranchSelectedIndex] = createSignal(0)
const [branchDiffFiles, setBranchDiffFiles] = createSignal<BranchDiffFile[]>([])
const [branchDetailLoading, setBranchDetailLoading] = createSignal(false)

// ── Branch helpers ──────────────────────────────────────────

function allBranches(): GitBranch[] {
  const local = repo.branches.filter((b) => !b.remote)
  const remote = repo.branches.filter((b) => !!b.remote)
  return [...local, ...remote]
}

export function selectedBranch(): GitBranch | undefined {
  return allBranches()[branchSelectedIndex()]
}

// ── Actions (exported for global-keys) ───────────────────────

export async function handleCheckout(): Promise<void> {
  const branch = selectedBranch()
  if (!branch || branch.current) return

  await checkout(branch.name)
  await refreshBranches()
  await refreshStatus()
}

export async function handleDeleteBranch(force = false): Promise<void> {
  const branch = selectedBranch()
  if (!branch || branch.current) return

  if (branch.remote) {
    // Remote branch: "origin/feature" → remote="origin", branch="feature"
    const slashIdx = branch.name.indexOf("/")
    if (slashIdx === -1) return
    const remote = branch.name.slice(0, slashIdx)
    const remoteBranch = branch.name.slice(slashIdx + 1)
    await deleteRemoteBranch(remote, remoteBranch)
  } else {
    await deleteBranch(branch.name, force)
  }
  await refreshBranches()
}

export async function handleMerge(): Promise<void> {
  const branch = selectedBranch()
  if (!branch || branch.current) return

  const strategy = config().git.merge_strategy
  await mergeBranch(branch.name, strategy)
  await refreshStatus()
  await refreshBranches()
}

export async function handleRebase(): Promise<void> {
  const branch = selectedBranch()
  if (!branch || branch.current) return

  await rebaseBranch(branch.name)
  await refreshStatus()
  await refreshBranches()
}

export async function handlePush(): Promise<void> {
  await pushBranch()
}

export async function handlePull(): Promise<void> {
  await pullBranch()
}

export async function handleFetch(): Promise<void> {
  await fetchAll()
}

// Navigation for global-keys
export function branchListLength(): number {
  return allBranches().length
}

export { branchSelectedIndex, setBranchSelectedIndex }

// ── Component ────────────────────────────────────────────────

export function BranchesView() {
  const dialog = useDialog()

  onMount(() => {
    refreshBranches()

    // Register dialog-based actions
    registerAction("newBranch", promptNewBranch)
    registerAction("deleteBranch", () => confirmDeleteBranch(false))
    registerAction("forceDeleteBranch", () => confirmDeleteBranch(true))
    registerAction("renameBranch", promptRenameBranch)
    registerAction("setUpstream", promptSetUpstream)
  })

  onCleanup(() => {
    unregisterAction("newBranch")
    unregisterAction("deleteBranch")
    unregisterAction("forceDeleteBranch")
    unregisterAction("renameBranch")
    unregisterAction("setUpstream")
  })

  // Show error alert
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

  // New branch prompt
  async function promptNewBranch(): Promise<void> {
    const name = await withDialog(() => dialog.prompt<string>({
      content: (ctx) => () => (
        <PromptDialog
          title="New Branch"
          label="Branch name"
          confirmLabel="create"
          resolve={ctx.resolve}
          dismiss={ctx.dismiss}
          dialogId={ctx.dialogId}
        />
      ),
      ...dialogConfig(),
    }))

    if (name) {
      const sanitized = sanitizeBranchName(name)
      if (!sanitized) return

      try {
        await createBranch(sanitized)
        await refreshBranches()
        await refreshStatus()
        showStatusMessage(`✓ Created branch ${sanitized}`)
      } catch (err) {
        await showError("Create Branch Failed", err)
      }
    }
  }

  // Delete branch confirmation
  async function confirmDeleteBranch(force = false): Promise<void> {
    const branch = selectedBranch()
    if (!branch || branch.current) return

    const isRemote = !!branch.remote
    const title = isRemote
      ? "Delete Remote Branch"
      : `${force ? "Force Delete" : "Delete"} Branch`
    const message = isRemote
      ? `Delete remote branch "${branch.name}"? This will remove it from the remote.`
      : `Delete branch "${branch.name}"?`

    const confirmed = await withDialog(() => dialog.confirm({
      content: (ctx) => () => (
        <ConfirmDialog
          title={title}
          message={message}
          confirmLabel="delete"
          destructive={true}
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
        await handleDeleteBranch(force)
        showStatusMessage(`✓ Deleted ${isRemote ? "remote " : ""}branch ${branch.name}`)
      } catch (err) {
        await showError("Delete Branch Failed", err)
      }
    }
  }

  // Rename branch prompt
  async function promptRenameBranch(): Promise<void> {
    const branch = selectedBranch()
    if (!branch || branch.remote) return

    const newName = await withDialog(() => dialog.prompt<string>({
      content: (ctx) => () => (
        <PromptDialog
          title="Rename Branch"
          label="New name"
          confirmLabel="rename"
          initialValue={branch.name}
          resolve={ctx.resolve}
          dismiss={ctx.dismiss}
          dialogId={ctx.dialogId}
        />
      ),
      ...dialogConfig(),
    }))

    if (newName) {
      const sanitized = sanitizeBranchName(newName)
      if (!sanitized || sanitized === branch.name) return

      try {
        await renameBranch(branch.name, sanitized)
        await refreshBranches()
        showStatusMessage(`✓ Renamed to ${sanitized}`)
      } catch (err) {
        await showError("Rename Branch Failed", err)
      }
    }
  }

  // Set upstream prompt
  async function promptSetUpstream(): Promise<void> {
    const branch = selectedBranch()
    if (!branch || branch.remote) return

    const upstream = await withDialog(() => dialog.prompt<string>({
      content: (ctx) => () => (
        <PromptDialog
          title="Set Upstream"
          label="Remote/branch (e.g. origin/main)"
          confirmLabel="set"
          initialValue={branch.upstream ?? ""}
          resolve={ctx.resolve}
          dismiss={ctx.dismiss}
          dialogId={ctx.dialogId}
        />
      ),
      ...dialogConfig(),
    }))

    if (upstream) {
      try {
        await setUpstream(branch.name, upstream)
        await refreshBranches()
        showStatusMessage(`✓ Upstream set to ${upstream}`)
      } catch (err) {
        await showError("Set Upstream Failed", err)
      }
    }
  }

  // Load changed files when selected branch changes
  createEffect(async () => {
    const branch = selectedBranch()
    const currentBranch = repo.status?.branch
    if (!branch || !currentBranch || branch.name === currentBranch) {
      setBranchDiffFiles([])
      return
    }

    setBranchDetailLoading(true)
    try {
      const output = await getBranchDiff(currentBranch, branch.name)
      const files: BranchDiffFile[] = output
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => {
          const status = line.charAt(0)!
          const path = line.slice(1).trim()
          return { status, path }
        })
      setBranchDiffFiles(files)
    } catch {
      setBranchDiffFiles([])
    } finally {
      setBranchDetailLoading(false)
    }
  })

  return (
    <box flexDirection="column" flexGrow={1}>
      <BranchDetail
        branch={selectedBranch()}
        currentBranch={repo.status?.branch ?? ""}
        changedFiles={branchDiffFiles()}
        loading={branchDetailLoading()}
      />
    </box>
  )
}

// Export dialog-based actions for global-keys
export { BranchesView as default }
