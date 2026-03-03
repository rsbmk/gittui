# Branches View Redesign

**Date**: 2026-03-02
**Status**: Approved

## Problem

The branches view has critical bugs and UX issues:

1. **`[object Object]` bug**: `PromptDialog.onContentChange` receives an object, `String({})` produces `"[object Object]"` which gets passed to `createBranch()`. Git rejects it as invalid branch name.
2. **Silent failures**: `handleCheckout`, `handleMerge`, `handleRebase` lack try/catch. `executeAction()` does fire-and-forget on Promises — errors are swallowed.
3. **Sidebar duplicates main panel**: Both render the same `<BranchList>` with identical information.
4. **Missing operations**: No push, pull, fetch, rename, or set-upstream commands.
5. **Space key doesn't checkout**: Only `Enter` is bound to checkout in branches context.

## Design

### Bug Fixes

#### Fix 1: PromptDialog `[object Object]`

Use `ref.plainText` pattern (already working in commit-modal):

```tsx
let inputRef: any
// ...
<input
  ref={inputRef}
  value={props.initialValue ?? ""}
  onContentChange={() => {
    if (inputRef) setInput(inputRef.plainText)
  }}
/>
```

#### Fix 2: `executeAction` fire-and-forget

Add `.catch()` to Promise-returning handlers:

```tsx
function executeAction(action: string): void {
  const handler = ACTION_HANDLERS[action]
  if (handler) {
    const result = handler()
    if (result instanceof Promise) {
      result.catch((err) => {
        showStatusMessage(`Error: ${err instanceof Error ? err.message : String(err)}`, "error")
      })
    }
  }
}
```

This protects ALL async action handlers globally, not just branches.

#### Fix 3: Error handling in branch handlers

Add try/catch with `showStatusMessage` to `handleCheckout`, `handleMerge`, `handleRebase` in `branches.tsx`. These functions run outside the component scope so they cannot use dialog — status message is the appropriate feedback channel.

### Sidebar — Minimal, Scaneable

Two sections with headers, continuous navigation across them:

```
LOCAL (3)
  * main        ↑1
    feature-x
    testing

REMOTES (2)
    origin/main
    origin/testing
```

- Name only + `*` for current + `↑N ↓N` if tracking
- No upstream ref, no commit hash — that goes in the main panel
- Sections separated by headers
- Remove the cyclic filter (`f` key) — no longer needed with sections
- Navigation is continuous: j/k moves across both sections seamlessly

Implementation: Refactor `branch-list.tsx` to render sections with headers. The component receives `localBranches` and `remoteBranches` as separate props. Selection index is global across both sections (accounting for header rows).

### Main Panel — Branch Detail View

New component `branch-detail.tsx` showing:

```
  feature-x
  Upstream: origin/feature-x
  ↑2 ahead  ↓0 behind
  Last commit: abc1234 — Fix auth middleware (2h ago)

── Changed vs main ──────────────────────────────────────
  M  src/auth/middleware.ts
  A  src/auth/jwt.ts
  D  src/auth/session.ts

  3 files changed
```

- Header: branch name in accent color
- Tracking info: upstream + ahead/behind counts
- Last commit: hash + message + relative date
- Changed files: `git diff --name-status current..selected` (only for non-current branches)
- For current branch: show info without comparison section

New git command needed: `getBranchDiff(base, compare, cwd?)` → runs `git diff --name-status base..compare` and parses output.

### New Keybindings

| Key | Action | Description |
|-----|--------|-------------|
| `Enter`/`Space` | checkout | Checkout selected branch |
| `n` | newBranch | Create new branch (prompt) |
| `d` | deleteBranch | Delete branch |
| `D` | forceDeleteBranch | Force delete |
| `m` | merge | Merge into current |
| `r` | rebase | Rebase current onto |
| `P` | push | Push current branch |
| `p` | pull | Pull current branch |
| `F` | fetch | Fetch all remotes |
| `R` | renameBranch | Rename branch (prompt) |
| `u` | setUpstream | Set upstream tracking (prompt) |

### Push/Pull/Fetch

- Direct keybinding, no dialog/menu
- Loading indicator in status bar: `⟳ Pushing main...`
- Success feedback: `✓ Pushed main to origin/main`
- Error: show error via status message (same as checkout/merge failures)
- These operate on the CURRENT branch, not the selected branch

New git commands:
- `push(remote?, branch?, cwd?)` → `git push [remote] [branch]`
- `pull(remote?, cwd?)` → `git pull [remote]`
- `fetch(remote?, cwd?)` → `git fetch [remote | --all]`

State changes:
- Add `pushPullState` signal to repo state: `"idle" | "pushing" | "pulling" | "fetching"`
- Status bar reads this signal to show loading indicator

### Rename + Set Upstream

- `R` opens PromptDialog with current branch name pre-filled
- `u` opens PromptDialog asking for `remote/branch` (e.g. `origin/feature-x`)
- Both only work on local branches (guard against remote branches)

New git commands:
- `renameBranch(oldName, newName, cwd?)` → `git branch -m oldName newName`
- `setUpstream(branch, upstream, cwd?)` → `git branch --set-upstream-to=upstream branch`

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/ui/components/prompt-dialog.tsx` | Fix `[object Object]` — use ref.plainText |
| `src/ui/layout/global-keys.tsx` | Fix `executeAction` + add Space=checkout + new action handlers |
| `src/ui/views/branches.tsx` | Add try/catch to handlers, register new actions, refactor to use branch-detail |
| `src/ui/components/branch-list.tsx` | Refactor to minimal sidebar with LOCAL/REMOTES sections |
| `src/ui/views/branch-detail.tsx` | **NEW** — Branch detail panel |
| `src/ui/layout/sidebar.tsx` | Update branch rendering for new component API |
| `src/core/git/commands.ts` | Add push, pull, fetch, renameBranch, setUpstream, getBranchDiff |
| `src/state/repo.ts` | Add pushPullState, refreshBranches with sections |
| `src/state/keybindings.ts` | Add new bindings (P, p, F, R, u, space) |
| `src/ui/layout/status-bar.tsx` | Show push/pull/fetch loading indicator |

## Implementation Order

1. Bug fixes (PromptDialog, executeAction, branch handler error handling)
2. New git commands (push, pull, fetch, rename, setUpstream, branchDiff)
3. Sidebar refactor (minimal branch list with sections)
4. Branch detail panel (new component)
5. Keybindings + action wiring
6. Push/pull/fetch loading state + status bar
7. Rename + set upstream dialogs
8. Typecheck + tests
