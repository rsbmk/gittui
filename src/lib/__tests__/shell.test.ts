import { test, expect, describe } from "bun:test"
import { exec, ShellTimeoutError } from "../shell.ts"

describe("exec", () => {
  test("captures stdout from a simple command", async () => {
    const result = await exec(["echo", "hello"])

    expect(result.stdout).toBe("hello\n")
    expect(result.stderr).toBe("")
    expect(result.exitCode).toBe(0)
    expect(result.ok).toBe(true)
  })

  test("returns ok: false on non-zero exit code without throwing", async () => {
    const result = await exec(["ls", "nonexistent-path-xyz"])

    expect(result.ok).toBe(false)
    expect(result.exitCode).not.toBe(0)
    expect(result.stderr.length).toBeGreaterThan(0)
  })

  test("throws ShellTimeoutError when command exceeds timeout", async () => {
    await expect(exec(["sleep", "5"], { timeout: 100 })).rejects.toThrow(ShellTimeoutError)
  })

  test("respects cwd option", async () => {
    const result = await exec(["pwd"], { cwd: "/tmp" })

    expect(result.ok).toBe(true)
    expect(result.stdout).toContain("/tmp")
  })
})
