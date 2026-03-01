# AI Commit Message Generation

Generate commit messages automatically using terminal AI coding agents.

## Problem

Writing good commit messages takes effort. Users of guit already have AI coding agents installed (Claude Code, OpenCode, Codex CLI, Gemini CLI). We can leverage these agents in non-interactive mode to generate commit messages from staged diffs.

## Approach: Agent CLI Wrapper

Execute the user's preferred AI agent as a subprocess via `Bun.spawn()`, piping `git diff --cached` as context. No direct LLM API calls — we reuse whatever the user already has configured (API keys, models, skills, CLAUDE.md, etc.).

### Why not direct API calls?

- Duplicates config the user already has in their agent
- Requires managing API keys (security burden)
- Loses agent-specific context (skills, project memory, CLAUDE.md)
- More dependencies to maintain

## Supported Agents

| Agent | Binary | Headless command | Stdin pipe | Output format |
|-------|--------|-----------------|------------|---------------|
| Claude Code | `claude` | `claude -p "<prompt>"` | Yes | `--output-format text` |
| OpenCode | `opencode` | `opencode run "<prompt>"` | Yes | text (default) |
| Codex CLI | `codex` | `codex exec "<prompt>"` | Yes | stdout |
| Gemini CLI | `gemini` | `gemini -p "<prompt>"` | Yes | `--output-format text` |

## Architecture

New module `src/core/ai/` (leaf module — no ui/ or state/ imports):

```
src/core/ai/
  types.ts          # AgentId, AgentDefinition interfaces
  agents.ts         # Agent registry, detection, execution
  commit-prompt.ts  # Built-in prompt for commit message generation
```

### types.ts

```typescript
export const AGENT_ID = {
  CLAUDE: "claude",
  OPENCODE: "opencode",
  CODEX: "codex",
  GEMINI: "gemini",
} as const
export type AgentId = (typeof AGENT_ID)[keyof typeof AGENT_ID]

export interface AgentDefinition {
  id: AgentId
  name: string          // Display name: "Claude Code"
  binary: string        // Executable name: "claude"
  buildArgs(prompt: string): string[]
}

export interface GenerateResult {
  message: string       // The generated commit message
  agentId: AgentId      // Which agent produced it
}
```

### agents.ts

Core functions:

- **`detectInstalledAgents(): Promise<AgentDefinition[]>`** — Checks PATH for each supported agent binary via `which`. Returns list of detected agents.

- **`generateCommitMessage(agentId: AgentId, diff: string, customPrompt?: string): Promise<GenerateResult>`** — Spawns the agent process with the prompt, pipes diff via stdin, captures stdout. Timeout: 60 seconds. Cleans output (strips markdown fences, trims whitespace).

Agent command construction:

```typescript
const AGENTS: AgentDefinition[] = [
  {
    id: "claude",
    name: "Claude Code",
    binary: "claude",
    buildArgs: (prompt) => ["-p", prompt, "--output-format", "text"],
  },
  {
    id: "opencode",
    name: "OpenCode",
    binary: "opencode",
    buildArgs: (prompt) => ["run", prompt],
  },
  {
    id: "codex",
    name: "Codex CLI",
    binary: "codex",
    buildArgs: (prompt) => ["exec", prompt],
  },
  {
    id: "gemini",
    name: "Gemini CLI",
    binary: "gemini",
    buildArgs: (prompt) => ["-p", prompt, "--output-format", "text"],
  },
]
```

### commit-prompt.ts

Built-in prompt (conventional commits style):

```
Generate a git commit message for the following staged changes.

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
```

The diff is appended after this prompt via stdin pipe.

**Custom prompt override**: User can place a file at `~/.config/guit/commit-prompt.md` to replace the built-in prompt entirely.

## Config Extension

Add `ai` section to `GuitConfig` in `schema.ts`:

```typescript
export interface AIConfig {
  agent: AgentId | null
  commit_prompt: string | null  // path to custom prompt file
}
```

In `defaults.ts`:
```typescript
ai: {
  agent: null,          // null = trigger selection dialog on first use
  commit_prompt: null,  // null = use built-in prompt
}
```

In `config.toml`:
```toml
[ai]
agent = "claude"
# commit_prompt = "~/.config/guit/commit-prompt.md"
```

## User Flow

```
1. User has staged files in Files tab
2. Presses 'C' (shift+c) — keybinding: "ai-commit" in files context
3. Validation:
   - No staged files → error in status bar: "No staged files"
   - No agent configured AND none detected → error: "No AI agent found"
4. Agent selection (first time only):
   - config.ai.agent is null → detect installed agents
   - 1+ found → show selection dialog (list of detected agents)
   - User selects → save to config.toml, continue
5. Status bar shows: "⟳ Generating commit message..." (non-blocking)
6. Background execution:
   a. Get staged diff: git diff --cached
   b. Build prompt (built-in or custom)
   c. Spawn agent: <binary> <args> with diff piped to stdin
   d. Capture stdout, clean output
7. On completion:
   - Success → open commit modal with message pre-filled in textarea
   - Failure → show error in status bar, do NOT open modal
8. User can edit the pre-filled message and press Enter to commit
```

## Keybinding

```typescript
// In FILES_BINDINGS (keybindings.ts)
{ key: "C", action: "ai-commit", context: "files" }
```

Hint in keybinding bar: `[C] AI commit`

## Error Handling

| Error | Behavior |
|-------|----------|
| No staged files | Status bar: "No staged files to commit" |
| No agent installed | Status bar: "No AI agent found. Install claude, opencode, codex, or gemini" |
| Agent process timeout (60s) | Status bar: "Commit message generation timed out" |
| Agent process error (non-zero exit) | Status bar: "Failed to generate: <stderr first line>" |
| Empty output from agent | Status bar: "Agent returned empty message" |

## Output Cleanup

The agent output goes through cleanup before being used:

1. Trim leading/trailing whitespace
2. Remove markdown code fences if present
3. Remove leading "commit message:" or similar preamble lines
4. Validate: non-empty after cleanup

## Loading State

- Spinner shown in status bar (non-blocking — user can navigate)
- Uses existing status bar infrastructure
- Generation runs in background, does not block UI

## Testing Strategy

Unit tests in `src/core/ai/__tests__/`:

- `agents.test.ts`:
  - `buildArgs()` returns correct args for each agent
  - Output cleanup: strips fences, trims, handles empty
  - Detection logic (mock `which` calls)
- `commit-prompt.test.ts`:
  - Built-in prompt is well-formed
  - Custom prompt file loading

No integration tests with real agents (require API keys and network).

## Files to Create/Modify

### New files
- `src/core/ai/types.ts`
- `src/core/ai/agents.ts`
- `src/core/ai/commit-prompt.ts`
- `src/core/ai/__tests__/agents.test.ts`

### Modified files
- `src/core/config/schema.ts` — add AIConfig interface
- `src/core/config/defaults.ts` — add ai defaults
- `src/state/keybindings.ts` — add C/ai-commit binding
- `src/ui/layout/keybinding-bar.tsx` — add [C] AI commit hint
- `src/ui/layout/global-keys.tsx` — handle ai-commit action
- `src/ui/components/commit-modal.tsx` — accept optional pre-filled message
