// src/core/ai/types.ts
// AI agent type definitions — const object pattern, no enums

// ── Agent ID ─────────────────────────────────────────────────

export const AGENT_ID = {
  CLAUDE: "claude",
  OPENCODE: "opencode",
  CODEX: "codex",
  GEMINI: "gemini",
} as const

export type AgentId = (typeof AGENT_ID)[keyof typeof AGENT_ID]

// ── Agent Definition ─────────────────────────────────────────

export interface AgentDefinition {
  id: AgentId
  name: string
  binary: string
  buildArgs(prompt: string): string[]
}

// ── Generate Result ──────────────────────────────────────────

export interface GenerateResult {
  message: string
  agentId: AgentId
}
