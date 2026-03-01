// src/core/ai/__tests__/agents.test.ts
// Unit tests for AI agent registry and output cleanup

import { test, expect, describe } from "bun:test"
import { cleanAgentOutput, getAgent, getAllAgents } from "../agents.ts"
import { AGENT_ID } from "../types.ts"

// ── cleanAgentOutput ─────────────────────────────────────────

describe("cleanAgentOutput", () => {
  test("trims whitespace", () => {
    expect(cleanAgentOutput("  feat: add login  \n")).toBe("feat: add login")
  })

  test("removes markdown code fences", () => {
    const input = "```\nfeat: add login\n```"
    expect(cleanAgentOutput(input)).toBe("feat: add login")
  })

  test("removes triple backtick fences with language tag", () => {
    const input = "```text\nfeat: add login\n```"
    expect(cleanAgentOutput(input)).toBe("feat: add login")
  })

  test("removes preamble lines like 'Here is the commit message:'", () => {
    const input = "Here is the commit message:\nfeat: add login"
    expect(cleanAgentOutput(input)).toBe("feat: add login")
  })

  test("removes preamble 'Commit message:'", () => {
    const input = "Commit message:\nfix(auth): handle expired tokens"
    expect(cleanAgentOutput(input)).toBe("fix(auth): handle expired tokens")
  })

  test("removes preamble 'Suggested commit message'", () => {
    const input = "Suggested commit message\nrefactor: extract utils"
    expect(cleanAgentOutput(input)).toBe("refactor: extract utils")
  })

  test("returns empty string for whitespace-only input", () => {
    expect(cleanAgentOutput("   \n  \n  ")).toBe("")
  })

  test("returns empty string for empty input", () => {
    expect(cleanAgentOutput("")).toBe("")
  })

  test("preserves multi-line commit body", () => {
    const input = "feat(ai): add commit message generation\n\nAdd AI-powered commit message generation using\nterminal coding agents like Claude Code and OpenCode."
    expect(cleanAgentOutput(input)).toBe(input)
  })

  test("handles fences with preamble combined", () => {
    const input = "```\nHere is the commit message:\nfeat: add login\n```"
    expect(cleanAgentOutput(input)).toBe("feat: add login")
  })

  test("does not strip single backtick fence without closing", () => {
    const input = "```\nfeat: add login"
    expect(cleanAgentOutput(input)).toBe("```\nfeat: add login")
  })
})

// ── getAgent ─────────────────────────────────────────────────

describe("getAgent", () => {
  test("returns agent definition by id", () => {
    const agent = getAgent(AGENT_ID.CLAUDE)
    expect(agent.id).toBe("claude")
    expect(agent.name).toBe("Claude Code")
    expect(agent.binary).toBe("claude")
  })

  test("returns each supported agent", () => {
    expect(getAgent(AGENT_ID.OPENCODE).binary).toBe("opencode")
    expect(getAgent(AGENT_ID.CODEX).binary).toBe("codex")
    expect(getAgent(AGENT_ID.GEMINI).binary).toBe("gemini")
  })

  test("throws for unknown agent id", () => {
    expect(() => getAgent("unknown" as any)).toThrow("Unknown AI agent: unknown")
  })
})

// ── getAllAgents ──────────────────────────────────────────────

describe("getAllAgents", () => {
  test("returns all 4 supported agents", () => {
    const agents = getAllAgents()
    expect(agents).toHaveLength(4)
    expect(agents.map((a) => a.id)).toEqual(["claude", "opencode", "codex", "gemini"])
  })
})

// ── buildArgs ────────────────────────────────────────────────

describe("buildArgs", () => {
  const prompt = "Generate a commit message"

  test("claude builds correct args with -p and --output-format text", () => {
    const agent = getAgent(AGENT_ID.CLAUDE)
    expect(agent.buildArgs(prompt)).toEqual(["-p", prompt, "--output-format", "text"])
  })

  test("opencode builds correct args with run subcommand", () => {
    const agent = getAgent(AGENT_ID.OPENCODE)
    expect(agent.buildArgs(prompt)).toEqual(["run", prompt])
  })

  test("codex builds correct args with exec subcommand", () => {
    const agent = getAgent(AGENT_ID.CODEX)
    expect(agent.buildArgs(prompt)).toEqual(["exec", prompt])
  })

  test("gemini builds correct args with -p and --output-format text", () => {
    const agent = getAgent(AGENT_ID.GEMINI)
    expect(agent.buildArgs(prompt)).toEqual(["-p", prompt, "--output-format", "text"])
  })
})
