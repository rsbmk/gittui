// src/lib/syntax/filetype-map.ts
// File extension to tree-sitter language mapping

import { extname, basename } from "node:path"

// ── Extension map ─────────────────────────────────────────────

export const EXTENSION_MAP: Record<string, string> = {
  // JavaScript / TypeScript
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",

  // Systems / compiled
  py: "python",
  go: "go",
  rs: "rust",
  rb: "ruby",
  java: "java",
  kt: "kotlin",
  swift: "swift",
  c: "c",
  h: "c",
  cpp: "cpp",
  hpp: "cpp",
  cc: "cpp",
  cs: "c_sharp",
  zig: "zig",

  // Styles
  css: "css",
  scss: "scss",
  less: "css",

  // Markup / data
  html: "html",
  htm: "html",
  xml: "xml",
  svg: "xml",
  json: "json",
  jsonc: "json",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  md: "markdown",
  mdx: "markdown",

  // Shell
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  fish: "fish",

  // Other languages
  sql: "sql",
  lua: "lua",
  vim: "vim",
  graphql: "graphql",
  gql: "graphql",
  prisma: "prisma",
  proto: "proto",
  tf: "hcl",
  hcl: "hcl",
  ex: "elixir",
  exs: "elixir",
  erl: "erlang",
  hs: "haskell",
  ml: "ocaml",
  r: "r",
  php: "php",
  pl: "perl",
  ps1: "powershell",
  bat: "batch",

  // Config
  ini: "ini",
  conf: "ini",
  env: "bash",
  gitignore: "gitignore",

  // Build
  cmake: "cmake",
  makefile: "make",
} as const

// ── Filename map (no extension) ───────────────────────────────

const FILENAME_MAP: Record<string, string> = {
  "Dockerfile": "dockerfile",
  "dockerfile": "dockerfile",
  "Makefile": "make",
  "makefile": "make",
  "CMakeLists.txt": "cmake",
  "Gemfile": "ruby",
  "Rakefile": "ruby",
  "Vagrantfile": "ruby",
  ".gitignore": "gitignore",
  ".gitattributes": "gitignore",
  ".dockerignore": "gitignore",
  ".editorconfig": "ini",
  ".env": "bash",
  ".bashrc": "bash",
  ".zshrc": "bash",
  ".profile": "bash",
} as const

// ── Public API ────────────────────────────────────────────────

/**
 * Returns the tree-sitter language name for the given file path,
 * or `undefined` if the extension/filename is not recognized.
 */
export function getFiletype(filePath: string): string | undefined {
  const name = basename(filePath)

  // 1. Check exact filename match first (Dockerfile, Makefile, dotfiles)
  const filenameMatch = FILENAME_MAP[name]
  if (filenameMatch) return filenameMatch

  // 2. Extract extension (after last dot)
  const ext = extname(name)

  // No extension or dotfile without extension (e.g. ".gitconfig" → ext = ".gitconfig")
  if (!ext) return undefined

  // Remove the leading dot and lowercase
  const key = ext.slice(1).toLowerCase()

  // Empty extension (file ends with a dot)
  if (!key) return undefined

  return EXTENSION_MAP[key]
}
