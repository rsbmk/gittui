// src/core/ai/agents.ts
// Agent registry, detection, execution, and output cleanup

import { exec } from "../../lib/shell.ts"
import { loadCommitPrompt } from "./commit-prompt.ts"
import { AGENT_ID } from "./types.ts"
import type { AgentDefinition, AgentId, GenerateResult } from "./types.ts"

// ── Agent Registry ───────────────────────────────────────────

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

// ── Queries ──────────────────────────────────────────────────

export function getAgent(id: AgentId): AgentDefinition {
  const agent = AGENTS.find((a) => a.id === id)
  if (!agent) throw new Error(`Unknown AI agent: ${id}`)
  return agent
}

export function getAllAgents(): AgentDefinition[] {
  return AGENTS
}

// ── Detection ────────────────────────────────────────────────

export async function detectInstalledAgents(): Promise<AgentDefinition[]> {
  const results = await Promise.all(
    AGENTS.map(async (agent) => {
      try {
        const result = await exec(["which", agent.binary])
        return result.ok ? agent : null
      } catch {
        return null
      }
    }),
  )

  return results.filter((a): a is AgentDefinition => a !== null)
}

// ── Output Cleanup ───────────────────────────────────────────

const PREAMBLE_PATTERNS = [
  /^here is the commit message:?\s*$/i,
  /^commit message:?\s*$/i,
  /^here's the commit message:?\s*$/i,
  /^suggested commit message:?\s*$/i,
  /^generated commit message:?\s*$/i,
]

export function cleanAgentOutput(raw: string): string {
  let text = raw.trim()

  if (!text) return ""

  // Remove markdown code fences (``` or ```text, ```diff, etc.)
  const lines = text.split("\n")
  const firstLine = lines[0]!.trim()
  const lastLine = lines[lines.length - 1]!.trim()

  if (firstLine.startsWith("```") && lastLine === "```" && lines.length > 2) {
    text = lines.slice(1, -1).join("\n").trim()
  }

  // Remove preamble lines
  const cleaned = text
    .split("\n")
    .filter((line) => !PREAMBLE_PATTERNS.some((p) => p.test(line.trim())))
    .join("\n")
    .trim()

  return cleaned
}

// ── Generation ───────────────────────────────────────────────

const TIMEOUT_MS = 60_000

export async function generateCommitMessage(
  agentId: AgentId,
  diff: string,
  customPromptPath?: string | null,
): Promise<GenerateResult> {
  const prompt = await loadCommitPrompt(customPromptPath ?? null)
  const agent = getAgent(agentId)
  const args = [agent.binary, ...agent.buildArgs(prompt)]

  const proc = Bun.spawn(args, {
    stdin: new Blob([diff]),
    stdout: "pipe",
    stderr: "pipe",
  })

  // Timeout handling
  const timer = setTimeout(() => {
    proc.kill()
  }, TIMEOUT_MS)

  try {
    const exitCode = await proc.exited
    clearTimeout(timer)

    if (exitCode !== 0) {
      const stderr = await new Response(proc.stderr).text()
      throw new Error(`${agent.name} failed (exit ${exitCode}): ${stderr.split("\n")[0] ?? "unknown error"}`)
    }

    const stdout = await new Response(proc.stdout).text()
    const message = cleanAgentOutput(stdout)

    if (!message) {
      throw new Error(`${agent.name} returned empty message`)
    }

    return { message, agentId }
  } catch (err) {
    clearTimeout(timer)
    throw err
  }
}
