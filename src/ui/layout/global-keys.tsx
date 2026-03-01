// src/ui/layout/global-keys.tsx
// Invisible component — handles all global and context-specific keyboard events

import { useKeyboard, useRenderer } from "@opentui/solid"
import { throttle } from "../../lib/perf.ts"
import { error as logError } from "../../lib/logger.ts"
import {
  switchToTab,
  toggleSidebar,
  switchPanel,
  activeTab,
  activePanel,
  setActivePanel,
  selectedIndex,
  setSelectedIndex,
  selectedFile,
  commandPaletteOpen,
  setCommandPaletteOpen,
  helpOverlayOpen,
  setHelpOverlayOpen,
  dialogOpen,
  TAB_ID,
  PANEL,
  type TabId,
} from "../../state/ui.ts"
import { findBinding } from "../../state/keybindings.ts"
import { repo, refreshStatus } from "../../state/repo.ts"
import {
  stageFile,
  unstageFile,
  stageAll as stageAllCmd,
  discardFile,
} from "../../core/git/commands.ts"
import { isSelectedFileStaged, nextHunk, prevHunk, stageCurrentHunk } from "../views/files.tsx"
import { scrollDiffDown, scrollDiffUp } from "../views/diff.tsx"
import { useCommitDialog } from "../components/commit-modal.tsx"
import { useAgentSelectDialog } from "../components/agent-select-modal.tsx"
import { executeAction as executeRegisteredAction } from "../../state/actions.ts"
import { detectInstalledAgents, generateCommitMessage } from "../../core/ai/agents.ts"
import type { AgentId } from "../../core/ai/types.ts"
import { getRawDiff } from "../../core/git/commands.ts"
import { config, setConfig } from "../../state/config.ts"
import { saveConfig } from "../../core/config/loader.ts"
import { showStatusMessage, setStatusMessage } from "../../state/ui.ts"
import {
  handleCheckout,
  handleMerge,
  handleRebase,
  cycleBranchFilter,
  branchListLength,
  branchSelectedIndex,
  setBranchSelectedIndex,
} from "../views/branches.tsx"
import {
  viewCommitDetail,
  closeCommitDetail,
  handleCherryPick,
  handleRevert,
  commitListLength,
  commitFileListLength,
  commitFileSelectedIndex,
  setCommitFileSelectedIndex,
  commitSelectedIndex,
  setCommitSelectedIndex,
  detailCommit,
  toggleCommitBody,
} from "../views/commits.tsx"
import {
  viewStashContent,
  closeStashView,
  handleStashApply,
  handleStashPop,
  handleStashDrop,
  stashListLength,
  stashSelectedIndex,
  setStashSelectedIndex,
  viewingStash,
} from "../views/stash.tsx"
import {
  handleSelectPR,
  handleClosePRDetail,
  handleViewFile as handlePRViewFile,
  handleOpenInBrowser,
  handleCycleFilter as handlePRCycleFilter,
  prSelectedIndex as prSelIdx,
  setPRSelectedIndex,
  prListLength,
  viewingPRDetail,
} from "../views/pull-requests.tsx"
import {
  prs,
  prFileSelectedIndex,
  setPRFileSelectedIndex,
} from "../../state/prs.ts"
import {
  settingsMoveFieldDown,
  settingsMoveFieldUp,
  settingsMoveSectionDown,
  settingsMoveSectionUp,
  settingsInteract,
  settingsOpenEditor,
} from "../views/settings.tsx"

// ── Number key → tab mapping ─────────────────────────────────

const KEY_TO_TAB: Record<string, TabId> = {
  "1": TAB_ID.FILES,
  "2": TAB_ID.BRANCHES,
  "3": TAB_ID.COMMITS,
  "4": TAB_ID.STASH,
  "5": TAB_ID.PRS,
  "6": TAB_ID.SETTINGS,
}

// ── List length per tab ──────────────────────────────────────

function currentListLength(): number {
  const tab = activeTab()
  switch (tab) {
    case TAB_ID.FILES: {
      const s = repo.status
      if (!s) return 0
      return s.unstaged.length + s.untracked.length + s.staged.length
    }
    case TAB_ID.BRANCHES:
      return branchListLength()
    case TAB_ID.COMMITS:
      if (activePanel() === PANEL.MAIN) return commitFileListLength()
      return commitListLength()
    case TAB_ID.STASH:
      return stashListLength()
    case TAB_ID.PRS:
      // When viewing detail, navigate files; otherwise navigate PR list
      if (viewingPRDetail()) return prs.files.length
      return prListLength()
    case TAB_ID.SETTINGS:
      return 0
    default:
      return 0
  }
}

// ── Selection getter/setter per tab ──────────────────────────

function getSelectedIndex(): number {
  switch (activeTab()) {
    case TAB_ID.FILES:
      return selectedIndex()
    case TAB_ID.BRANCHES:
      return branchSelectedIndex()
    case TAB_ID.COMMITS:
      if (activePanel() === PANEL.MAIN) return commitFileSelectedIndex()
      return commitSelectedIndex()
    case TAB_ID.STASH:
      return stashSelectedIndex()
    case TAB_ID.PRS:
      if (viewingPRDetail()) return prFileSelectedIndex()
      return prSelIdx()
    case TAB_ID.SETTINGS:
      return 0
    default:
      return 0
  }
}

function setCurrentSelectedIndex(idx: number | ((prev: number) => number)): void {
  switch (activeTab()) {
    case TAB_ID.FILES:
      setSelectedIndex(idx as any)
      break
    case TAB_ID.BRANCHES:
      setBranchSelectedIndex(typeof idx === "function" ? idx(branchSelectedIndex()) : idx)
      break
    case TAB_ID.COMMITS:
      if (activePanel() === PANEL.MAIN) {
        setCommitFileSelectedIndex(typeof idx === "function" ? idx(commitFileSelectedIndex()) : idx)
      } else {
        setCommitSelectedIndex(typeof idx === "function" ? idx(commitSelectedIndex()) : idx)
      }
      break
    case TAB_ID.STASH:
      setStashSelectedIndex(typeof idx === "function" ? idx(stashSelectedIndex()) : idx)
      break
    case TAB_ID.PRS:
      if (viewingPRDetail()) {
        setPRFileSelectedIndex(typeof idx === "function" ? idx(prFileSelectedIndex()) : idx)
      } else {
        setPRSelectedIndex(typeof idx === "function" ? idx(prSelIdx()) : idx)
      }
      break
    case TAB_ID.SETTINGS:
      break
  }
}

// ── File action handlers ─────────────────────────────────────

async function handleStageToggle(): Promise<void> {
  if (activePanel() === PANEL.MAIN) {
    await stageCurrentHunk()
    return
  }

  const path = selectedFile()
  if (!path) return

  try {
    if (isSelectedFileStaged()) {
      await unstageFile(path)
    } else {
      await stageFile(path)
    }
    await refreshStatus()
  } catch (err) {
    logError("Failed to toggle staging", { error: err instanceof Error ? err.message : String(err) })
  }
}

async function handleStageAll(): Promise<void> {
  try {
    await stageAllCmd()
    await refreshStatus()
  } catch (err) {
    logError("Failed to stage all files", { error: err instanceof Error ? err.message : String(err) })
  }
}

async function handleDiscard(): Promise<void> {
  const path = selectedFile()
  if (!path) return

  try {
    await discardFile(path)
    await refreshStatus()
  } catch (err) {
    logError("Failed to discard file", { path, error: err instanceof Error ? err.message : String(err) })
  }
}

// ── Action dispatcher ────────────────────────────────────────

const ACTION_HANDLERS: Record<string, () => void | Promise<void>> = {
  // Files
  stage: handleStageToggle,
  stageAll: handleStageAll,
  discard: handleDiscard,
  nextHunk,
  prevHunk,
  stageHunk: stageCurrentHunk,

  // Branches
  checkout: handleCheckout,
  merge: handleMerge,
  rebase: handleRebase,
  filter: cycleBranchFilter,

  // Commits
  viewCommit: viewCommitDetail,
  toggleBody: toggleCommitBody,
  cherryPick: handleCherryPick,
  revert: handleRevert,

  // Stash
  viewStash: viewStashContent,
  applyStash: handleStashApply,
  popStash: handleStashPop,
  dropStash: handleStashDrop,

  // PRs
  viewPR: handleSelectPR,
  viewPRFile: handlePRViewFile,
  openInBrowser: handleOpenInBrowser,
  filterPRs: handlePRCycleFilter,
}

function executeAction(action: string): void {
  const handler = ACTION_HANDLERS[action]
  if (handler) handler()
}

// ── Component ────────────────────────────────────────────────

export function GlobalKeyHandler() {
  const renderer = useRenderer()
  const { openCommitDialog } = useCommitDialog()
  const { openAgentSelectDialog } = useAgentSelectDialog()

  // Register commit handler
  ACTION_HANDLERS["commit"] = async () => {
    await openCommitDialog()
  }

  // Register AI commit handler
  ACTION_HANDLERS["ai-commit"] = async () => {
    // 1. Check staged files
    const staged = repo.status?.staged ?? []
    if (staged.length === 0) {
      showStatusMessage("No staged files to commit")
      return
    }

    // 2. Resolve agent
    let agentId = config().ai.agent
    if (!agentId) {
      const installed = await detectInstalledAgents()
      if (installed.length === 0) {
        showStatusMessage("No AI agent found. Install claude, opencode, codex, or gemini")
        return
      }

      // Show selection dialog
      const selected = await openAgentSelectDialog(installed)
      if (!selected) return // user cancelled

      agentId = selected

      // Persist to config
      const cfg = structuredClone(config())
      cfg.ai = { ...cfg.ai, agent: agentId }
      setConfig(cfg)
      await saveConfig(cfg)
    }

    // 3. Generate — persistent status until completion
    setStatusMessage("Generating commit message...")
    try {
      const diff = await getRawDiff({ staged: true })
      if (!diff.trim()) {
        showStatusMessage("Staged diff is empty")
        return
      }

      const result = await generateCommitMessage(agentId as AgentId, diff, config().ai.commit_prompt)

      // 4. Clear status and open commit modal with pre-filled message
      setStatusMessage(null)
      await openCommitDialog(result.message)
    } catch (err) {
      showStatusMessage(`Failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // Register command palette handler
  ACTION_HANDLERS["commandPalette"] = () => {
    setCommandPaletteOpen(true)
  }

  // Register help overlay handler
  ACTION_HANDLERS["showHelp"] = () => {
    setHelpOverlayOpen(true)
  }

  // ── Should main panel scroll a diff or navigate a list? ────
  // Files tab always scrolls diff. Stash tab scrolls when viewing content.
  // Commits tab scrolls when user enters diff scroll mode (Enter).
  function mainPanelHasDiff(): boolean {
    const tab = activeTab()
    if (tab === TAB_ID.FILES) return true
    if (tab === TAB_ID.STASH && viewingStash()) return true

    return false
  }

  // Throttled navigation to prevent rapid-fire key presses
  const throttledMoveDown = throttle(() => {
    if (activePanel() === PANEL.MAIN && mainPanelHasDiff()) {
      scrollDiffDown()
      return
    }
    const max = currentListLength()
    if (max > 0) {
      setCurrentSelectedIndex((prev) => Math.min(prev + 1, max - 1))
    }
  }, 50)

  const throttledMoveUp = throttle(() => {
    if (activePanel() === PANEL.MAIN && mainPanelHasDiff()) {
      scrollDiffUp()
      return
    }
    setCurrentSelectedIndex((prev) => Math.max(prev - 1, 0))
  }, 50)

  useKeyboard((key) => {
    // Don't intercept keys when overlays or dialogs are open
    if (commandPaletteOpen() || helpOverlayOpen() || dialogOpen()) return

    // Handle Escape for detail/sub views
    if (key.name === "escape") {
      if (activeTab() === TAB_ID.COMMITS && detailCommit() !== null) {
        closeCommitDetail()
        return
      }
      if (activeTab() === TAB_ID.STASH && viewingStash()) {
        closeStashView()
        return
      }
      if (activeTab() === TAB_ID.PRS && viewingPRDetail()) {
        handleClosePRDetail()
        return
      }
    }

    // Tab switching: 1-5
    const tab = KEY_TO_TAB[key.name]
    if (tab) {
      switchToTab(tab)
      return
    }

    // ── Settings tab — custom navigation ─────────────────────
    if (activeTab() === TAB_ID.SETTINGS) {
      switch (key.name) {
        case "tab":
          switchPanel()
          return
        case "ctrl+b":
          toggleSidebar()
          return
        case ":":
          setCommandPaletteOpen(true)
          return
        case "?":
          setHelpOverlayOpen(true)
          return
        case "q":
          renderer.destroy()
          process.exit(0)
          return
        case "j":
        case "down":
          if (activePanel() === PANEL.SIDEBAR) settingsMoveSectionDown()
          else settingsMoveFieldDown()
          return
        case "k":
        case "up":
          if (activePanel() === PANEL.SIDEBAR) settingsMoveSectionUp()
          else settingsMoveFieldUp()
          return
        case "h":
        case "left":
          if (activePanel() === PANEL.MAIN) {
            settingsInteract("prev")
          } else {
            setActivePanel(PANEL.SIDEBAR)
          }
          return
        case "l":
        case "right":
          if (activePanel() === PANEL.MAIN) {
            settingsInteract("next")
          } else {
            setActivePanel(PANEL.MAIN)
          }
          return
        case "return":
          if (activePanel() === PANEL.SIDEBAR) {
            setActivePanel(PANEL.MAIN)
          } else {
            settingsInteract("toggle")
          }
          return
        case "space":
          if (activePanel() === PANEL.MAIN) {
            settingsInteract("toggle")
          }
          return
        case "e":
          settingsOpenEditor()
          return
      }
      return
    }

    // Global navigation
    switch (key.name) {
      case "tab":
        switchPanel()
        return
      case "ctrl+b":
        toggleSidebar()
        return
      case ":":
        setCommandPaletteOpen(true)
        return
      case "?":
        setHelpOverlayOpen(true)
        return
      case "q":
        renderer.destroy()
        process.exit(0)
        return
      case "h":
        setActivePanel(PANEL.SIDEBAR)
        return
      case "l":
        setActivePanel(PANEL.MAIN)
        return
      case "j":
      case "down":
        throttledMoveDown()
        return
      case "k":
      case "up":
        throttledMoveUp()
        return
    }

    // Build effective key name — shift+letter → uppercase (e.g. shift+c → "C")
    const effectiveKey = key.shift && key.name.length === 1 && key.name >= "a" && key.name <= "z"
      ? key.name.toUpperCase()
      : key.name

    // Context-specific bindings
    const binding = findBinding(effectiveKey, activeTab())
    if (binding && binding.context !== "global") {
      // Try registered dialog handlers first, then static handlers
      if (!executeRegisteredAction(binding.action)) {
        executeAction(binding.action)
      }
    }
  })

  return null
}
