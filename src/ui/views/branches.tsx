// src/ui/views/branches.tsx
// Branches tab view — branch list + checkout/create/delete/merge/rebase

import { createSignal, onMount, onCleanup } from "solid-js"
import { useDialog } from "@opentui-ui/dialog/solid"
import { BranchList, BRANCH_FILTER, type BranchFilter } from "../components/branch-list.tsx"
import { ConfirmDialog } from "../components/confirm-dialog.tsx"
import { PromptDialog } from "../components/prompt-dialog.tsx"
import { AlertDialog, formatGitError } from "../components/alert-dialog.tsx"
import { dialogConfig } from "../components/dialog-styles.ts"
import { repo, refreshBranches, refreshStatus } from "../../state/repo.ts"
import {
  checkout,
  createBranch,
  deleteBranch,
  mergeBranch,
  rebaseBranch,
} from "../../core/git/commands.ts"
import { registerAction, unregisterAction } from "../../state/actions.ts"
import { withDialog } from "../../state/ui.ts"
import type { GitBranch } from "../../core/git/types.ts"

// ── State ────────────────────────────────────────────────────

const [branchSelectedIndex, setBranchSelectedIndex] = createSignal(0)
const [branchFilter, setBranchFilter] = createSignal<BranchFilter>(BRANCH_FILTER.LOCAL)

// ── Filtered branches helper ────────────────────────────────

function getFilteredBranches(): GitBranch[] {
  const all = repo.branches
  switch (branchFilter()) {
    case BRANCH_FILTER.LOCAL:
      return all.filter((b) => !b.remote)
    case BRANCH_FILTER.REMOTE:
      return all.filter((b) => !!b.remote)
    case BRANCH_FILTER.ALL:
      return all
  }
}

function selectedBranch(): GitBranch | undefined {
  return getFilteredBranches()[branchSelectedIndex()]
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

  await deleteBranch(branch.name, force)
  await refreshBranches()
}

export async function handleMerge(): Promise<void> {
  const branch = selectedBranch()
  if (!branch || branch.current) return

  await mergeBranch(branch.name)
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

export function cycleBranchFilter(): void {
  const order: BranchFilter[] = [BRANCH_FILTER.LOCAL, BRANCH_FILTER.REMOTE, BRANCH_FILTER.ALL]
  const idx = order.indexOf(branchFilter())
  setBranchFilter(order[(idx + 1) % order.length]!)
  setBranchSelectedIndex(0)
}

// Navigation for global-keys
export function branchListLength(): number {
  return getFilteredBranches().length
}

export { branchSelectedIndex, setBranchSelectedIndex, branchFilter }

// ── Component ────────────────────────────────────────────────

export function BranchesView() {
  const dialog = useDialog()

  onMount(() => {
    refreshBranches()

    // Register dialog-based actions
    registerAction("newBranch", promptNewBranch)
    registerAction("deleteBranch", () => confirmDeleteBranch(false))
    registerAction("forceDeleteBranch", () => confirmDeleteBranch(true))
  })

  onCleanup(() => {
    unregisterAction("newBranch")
    unregisterAction("deleteBranch")
    unregisterAction("forceDeleteBranch")
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
      try {
        await createBranch(name)
        await refreshBranches()
        await refreshStatus()
      } catch (err) {
        await showError("Create Branch Failed", err)
      }
    }
  }

  // Delete branch confirmation
  async function confirmDeleteBranch(force = false): Promise<void> {
    const branch = selectedBranch()
    if (!branch || branch.current) return

    const confirmed = await withDialog(() => dialog.confirm({
      content: (ctx) => () => (
        <ConfirmDialog
          title={`${force ? "Force Delete" : "Delete"} Branch`}
          message={`Delete branch "${branch.name}"?`}
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
      } catch (err) {
        await showError("Delete Branch Failed", err)
      }
    }
  }

  return (
    <box flexDirection="column" flexGrow={1}>
      <BranchList
        branches={repo.branches}
        selectedIndex={branchSelectedIndex()}
        filter={branchFilter()}
        onSelect={(_, idx) => setBranchSelectedIndex(idx)}
      />
    </box>
  )
}

// Export dialog-based actions for global-keys
export { BranchesView as default }
