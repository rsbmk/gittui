---
description: Use Bun instead of Node.js, npm, pnpm, or vite.
globs: "*.ts, *.tsx, *.js, *.jsx, package.json"
alwaysApply: false
---

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>`
- Use `bunx <package>` instead of `npx <package>`
- Bun automatically loads .env, so don't use dotenv.

## Bun APIs (prefer over Node.js equivalents)

- `Bun.file()` / `Bun.write()` instead of `node:fs` readFile/writeFile
- `Bun.spawn()` for subprocesses — read stdout via `new Response(proc.stdout).text()`
- `node:fs/promises` only for `mkdir`, `stat`, `rename` (no Bun equivalent)
- `node:os` and `node:path` are fine for `homedir()`, `join()`, `dirname()`

## Testing

Use `bun test` to run tests. Use `test()`, not `it()`.

```ts
import { test, expect, describe } from "bun:test"

test("hello world", () => {
  expect(1).toBe(1)
})
```

## This Project (gittui)

This is a terminal UI app using Solid.js + OpenTUI — NOT a web app.
- No HTML, no React, no browser APIs, no express, no vite
- JSX primitives are `<box>`, `<text>`, `<scrollbox>`, `<diff>` — NOT `<div>`, `<span>`
- `jsxImportSource` is `@opentui/solid`, NOT `solid-js`
- See `AGENTS.md` for full code style, architecture, and conventions

## Principles (Non-Negotiable)

- **SOLID, KISS, YAGNI, DRY** — follow these principles strictly in all code.
- **Declarative over imperative** — write declarative, scalable code. Never use imperative patterns
  where a declarative alternative exists (e.g. prefer `<For>`, `<Show>`, `createMemo` over manual
  loops, if-else chains, or mutable accumulators in UI code).
- **No `any`** — `any` is **strictly forbidden**. No `as any`, no `param: any`, no `any` anywhere.
  If TypeScript complains, the type is wrong — fix the type, don't silence the compiler.
  If a third-party library forces `any`, wrap it in a typed helper.
- **No magic strings or numbers** — extract all literals into named constants (`SCREAMING_SNAKE_CASE`).
  The only exceptions are: `0`, `1`, `-1`, `""`, `true`, `false`, and single-use format strings.

## Skills

Always load relevant skills before writing code. Multiple skills can apply at once.

| Skill | Trigger | Description |
|-------|---------|-------------|
| `opentui` | OpenTUI components, `<box>`, `<text>`, `<input>`, layout | Comprehensive OpenTUI reference — components, layout, keyboard, animations, testing |
| `terminal-ui` | TUI performance, CLI prompts, rendering | Terminal UI performance and UX guidelines for TypeScript apps |
| `interface-design` | Dashboards, admin panels, apps, tools | Interface design for interactive products (NOT marketing) |
| `systematic-debugging` | Bugs, test failures, unexpected behavior | Debug protocol: find root cause BEFORE proposing fixes |
| `verification-before-completion` | About to claim work is done | Run verification commands and confirm output before success claims |
