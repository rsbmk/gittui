// src/core/config/loader.ts
// TOML config loader — reads ~/.config/gittui/config.toml, merges with defaults

import { parse, stringify } from "smol-toml"
import { homedir } from "node:os"
import { join } from "node:path"
import { mkdir } from "node:fs/promises"
import { DEFAULT_CONFIG } from "./defaults.ts"
import type { GuitConfig } from "./schema.ts"

// ── Paths (overridable for testing) ───────────────────────────

let configDir = join(homedir(), ".config", "gittui")
let configFile = join(configDir, "config.toml")

export function getConfigPaths(): { configDir: string; configFile: string } {
  return { configDir, configFile }
}

export function setConfigPaths(dir: string): void {
  configDir = dir
  configFile = join(dir, "config.toml")
}

export function resetConfigPaths(): void {
  configDir = join(homedir(), ".config", "gittui")
  configFile = join(configDir, "config.toml")
}

// ── Deep Merge ────────────────────────────────────────────────

export function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target }
  const keys = Object.keys(source) as Array<keyof T>

  for (const key of keys) {
    const sourceVal = source[key]
    const targetVal = target[key]

    if (
      sourceVal !== undefined &&
      typeof sourceVal === "object" &&
      sourceVal !== null &&
      !Array.isArray(sourceVal) &&
      typeof targetVal === "object" &&
      targetVal !== null &&
      !Array.isArray(targetVal)
    ) {
      result[key] = deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>,
      ) as T[keyof T]
    } else if (sourceVal !== undefined) {
      result[key] = sourceVal as T[keyof T]
    }
  }

  return result
}

// ── First Run Detection ──────────────────────────────────────

export async function isFirstRun(): Promise<boolean> {
  const file = Bun.file(configFile)
  return !(await file.exists())
}

// ── Filesystem ────────────────────────────────────────────────

export async function ensureConfigDir(): Promise<void> {
  await mkdir(configDir, { recursive: true })
}

export async function loadConfig(): Promise<GuitConfig> {
  const file = Bun.file(configFile)
  const exists = await file.exists()

  if (!exists) {
    await ensureConfigDir()
    await Bun.write(configFile, stringify(DEFAULT_CONFIG))
    return structuredClone(DEFAULT_CONFIG)
  }

  const raw = await file.text()
  const parsed = parse(raw) as Partial<GuitConfig>

  return deepMerge(structuredClone(DEFAULT_CONFIG), parsed)
}

export async function saveConfig(config: GuitConfig): Promise<void> {
  await ensureConfigDir()
  await Bun.write(configFile, stringify(config))
}
