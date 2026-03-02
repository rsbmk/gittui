import { test, expect, describe } from "bun:test"
import { getFiletype, EXTENSION_MAP } from "../syntax/filetype-map.ts"

describe("getFiletype", () => {
  // ── Known extensions ────────────────────────────────────────

  test("maps .ts to typescript", () => {
    expect(getFiletype("src/app.ts")).toBe("typescript")
  })

  test("maps .tsx to tsx", () => {
    expect(getFiletype("src/components/Button.tsx")).toBe("tsx")
  })

  test("maps .js to javascript", () => {
    expect(getFiletype("index.js")).toBe("javascript")
  })

  test("maps .py to python", () => {
    expect(getFiletype("scripts/deploy.py")).toBe("python")
  })

  test("maps .go to go", () => {
    expect(getFiletype("main.go")).toBe("go")
  })

  test("maps .rs to rust", () => {
    expect(getFiletype("src/lib.rs")).toBe("rust")
  })

  test("maps .json to json", () => {
    expect(getFiletype("package.json")).toBe("json")
  })

  test("maps .yaml and .yml to yaml", () => {
    expect(getFiletype("config.yaml")).toBe("yaml")
    expect(getFiletype("ci.yml")).toBe("yaml")
  })

  test("maps .toml to toml", () => {
    expect(getFiletype("config.toml")).toBe("toml")
  })

  test("maps .md to markdown", () => {
    expect(getFiletype("README.md")).toBe("markdown")
  })

  test("maps shell extensions to bash", () => {
    expect(getFiletype("script.sh")).toBe("bash")
    expect(getFiletype("script.bash")).toBe("bash")
    expect(getFiletype("script.zsh")).toBe("bash")
  })

  test("maps .css to css", () => {
    expect(getFiletype("styles.css")).toBe("css")
  })

  test("maps .html to html", () => {
    expect(getFiletype("index.html")).toBe("html")
  })

  test("maps .zig to zig", () => {
    expect(getFiletype("main.zig")).toBe("zig")
  })

  // ── Special filenames ───────────────────────────────────────

  test("maps Dockerfile by filename", () => {
    expect(getFiletype("Dockerfile")).toBe("dockerfile")
    expect(getFiletype("path/to/Dockerfile")).toBe("dockerfile")
  })

  test("maps Makefile by filename", () => {
    expect(getFiletype("Makefile")).toBe("make")
  })

  test("maps dotfiles by filename", () => {
    expect(getFiletype(".bashrc")).toBe("bash")
    expect(getFiletype(".zshrc")).toBe("bash")
    expect(getFiletype(".gitignore")).toBe("gitignore")
    expect(getFiletype(".editorconfig")).toBe("ini")
  })

  // ── Edge cases ──────────────────────────────────────────────

  test("returns undefined for unknown extension", () => {
    expect(getFiletype("file.xyz")).toBeUndefined()
    expect(getFiletype("file.unknown")).toBeUndefined()
  })

  test("returns undefined for files without extension", () => {
    expect(getFiletype("LICENSE")).toBeUndefined()
    expect(getFiletype("CHANGELOG")).toBeUndefined()
  })

  test("handles deeply nested paths", () => {
    expect(getFiletype("a/b/c/d/e/file.ts")).toBe("typescript")
  })

  test("handles case insensitivity for extensions", () => {
    expect(getFiletype("file.TS")).toBe("typescript")
    expect(getFiletype("file.Py")).toBe("python")
    expect(getFiletype("file.JSON")).toBe("json")
  })

  test("handles files with multiple dots", () => {
    expect(getFiletype("my.component.test.tsx")).toBe("tsx")
    expect(getFiletype("archive.tar.gz")).toBeUndefined()
  })
})

describe("EXTENSION_MAP", () => {
  test("has entries for common web languages", () => {
    expect(EXTENSION_MAP["ts"]).toBe("typescript")
    expect(EXTENSION_MAP["tsx"]).toBe("tsx")
    expect(EXTENSION_MAP["js"]).toBe("javascript")
    expect(EXTENSION_MAP["jsx"]).toBe("javascript")
    expect(EXTENSION_MAP["css"]).toBe("css")
    expect(EXTENSION_MAP["html"]).toBe("html")
  })

  test("has entries for systems languages", () => {
    expect(EXTENSION_MAP["go"]).toBe("go")
    expect(EXTENSION_MAP["rs"]).toBe("rust")
    expect(EXTENSION_MAP["c"]).toBe("c")
    expect(EXTENSION_MAP["cpp"]).toBe("cpp")
    expect(EXTENSION_MAP["zig"]).toBe("zig")
  })
})
