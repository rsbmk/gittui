# AI Commit Message — Implementation Plan

Based on [design doc](./2026-03-01-ai-commit-message-design.md).

## Phase 1: Core AI module (`src/core/ai/`)

No UI changes. Pure logic, fully testable.

### Step 1.1: Create `src/core/ai/types.ts`

Define the const object + type extraction pattern for agent IDs:

```typescript
export const AGENT_ID = {
  CLAUDE: "claude",
  OPENCODE: "opencode",
  CODEX: "codex",
  GEMINI: "gemini",
} as const
export type AgentId = (typeof AGENT_ID)[keyof typeof AGENT_ID]
```

Define interfaces:

```typescript
export interface AgentDefinition {
  id: AgentId
  name: string
  binary: string
  buildArgs(prompt: string): string[]
}

export interface GenerateResult {
  message: string
  agentId: AgentId
}
```

File header: `// src/core/ai/types.ts` + `// AI agent type definitions — const object pattern, no enums`

### Step 1.2: Create `src/core/ai/commit-prompt.ts`

Export two functions:

```typescript
export const DEFAULT_COMMIT_PROMPT = `Generate a git commit message for the following staged changes.

Rules:
- Use conventional commits format: <type>(<scope>): <description>
- Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore
- Scope is optional, use it when changes are focused on one module
- Description: imperative mood, lowercase, max 72 chars, no period at end
- Add a body (separated by blank line) only if changes are complex
- Body lines wrap at 72 characters
- Respond ONLY with the commit message text
- No markdown fences, no explanation, no preamble

Staged diff:
`

export async function loadCommitPrompt(customPath: string | null): Promise<string>
```

`loadCommitPrompt` checks if `customPath` is set and the file exists (`Bun.file().exists()`), reads it if so, otherwise returns `DEFAULT_COMMIT_PROMPT`.

### Step 1.3: Create `src/core/ai/agents.ts`

This is the main file. Depends on `types.ts`, `commit-prompt.ts`, and `../lib/shell.ts` (`exec`).

**Agent registry** — `AGENTS` array with all 4 agent definitions:

```typescript
const AGENTS: AgentDefinition[] = [
  {
    id: AGENT_ID.CLAUDE,
    name: "Claude Code",
    binary: "claude",
    buildArgs: (prompt) => ["-p", prompt, "--output-format", "text"],
  },
  {
    id: AGENT_ID.OPENCODE,
    name: "OpenCode",
    binary: "opencode",
    buildArgs: (prompt) => ["run", prompt],
  },
  {
    id: AGENT_ID.CODEX,
    name: "Codex CLI",
    binary: "codex",
    buildArgs: (prompt) => ["exec", prompt],
  },
  {
    id: AGENT_ID.GEMINI,
    name: "Gemini CLI",
    binary: "gemini",
    buildArgs: (prompt) => ["-p", prompt, "--output-format", "text"],
  },
]
```

**Functions to implement:**

1. `getAgent(id: AgentId): AgentDefinition` — Find agent by ID from registry. Throws if not found.

2. `getAllAgents(): AgentDefinition[]` — Returns full AGENTS array (for selection dialog).

3. `detectInstalledAgents(): Promise<AgentDefinition[]>` — For each agent in AGENTS, run `exec(["which", agent.binary])`. If exit code 0, include in results. Return all found agents.

4. `cleanAgentOutput(raw: string): string` — Pipeline:
   - Trim whitespace
   - Remove markdown fences: strip lines matching ``` at start/end
   - Remove preamble lines like "Here is the commit message:" or "Commit message:"
   - Return cleaned string

5. `generateCommitMessage(agentId: AgentId, diff: string, customPromptPath?: string | null): Promise<GenerateResult>` — Main function:
   - Load prompt via `loadCommitPrompt(customPromptPath)`
   - Get agent definition via `getAgent(agentId)`
   - Build command: `[agent.binary, ...agent.buildArgs(prompt)]`
   - Execute via `Bun.spawn()` directly (NOT `exec()` from shell.ts) because we need to pipe stdin:
     ```typescript
     const proc = Bun.spawn([agent.binary, ...agent.buildArgs(prompt)], {
       stdin: new Blob([diff]),
       stdout: "pipe",
       stderr: "pipe",
     })
     ```
   - Set timeout: 60 seconds via `setTimeout` + `proc.kill()`
   - Read stdout, clean output via `cleanAgentOutput()`
   - If empty after cleanup → throw error
   - Return `{ message, agentId }`

**Important**: Use `Bun.spawn` with `stdin: new Blob([diff])` to pipe the diff. This is different from the project's `exec()` in `shell.ts` which doesn't support stdin piping. Do NOT modify `shell.ts` — keep the AI-specific spawn logic in `agents.ts`.

### Step 1.4: Tests — `src/core/ai/__tests__/agents.test.ts`

Test cases:

```
describe("cleanAgentOutput")
  - test("trims whitespace")
  - test("removes markdown code fences")
  - test("removes triple backtick fences with language tag")
  - test("removes preamble lines like 'Here is the commit message:'")
  - test("returns empty string for whitespace-only input")
  - test("preserves multi-line commit body")

describe("getAgent")
  - test("returns agent definition by id")
  - test("throws for unknown agent id")

describe("getAllAgents")
  - test("returns all 4 supported agents")

describe("buildArgs")
  - test("claude builds correct args with -p and --output-format text")
  - test("opencode builds correct args with run subcommand")
  - test("codex builds correct args with exec subcommand")
  - test("gemini builds correct args with -p and --output-format text")
```

No tests for `detectInstalledAgents` or `generateCommitMessage` (require real binaries/network).

**Checkpoint**: Run `bun test src/core/ai` and `bun run typecheck` — everything must pass.

---

## Phase 2: Config extension

### Step 2.1: Update `src/core/config/schema.ts`

Add after the existing `GithubConfig` interface:

```typescript
export interface AIConfig {
  agent: string | null
  commit_prompt: string | null
}
```

Add `ai: AIConfig` to `GuitConfig` interface.

Note: Use `string | null` instead of `AgentId | null` to avoid importing from `core/ai/types.ts`. The validation happens at runtime in `agents.ts`, not in the config schema. This keeps config decoupled from AI types.

### Step 2.2: Update `src/core/config/defaults.ts`

Add to `DEFAULT_CONFIG`:

```typescript
ai: {
  agent: null,
  commit_prompt: null,
},
```

**Checkpoint**: Run `bun run typecheck` — must pass. The `deepMerge` in `loader.ts` handles the new section automatically.

---

## Phase 3: Keybinding + action wiring

### Step 3.1: Add keybinding in `src/state/keybindings.ts`

Add to `FILES_BINDINGS` array:

```typescript
{ key: "C", action: "ai-commit", context: "files", description: "AI commit" },
```

### Step 3.2: Add hint in `src/ui/layout/keybinding-bar.tsx`

Add `"ai-commit"` to the `files` array in `PRIORITY_ACTIONS`:

```typescript
files: ["stage", "stageAll", "commit", "ai-commit", "discard", "switchPanel", "quit"],
```

This may push past 6 visible hints. That's fine — the `slice(0, 6)` already handles overflow. If `"ai-commit"` is at position 4, it replaces `discard` in the visible set, which is acceptable since `discard` is less common.

### Step 3.3: Handle action in `src/ui/layout/global-keys.tsx`

This is the most complex step. The handler needs to:

1. Import AI functions: `detectInstalledAgents`, `generateCommitMessage`, `getAgent`, `getAllAgents` from `../../core/ai/agents.ts`
2. Import config access: `config` signal from `../../state/config.ts`, `saveConfig` from `../../core/config/loader.ts`
3. Import `loadCommitPrompt` from `../../core/ai/commit-prompt.ts`

Register the handler inside `GlobalKeyHandler()` (like the commit handler):

```typescript
ACTION_HANDLERS["ai-commit"] = async () => {
  // 1. Check staged files
  const staged = repo.status?.staged ?? []
  if (staged.length === 0) {
    setStatusMessage("No staged files to commit")
    return
  }

  // 2. Resolve agent
  let agentId = config().ai.agent
  if (!agentId) {
    const installed = await detectInstalledAgents()
    if (installed.length === 0) {
      setStatusMessage("No AI agent found. Install claude, opencode, codex, or gemini")
      return
    }
    // Show selection dialog
    // ... (see Step 3.4)
    agentId = selectedAgentId
    // Persist to config
    const cfg = { ...config() }
    cfg.ai = { ...cfg.ai, agent: agentId }
    setConfig(cfg)
    await saveConfig(cfg)
  }

  // 3. Generate
  setStatusMessage("Generating commit message...")
  try {
    const diff = await getDiff({ staged: true }) // raw diff string
    const result = await generateCommitMessage(agentId, diff, config().ai.commit_prompt)
    // 4. Open commit modal with pre-filled message
    await openCommitDialog(result.message)
  } catch (err) {
    setStatusMessage(`Failed: ${err instanceof Error ? err.message : String(err)}`)
  }
}
```

**Status bar message**: We need a signal for transient status messages. Add to `src/state/ui.ts`:

```typescript
export const [statusMessage, setStatusMessage] = createSignal<string | null>(null)
```

The status bar (`keybinding-bar.tsx` or a new component) shows this when non-null, clearing after 5 seconds via `setTimeout`.

### Step 3.4: Agent selection dialog

For the first-use agent selection, use the existing dialog system (`useDialog`). Create a simple selection using `dialog.prompt<string>()` that shows the detected agents as a list.

Since we need `useDialog()` (which requires being inside a component), and the handler is registered inside `GlobalKeyHandler` (which is inside `DialogProvider`), we can use the same pattern as `openCommitDialog`.

Create a new component `AgentSelectContent` (can live inside `global-keys.tsx` as a local component or in a new file `src/ui/components/agent-select-modal.tsx`):

```typescript
function AgentSelectContent(props: PromptContext<string> & { agents: AgentDefinition[] }) {
  const [selectedIdx, setSelectedIdx] = createSignal(0)

  useDialogKeyboard((key) => {
    if (key.name === "escape") props.dismiss()
    if (key.name === "return") props.resolve(props.agents[selectedIdx()]!.id)
    if (key.name === "j" || key.name === "down") setSelectedIdx(i => Math.min(i + 1, props.agents.length - 1))
    if (key.name === "k" || key.name === "up") setSelectedIdx(i => Math.max(i - 1, 0))
  }, props.dialogId)

  return (
    <box flexDirection="column" gap={1}>
      <text fg={color("accent")}><b>Select AI Agent</b></text>
      <For each={props.agents}>
        {(agent, idx) => (
          <text fg={idx() === selectedIdx() ? color("accent") : color("fg")}>
            {idx() === selectedIdx() ? "▸ " : "  "}{agent.name} ({agent.binary})
          </text>
        )}
      </For>
      <box flexDirection="row" gap={2}>
        <text fg={color("accent")}>[Enter]</text><text fg={color("muted")}> select</text>
        <text fg={color("accent")}>[Esc]</text><text fg={color("muted")}> cancel</text>
      </box>
    </box>
  )
}
```

**Recommendation**: Put this in `src/ui/components/agent-select-modal.tsx` following the pattern of `commit-modal.tsx` — export a `useAgentSelectDialog()` hook.

### Step 3.5: Get raw diff for piping

We need the raw `git diff --cached` output (plain text, NOT parsed into `FileDiff[]`). The existing `getDiff()` in `commands.ts` returns parsed `FileDiff[]`. We need a raw version.

Add to `src/core/git/commands.ts`:

```typescript
export async function getRawDiff(opts?: { staged?: boolean; path?: string }): Promise<string> {
  const args = ["diff"]
  if (opts?.staged) args.push("--cached")
  if (opts?.path) args.push("--", opts.path)
  return run(args)
}
```

This returns the raw diff text that gets piped to the AI agent.

### Step 3.6: Update commit modal to accept pre-filled message

Modify `useCommitDialog()` in `commit-modal.tsx` to accept an optional initial message:

```typescript
export function useCommitDialog() {
  const dialog = useDialog()

  async function openCommitDialog(initialMessage?: string): Promise<string | undefined> {
    return withDialog(() => dialog.prompt<string>({
      content: (ctx) => () => (
        <CommitDialogContent
          resolve={ctx.resolve}
          dismiss={ctx.dismiss}
          dialogId={ctx.dialogId}
          initialMessage={initialMessage}
        />
      ),
      ...dialogConfig(),
    }))
  }

  return { openCommitDialog }
}
```

Update `CommitDialogContent` props and `createSignal`:

```typescript
interface CommitDialogContentProps extends PromptContext<string> {
  initialMessage?: string
}

function CommitDialogContent(props: CommitDialogContentProps) {
  const [message, setMessage] = createSignal(props.initialMessage ?? "")
  // ...
  // Update textarea:
  <textarea
    initialValue={props.initialMessage ?? ""}
    // ... rest unchanged
  />
}
```

**Checkpoint**: Run `bun run typecheck` — must pass.

---

## Phase 4: Status bar integration

### Step 4.1: Add status message signal

In `src/state/ui.ts`, add:

```typescript
export const [statusMessage, setStatusMessage] = createSignal<string | null>(null)

export function showStatusMessage(msg: string, durationMs = 5000): void {
  setStatusMessage(msg)
  setTimeout(() => setStatusMessage(null), durationMs)
}
```

### Step 4.2: Show status in keybinding bar

In `keybinding-bar.tsx`, when `statusMessage()` is non-null, show it instead of (or alongside) keybinding hints:

```typescript
<Show when={statusMessage()}>
  <text fg={color("warning")}>{statusMessage()}</text>
</Show>
```

The status message takes priority over hints — when generating, the user sees "Generating commit message..." instead of the keybinding list.

**Checkpoint**: Run `bun run typecheck` — must pass.

---

## Phase 5: Integration + manual testing

### Step 5.1: Wire everything together

Verify the full flow:
1. `C` keypress → `ai-commit` action
2. Staged files check
3. Agent resolution (config or detect + dialog)
4. Status bar spinner
5. `getRawDiff({ staged: true })`
6. `generateCommitMessage(agentId, diff, config().ai.commit_prompt)`
7. `cleanAgentOutput()`
8. `openCommitDialog(result.message)`
9. Pre-filled textarea, user edits, Enter to commit

### Step 5.2: Manual test scenarios

Test with at least one installed agent:

1. **Happy path**: Stage files → `C` → agent generates message → modal opens with message → edit → Enter → commit succeeds
2. **First-time selection**: Clear `[ai].agent` from config → `C` → selection dialog appears → select agent → config persisted → generation runs
3. **No staged files**: `C` with nothing staged → error in status bar
4. **Agent timeout**: Disconnect network → `C` → 60s timeout → error in status bar
5. **Custom prompt**: Create `~/.config/guit/commit-prompt.md` → `C` → verify custom prompt is used

### Step 5.3: Final checks

```bash
bun test                  # All tests pass (existing + new)
bun run typecheck         # No type errors
```

---

## File summary

| File | Action | Phase |
|------|--------|-------|
| `src/core/ai/types.ts` | CREATE | 1 |
| `src/core/ai/commit-prompt.ts` | CREATE | 1 |
| `src/core/ai/agents.ts` | CREATE | 1 |
| `src/core/ai/__tests__/agents.test.ts` | CREATE | 1 |
| `src/core/config/schema.ts` | MODIFY — add AIConfig + ai field | 2 |
| `src/core/config/defaults.ts` | MODIFY — add ai defaults | 2 |
| `src/state/keybindings.ts` | MODIFY — add C/ai-commit binding | 3 |
| `src/ui/layout/keybinding-bar.tsx` | MODIFY — add ai-commit hint + status | 3, 4 |
| `src/ui/layout/global-keys.tsx` | MODIFY — add ai-commit handler | 3 |
| `src/ui/components/agent-select-modal.tsx` | CREATE | 3 |
| `src/ui/components/commit-modal.tsx` | MODIFY — accept initialMessage | 3 |
| `src/core/git/commands.ts` | MODIFY — add getRawDiff() | 3 |
| `src/state/ui.ts` | MODIFY — add statusMessage signal | 4 |
