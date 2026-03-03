// scripts/build.ts
// Cross-platform binary builder for gittui — uses Bun.build() API with Solid plugin

import solidPlugin from "@opentui/solid/bun-plugin"

export {} // Module marker — enables top-level await

const TARGETS = [
  { platform: "darwin", arch: "arm64" },
  { platform: "darwin", arch: "x64" },
  { platform: "linux", arch: "x64" },
  { platform: "linux", arch: "arm64" },
] as const

type Target = (typeof TARGETS)[number]

// ── Build ─────────────────────────────────────────────────────

async function build(target?: Target): Promise<void> {
  const targets = target ? [target] : TARGETS
  const version = (await Bun.file("package.json").json()).version

  console.log(`\nBuilding gittui v${version}...\n`)

  for (const t of targets) {
    const label = `${t.platform}-${t.arch}`
    const bunTarget = `bun-${t.platform}-${t.arch}` as const
    const outfile = target ? "gittui" : `./dist/${t.platform}-${t.arch}/gittui`

    console.log(`  Building ${label}...`)

    const result = await Bun.build({
      entrypoints: ["src/index.ts"],
      plugins: [solidPlugin],
      compile: {
        target: bunTarget,
        outfile,
      },
    })

    if (!result.success) {
      console.error(`  ✗ ${label} failed:`)
      for (const log of result.logs) {
        console.error(`    ${log}`)
      }
      process.exit(1)
    }

    console.log(`  ✓ ${label} → ${outfile}`)
  }

  console.log(`\nDone!\n`)
}

// ── CLI ───────────────────────────────────────────────────────

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
} else if (arg === "--target" && Bun.argv[3]) {
  const [platform, arch] = Bun.argv[3]!.split("-")
  const target = TARGETS.find((t) => t.platform === platform && t.arch === arch)
  if (target) {
    await build(target)
  } else {
    console.error(`Unknown target: ${Bun.argv[3]}`)
    console.error(`Valid targets: ${TARGETS.map((t) => `${t.platform}-${t.arch}`).join(", ")}`)
    process.exit(1)
  }
} else {
  await build()
}
