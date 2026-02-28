const DEFAULTS = {
  TIMEOUT: 30_000,
} as const

export interface ExecResult {
  stdout: string
  stderr: string
  exitCode: number
  ok: boolean
}

export interface ExecOptions {
  cwd?: string
  timeout?: number
  env?: Record<string, string>
}

export class ShellTimeoutError extends Error {
  constructor(cmd: string[], timeout: number) {
    super(`Command timed out after ${timeout}ms: ${cmd.join(" ")}`)
    this.name = "ShellTimeoutError"
  }
}

export async function exec(cmd: string[], opts?: ExecOptions): Promise<ExecResult> {
  const timeout = opts?.timeout ?? DEFAULTS.TIMEOUT

  const proc = Bun.spawn(cmd, {
    stdout: "pipe",
    stderr: "pipe",
    cwd: opts?.cwd ?? process.cwd(),
    env: opts?.env,
  })

  let timedOut = false

  const timer = setTimeout(() => {
    timedOut = true
    proc.kill()
  }, timeout)

  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ])

  const exitCode = await proc.exited

  clearTimeout(timer)

  if (timedOut) {
    throw new ShellTimeoutError(cmd, timeout)
  }

  return {
    stdout,
    stderr,
    exitCode,
    ok: exitCode === 0,
  }
}
