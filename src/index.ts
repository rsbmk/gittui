const VERSION = "0.1.0" as const
const APP_NAME = "gittui" as const

const USAGE = `
${APP_NAME} v${VERSION} - A terminal UI for git

Usage:
  ${APP_NAME} [options] [path]

Options:
  -h, --help      Show this help message
  -v, --version   Show version number

Arguments:
  path            Path to git repository (defaults to current directory)
`.trim()

function parseArgs(argv: string[]): { help: boolean; version: boolean; repoPath: string } {
  const args = argv.slice(2)
  let help = false
  let version = false
  let repoPath = process.cwd()

  for (const arg of args) {
    switch (arg) {
      case "-h":
      case "--help":
        help = true
        break
      case "-v":
      case "--version":
        version = true
        break
      default:
        if (arg.startsWith("-")) {
          console.error(`Error: unknown option '${arg}'\n`)
          console.error(USAGE)
          process.exit(1)
        }
        repoPath = arg
    }
  }

  return { help, version, repoPath }
}

async function isGitRepo(path: string): Promise<boolean> {
  const proc = Bun.spawn(["git", "rev-parse", "--is-inside-work-tree"], {
    cwd: path,
    stdout: "pipe",
    stderr: "pipe",
  })

  const exitCode = await proc.exited
  return exitCode === 0
}

async function main(): Promise<void> {
  const { help, version, repoPath } = parseArgs(Bun.argv)

  if (help) {
    console.log(USAGE)
    process.exit(0)
  }

  if (version) {
    console.log(`${APP_NAME} v${VERSION}`)
    process.exit(0)
  }

  if (!(await isGitRepo(repoPath))) {
    console.error("Error: not a git repository (or any of the parent directories)")
    process.exit(1)
  }

  const { render } = await import("@opentui/solid")
  const { default: App } = await import("./app.tsx")

  await render(App)
}

main()
