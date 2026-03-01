// src/ui/views/stash.tsx
// Stash tab view — list stashes, view content, apply/pop/drop/save

import { createSignal, For, Show, onMount, onCleanup } from "solid-js"
import { ScrollList } from "../components/scroll-list.tsx"
import { useDialog } from "@opentui-ui/dialog/solid"
import { ConfirmDialog } from "../components/confirm-dialog.tsx"
import { PromptDialog } from "../components/prompt-dialog.tsx"
import { AlertDialog, formatGitError } from "../components/alert-dialog.tsx"
import { dialogConfig } from "../components/dialog-styles.ts"
import { DiffView } from "./diff.tsx"
import { repo, refreshStashes, refreshStatus } from "../../state/repo.ts"
import {
  stashApply,
  stashPop,
  stashDrop,
  stashSave,
  getDiff,
} from "../../core/git/commands.ts"
import { exec } from "../../lib/shell.ts"
import { withDialog } from "../../state/ui.ts"
import { parseDiff } from "../../core/git/parser.ts"
import { registerAction, unregisterAction } from "../../state/actions.ts"
import { config } from "../../state/config.ts"
import type { FileDiff, GitStash } from "../../core/git/types.ts"

// ── State ────────────────────────────────────────────────────

const [stashSelectedIndex, setStashSelectedIndex] = createSignal(0)
const [stashDiffView, setStashDiffView] = createSignal<FileDiff | null>(null)
const [viewingStash, setViewingStash] = createSignal(false)

// ── Actions (exported for global-keys) ───────────────────────

export async function viewStashContent(): Promise<void> {
  const stash = repo.stashes[stashSelectedIndex()]
  if (!stash) return

  try {
    // git stash show -p stash@{N}
    const { context_lines } = config().diff
    const args = ["git", "stash", "show", "-p"]
    if (context_lines !== undefined) args.push(`-U${context_lines}`)
    args.push(`stash@{${stash.index}}`)
    const result = await exec(args)
    if (result.ok) {
      const diffs = parseDiff(result.stdout)
      setStashDiffView(diffs[0] ?? null)
      setViewingStash(true)
    }
  } catch {
    // TODO: show error
  }
}

export function closeStashView(): void {
  setStashDiffView(null)
  setViewingStash(false)
}

export async function handleStashApply(): Promise<void> {
  const stash = repo.stashes[stashSelectedIndex()]
  if (!stash) return

  await stashApply(stash.index)
  await refreshStatus()
}

export async function handleStashPop(): Promise<void> {
  const stash = repo.stashes[stashSelectedIndex()]
  if (!stash) return

  await stashPop(stash.index)
  await refreshStashes()
  await refreshStatus()
}

export async function handleStashDrop(): Promise<void> {
  const stash = repo.stashes[stashSelectedIndex()]
  if (!stash) return

  await stashDrop(stash.index)
  await refreshStashes()
}

// Navigation exports
export function stashListLength(): number {
  return repo.stashes.length
}

export { stashSelectedIndex, setStashSelectedIndex, viewingStash }

// ── Component ────────────────────────────────────────────────

export function StashView() {
  const dialog = useDialog()

  onMount(() => {
    refreshStashes()

    registerAction("saveStash", promptSaveStash)
    registerAction("dropStash", confirmDropStash)
  })

  onCleanup(() => {
    unregisterAction("saveStash")
    unregisterAction("dropStash")
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

  // Save stash prompt
  async function promptSaveStash(): Promise<void> {
    const message = await withDialog(() => dialog.prompt<string>({
      content: (ctx) => () => (
        <PromptDialog
          title="Save Stash"
          label="Message (optional)"
          confirmLabel="save"
          allowEmpty={true}
          resolve={ctx.resolve}
          dismiss={ctx.dismiss}
          dialogId={ctx.dialogId}
        />
      ),
      ...dialogConfig(),
    }))

    if (message !== undefined) {
      try {
        await stashSave(message ?? undefined)
        await refreshStashes()
        await refreshStatus()
      } catch (err) {
        await showError("Save Stash Failed", err)
      }
    }
  }

  // Drop stash confirmation
  async function confirmDropStash(): Promise<void> {
    const stash = repo.stashes[stashSelectedIndex()]
    if (!stash) return

    const confirmed = await withDialog(() => dialog.confirm({
      content: (ctx) => () => (
        <ConfirmDialog
          title="Drop Stash"
          message={`Drop stash@{${stash.index}}: ${stash.message}?`}
          confirmLabel="drop"
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
        await handleStashDrop()
      } catch (err) {
        await showError("Drop Stash Failed", err)
      }
    }
  }

  return (
    <box flexDirection="column" flexGrow={1}>
      <Show
        when={!viewingStash()}
        fallback={
          <box flexDirection="column" flexGrow={1}>
            <text fg="#89b4fa">
              <b> Stash Content (Esc to go back) </b>
            </text>
            <DiffView fileDiff={stashDiffView()} />
          </box>
        }
      >
        {/* Stash list */}
        <ScrollList selectedRow={1 + stashSelectedIndex()} flexGrow={1}>
          <text fg="#6c7086">
            <b> STASH ({repo.stashes.length}) </b>
          </text>

          <Show
            when={repo.stashes.length > 0}
            fallback={<text fg="#6c7086"> No stash entries</text>}
          >
            <For each={repo.stashes}>
              {(stash, i) => {
                const isSelected = () => stashSelectedIndex() === i()
                return (
                  <box flexDirection="row" backgroundColor={isSelected() ? "#313244" : undefined}>
                    <text fg="#cdd6f4">{isSelected() ? "▸" : " "}</text>
                    <text fg="#f9e2af"> stash@{"{" + stash.index + "}"}</text>
                    <text fg="#6c7086"> on {stash.branch}</text>
                    <text fg="#cdd6f4"> {stash.message}</text>
                  </box>
                )
              }}
            </For>
          </Show>
        </ScrollList>
      </Show>
    </box>
  )
}
