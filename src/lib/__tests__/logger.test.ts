import { test, expect, describe, beforeEach, afterEach } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  log,
  debug,
  info,
  warn,
  error,
  LOG_LEVEL,
  setLogPath,
  resetLogPath,
} from "../logger.ts"

// ── Helpers ───────────────────────────────────────────────────

let tmpDir: string

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "guit-log-test-"))
  setLogPath(tmpDir)
  // Clear debug env vars for isolation
  delete process.env.GUIT_DEBUG
  delete process.env.GUIT_LOG_LEVEL
})

afterEach(async () => {
  resetLogPath()
  delete process.env.GUIT_DEBUG
  delete process.env.GUIT_LOG_LEVEL
  await rm(tmpDir, { recursive: true, force: true })
})

function logFilePath(): string {
  return join(tmpDir, "guit.log")
}

async function readLog(): Promise<string> {
  return Bun.file(logFilePath()).text()
}

// ── Tests ─────────────────────────────────────────────────────

describe("logger", () => {
  test("writes log line with correct format", async () => {
    await info("server started")

    const content = await readLog()
    const match = content.match(/^\[(.+)\] \[INFO \] server started\n$/)

    expect(match).not.toBeNull()
    // Timestamp should be valid ISO 8601
    expect(new Date(match![1]!).toISOString()).toBe(match![1]!)
  })

  test("skips debug when GUIT_DEBUG not set", async () => {
    await debug("this should be skipped")

    const exists = await Bun.file(logFilePath()).exists()
    expect(exists).toBe(false)
  })

  test("writes debug when GUIT_DEBUG=1", async () => {
    process.env.GUIT_DEBUG = "1"

    await debug("debug trace")

    const content = await readLog()
    expect(content).toContain("[DEBUG]")
    expect(content).toContain("debug trace")
  })

  test("writes debug when GUIT_LOG_LEVEL=debug", async () => {
    process.env.GUIT_LOG_LEVEL = "debug"

    await debug("verbose output")

    const content = await readLog()
    expect(content).toContain("[DEBUG]")
    expect(content).toContain("verbose output")
  })

  test("includes JSON data when provided", async () => {
    const data = { user: "rsbmk", action: "commit" }

    await info("git operation", data)

    const content = await readLog()
    expect(content).toContain("git operation")
    expect(content).toContain('"user": "rsbmk"')
    expect(content).toContain('"action": "commit"')
  })

  test("multiple log levels work", async () => {
    await info("information")
    await warn("warning issued")
    await error("something broke")

    const content = await readLog()

    expect(content).toContain("[INFO ]")
    expect(content).toContain("information")
    expect(content).toContain("[WARN ]")
    expect(content).toContain("warning issued")
    expect(content).toContain("[ERROR]")
    expect(content).toContain("something broke")
  })

  test("creates log directory if missing", async () => {
    const nested = join(tmpDir, "deep", "nested", "dir")
    setLogPath(nested)

    await info("creating dirs")

    const content = await Bun.file(join(nested, "guit.log")).text()
    expect(content).toContain("creating dirs")
  })

  test("rotates log at 10MB threshold", async () => {
    // Write a chunk just over 10MB to trigger rotation
    const bigLine = "X".repeat(1024) + "\n"
    const count = Math.ceil((10 * 1024 * 1024) / bigLine.length) + 1
    const bigContent = bigLine.repeat(count)

    await Bun.write(logFilePath(), bigContent)

    // Next write should trigger rotation
    await info("after rotation")

    const rotated = await Bun.file(logFilePath() + ".1").exists()
    expect(rotated).toBe(true)

    const newContent = await readLog()
    expect(newContent).toContain("after rotation")
    // New file should NOT contain the old bulk data
    expect(newContent.length).toBeLessThan(bigContent.length)
  })

  test("log function accepts all levels via LOG_LEVEL const", async () => {
    process.env.GUIT_DEBUG = "1"

    await log(LOG_LEVEL.DEBUG, "d")
    await log(LOG_LEVEL.INFO, "i")
    await log(LOG_LEVEL.WARN, "w")
    await log(LOG_LEVEL.ERROR, "e")

    const content = await readLog()
    expect(content).toContain("[DEBUG]")
    expect(content).toContain("[INFO ]")
    expect(content).toContain("[WARN ]")
    expect(content).toContain("[ERROR]")
  })
})
