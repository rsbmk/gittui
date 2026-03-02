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
