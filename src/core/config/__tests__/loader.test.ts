import { test, expect, describe, beforeEach, afterEach } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { stringify } from "smol-toml"
import {
  deepMerge,
  loadConfig,
  saveConfig,
  setConfigPaths,
  resetConfigPaths,
} from "../loader.ts"
import { DEFAULT_CONFIG } from "../defaults.ts"
import type { GuitConfig } from "../schema.ts"

// ── deepMerge ─────────────────────────────────────────────────

describe("deepMerge", () => {
  test("merges top-level values", () => {
    const target = { a: 1, b: 2 }
    const source = { a: 10 }

    const result = deepMerge(target, source)

    expect(result).toEqual({ a: 10, b: 2 })
  })

  test("deep merges nested objects", () => {
    const target = { outer: { a: 1, b: 2 } }
    const source = { outer: { a: 99 } }

    const result = deepMerge(target, source as Partial<typeof target>)

    expect(result).toEqual({ outer: { a: 99, b: 2 } })
  })

  test("source overrides primitives", () => {
    const target = { name: "old", count: 0, active: false }
    const source = { name: "new", count: 42, active: true }

    const result = deepMerge(target, source)

    expect(result).toEqual({ name: "new", count: 42, active: true })
  })

  test("missing source keys keep defaults", () => {
    const target = { a: 1, b: 2, c: 3 }
    const source = { b: 20 }

    const result = deepMerge(target, source)

    expect(result.a).toBe(1)
    expect(result.b).toBe(20)
    expect(result.c).toBe(3)
  })

  test("empty source returns target unchanged", () => {
    const target = { x: 1, y: { nested: true } }
    const source = {}

    const result = deepMerge(target, source)

    expect(result).toEqual(target)
  })

  test("source arrays override target arrays", () => {
    const target = { tags: ["a", "b"] }
    const source = { tags: ["x"] }

    const result = deepMerge(target, source)

    expect(result.tags).toEqual(["x"])
  })

  test("does not mutate the original target", () => {
    const target = { a: 1, nested: { b: 2 } }
    const source = { a: 99, nested: { b: 42 } }

    const result = deepMerge(target, source as Partial<typeof target>)

    expect(result.a).toBe(99)
    expect(target.a).toBe(1)
    expect(target.nested.b).toBe(2)
  })
})

// ── Filesystem tests ──────────────────────────────────────────

describe("loadConfig", () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "gittui-test-"))
    setConfigPaths(tmpDir)
  })

  afterEach(async () => {
    resetConfigPaths()
    await rm(tmpDir, { recursive: true, force: true })
  })

  test("returns defaults when no config file exists", async () => {
    const config = await loadConfig()

    expect(config).toEqual(DEFAULT_CONFIG)
  })

  test("creates config file with defaults when none exists", async () => {
    await loadConfig()

    const file = Bun.file(join(tmpDir, "config.toml"))
    const exists = await file.exists()
    expect(exists).toBe(true)

    const content = await file.text()
    expect(content.length).toBeGreaterThan(0)
  })

  test("parses valid TOML and merges with defaults", async () => {
    const partial = {
      general: { theme: "dracula" },
      diff: { context_lines: 5 },
    }
    await Bun.write(join(tmpDir, "config.toml"), stringify(partial))

    const config = await loadConfig()

    expect(config.general.theme).toBe("dracula")
    expect(config.general.sidebar_width).toBe(DEFAULT_CONFIG.general.sidebar_width)
    expect(config.diff.context_lines).toBe(5)
    expect(config.diff.show_line_numbers).toBe(DEFAULT_CONFIG.diff.show_line_numbers)
  })

  test("partial TOML only overrides specified keys", async () => {
    const partial = {
      keybindings: { preset: "emacs" },
    }
    await Bun.write(join(tmpDir, "config.toml"), stringify(partial))

    const config = await loadConfig()

    expect(config.keybindings.preset).toBe("emacs")
    expect(config.keybindings.custom).toEqual({})
    expect(config.general).toEqual(DEFAULT_CONFIG.general)
    expect(config.diff).toEqual(DEFAULT_CONFIG.diff)
    expect(config.github).toEqual(DEFAULT_CONFIG.github)
  })
})

describe("saveConfig", () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "gittui-test-"))
    setConfigPaths(tmpDir)
  })

  afterEach(async () => {
    resetConfigPaths()
    await rm(tmpDir, { recursive: true, force: true })
  })

  test("writes valid TOML file", async () => {
    const config: GuitConfig = {
      ...DEFAULT_CONFIG,
      general: { ...DEFAULT_CONFIG.general, theme: "nord" },
    }

    await saveConfig(config)

    const content = await Bun.file(join(tmpDir, "config.toml")).text()
    expect(content).toContain("nord")
  })

  test("saved config can be loaded back", async () => {
    const config: GuitConfig = {
      ...DEFAULT_CONFIG,
      diff: { ...DEFAULT_CONFIG.diff, context_lines: 10 },
    }

    await saveConfig(config)
    const loaded = await loadConfig()

    expect(loaded.diff.context_lines).toBe(10)
    expect(loaded.diff.show_line_numbers).toBe(true)
  })
})
