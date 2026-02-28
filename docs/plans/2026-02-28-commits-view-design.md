# Commits View — Master-Detail Redesign

**Date:** 2026-02-28
**Status:** Approved

## Problem

The Commits tab shows essentially the same information in both the sidebar
(compact: shortHash + truncated message) and the main panel (expanded:
shortHash + author + date + message + refs). This is redundant — the main
panel adds minimal value. Additionally, the commit detail view
(`viewCommitDetail()`) is a non-functional stub that never shows real diffs.

## Solution

Transform the Commits tab from a dual-list layout into a **master-detail**
pattern, consistent with how the Files view works:

- **Sidebar (master)**: Compact commit list (unchanged)
- **Main panel (detail)**: Immediately shows detail of the selected commit
  as the user navigates the sidebar — no Enter required

## Main Panel Layout

### Fixed Header

Non-scrollable metadata block at the top:

```
3725140  feat(chore): update configuration files
Roberto Bocio Melo <rob@email.com> · 8 hours ago
[HEAD → main] [tag: v1.0.0]
+42 -15 · 3 files changed

This commit refactors the config loading to support
multiple environments and adds validation...
```

**Line 1**: shortHash (yellow #f9e2af) + message (white #cdd6f4)
**Line 2**: author (gray #6c7086) + email (dark gray #585b70) + · + relativeDate
**Line 3**: refs as badges (blue #89b4fa) — omitted if none
**Line 4**: stats — insertions (green #a6e3a1) + deletions (red #f38ba8) + file count
**Line 5+**: commit body (if present) — truncated to ~3 lines

### Scrollable Content

#### File Tree

Reuses the existing `FileTree` component with directory tree structure:

- Status icons color-coded: M (yellow), A (green), D (red), R (blue)
- Per-file stats (+insertions -deletions) aligned right
- Collapsible directories
- Navigation with j/k when focused
- Selecting a file updates the diff below

#### Diff View

Reuses the existing `DiffView` component:

- Unified view (default) or split
- Line numbers
- Scroll via `<scrollbox>`
- Takes remaining vertical space with `flexGrow: 1`

File tree height: min 3 lines, max ~8 lines proportional to file count.

## Interaction

### Focus Zones

1. **Sidebar**: Navigate commits (j/k). Selection updates main panel immediately.
2. **File tree**: Navigate files (j/k). Selection updates diff.
3. **Diff view**: Scroll diff content.

Tab switches focus between sidebar and main panel (existing behavior).

### Keybindings (unchanged)

- `c` — cherry-pick selected commit
- `r` — revert selected commit
- `/` — search/filter commits

### Data Loading

On commit selection change:

1. `getCommitFiles(hash)` — populates file tree
2. `getCommitDiff(hash)` — loads diff for first/selected file

Optional debounce for rapid navigation.

## Backend Changes

### New: `getCommitDiff(hash, path?)`

Wraps `git diff <hash>^..<hash> [-- path]`.
Returns parsed output via existing `parseDiff()`.

### Updated: `getCommitFiles(hash)`

Change from `--name-only` to `--name-status`.
Parse status code (M/A/D/R) with path.
Return `GitFile[]` instead of `string[]`.

### New: `getCommitStats(hash)`

Wraps `git diff --stat <hash>^..<hash>`.
Parses total insertions/deletions and file count.
Alternative: extract from `git show --stat`.

## Edge Cases

- **Empty/merge commits**: Show header with "No files changed" message
- **Long commit bodies**: Truncate to 3 lines with "..." indicator
- **Large diffs (many files)**: File tree scrolls independently
- **Binary files**: DiffView already handles binary detection
- **First commit (no parent)**: Use `git diff --root <hash>` for diff
