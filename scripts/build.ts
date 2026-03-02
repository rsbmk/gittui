// scripts/build.ts
// Cross-platform binary builder for gittui

export {} // Module marker — enables top-level await

const TARGETS = [
  { platform: "darwin", arch: "arm64" },
  { platform: "darwin", arch: "x64" },
  { platform: "linux", arch: "x64" },
  { platform: "linux", arch: "arm64" },
] as const

type Target = (typeof TARGETS)[number]

async function build(target?: Target): Promise<void> {
  const targets = target ? [target] : TARGETS
  const version = (await Bun.file("package.json").json()).version

  console.log(`\nBuilding gittui v${version}...\n`)

  for (const t of targets) {
    const outDir = `./dist/${t.platform}-${t.arch}`
    const label = `${t.platform}-${t.arch}`

    console.log(`  Building ${label}...`)

    // Use bun build --compile with cross-compilation target
    const proc = Bun.spawn(
      [
        "bun",
        "build",
        "--compile",
        `--target=bun-${t.platform}-${t.arch}`,
        "--outfile",
        `${outDir}/gittui`,
        "src/index.ts",
      ],
      {
        stdout: "pipe",
        stderr: "pipe",
      }
    )

    const stderr = await new Response(proc.stderr).text()
    const exitCode = await proc.exited

    if (exitCode !== 0) {
      console.error(`  ✗ ${label} failed: ${stderr}`)
      process.exit(1)
    }

    console.log(`  ✓ ${label} → ${outDir}/gittui`)
  }

  console.log(`\nDone! Binaries in ./dist/\n`)
}

// Parse CLI args
const arg = Bun.argv[2]
if (arg === "--current") {
  const platform = process.platform === "darwin" ? "darwin" : "linux"
  const arch = process.arch === "arm64" ? "arm64" : "x64"
  const target = TARGETS.find((t) => t.platform === platform && t.arch === arch)
  if (target) {
    await build(target)
  } else {
    console.error(`Unsupported platform: ${platform}-${arch}`)
    process.exit(1)
  }
} else {
  await build()
}
