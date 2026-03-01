// src/core/ai/commit-prompt.ts
// Built-in commit prompt + custom prompt loader

// ── Default Prompt ───────────────────────────────────────────

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

// ── Custom Prompt Loader ─────────────────────────────────────

export async function loadCommitPrompt(customPath: string | null): Promise<string> {
  if (!customPath) return DEFAULT_COMMIT_PROMPT

  const file = Bun.file(customPath)
  const exists = await file.exists()

  if (!exists) return DEFAULT_COMMIT_PROMPT

  const content = await file.text()
  return content.trim() ? content : DEFAULT_COMMIT_PROMPT
}
