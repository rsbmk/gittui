// src/lib/logger.ts
// File-based logger for TUI — writes to ~/.config/guit/guit.log, never stdout

import { homedir } from "node:os"
import { join } from "node:path"
import { mkdir, stat, rename } from "node:fs/promises"

// ── Constants ─────────────────────────────────────────────────

const MAX_LOG_SIZE = 10 * 1024 * 1024 // 10 MB

export const LOG_LEVEL = {
  DEBUG: "debug",
  INFO: "info",
  WARN: "warn",
  ERROR: "error",
} as const

export type LogLevel = (typeof LOG_LEVEL)[keyof typeof LOG_LEVEL]

// ── Paths (overridable for testing) ───────────────────────────

let logDir = join(homedir(), ".config", "guit")
let logFile = join(logDir, "guit.log")

export function getLogPath(): { logDir: string; logFile: string } {
  return { logDir, logFile }
}

export function setLogPath(dir: string): void {
  logDir = dir
  logFile = join(dir, "guit.log")
}

export function resetLogPath(): void {
  logDir = join(homedir(), ".config", "guit")
  logFile = join(logDir, "guit.log")
}

// ── Internals ─────────────────────────────────────────────────

function isDebugEnabled(): boolean {
  return process.env.GUIT_DEBUG === "1" || process.env.GUIT_LOG_LEVEL === "debug"
}

function formatLine(level: LogLevel, message: string, data?: unknown): string {
  const ts = new Date().toISOString()
  const tag = level.toUpperCase().padEnd(5)
  const base = `[${ts}] [${tag}] ${message}`

  if (data === undefined) return base + "\n"

  const json = JSON.stringify(data, null, 2)
  return base + " " + json + "\n"
}

async function ensureLogDir(): Promise<void> {
  await mkdir(logDir, { recursive: true })
}

async function rotateIfNeeded(): Promise<void> {
  try {
    const info = await stat(logFile)
    if (info.size >= MAX_LOG_SIZE) {
      await rename(logFile, logFile + ".1")
    }
  } catch {
    // File doesn't exist yet — nothing to rotate
  }
}

// ── Public API ────────────────────────────────────────────────

export async function log(level: LogLevel, message: string, data?: unknown): Promise<void> {
  if (level === LOG_LEVEL.DEBUG && !isDebugEnabled()) return

  await ensureLogDir()
  await rotateIfNeeded()

  const line = formatLine(level, message, data)
  const file = Bun.file(logFile)
  const exists = await file.exists()
  const current = exists ? await file.text() : ""

  await Bun.write(logFile, current + line)
}

export async function debug(message: string, data?: unknown): Promise<void> {
  return log(LOG_LEVEL.DEBUG, message, data)
}

export async function info(message: string, data?: unknown): Promise<void> {
  return log(LOG_LEVEL.INFO, message, data)
}

export async function warn(message: string, data?: unknown): Promise<void> {
  return log(LOG_LEVEL.WARN, message, data)
}

export async function error(message: string, data?: unknown): Promise<void> {
  return log(LOG_LEVEL.ERROR, message, data)
}
