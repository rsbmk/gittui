# Release & Distribution Guide

Step-by-step guide to publish gittui through all installation channels.

## Overview

```
git tag v0.1.0 → push tag → GitHub Actions triggers:
  ├── Build binaries (4 platforms)
  ├── Create GitHub Release with tarballs
  ├── Publish to npm
  └── (manual) Update Homebrew tap SHA256
```

| Channel | What users run | Requires |
|---------|---------------|----------|
| **curl** | `curl -fsSL ... \| sh` | GitHub Release with binaries |
| **npm** | `npm i -g gittui` | npm account + `NPM_TOKEN` secret |
| **Homebrew** | `brew tap rsbmk/gittui <repo-url> && brew install gittui` | `Formula/` dir in this repo |
| **Source** | `git clone` + `bun run build` | Nothing extra |

---

## Phase 0 — Prerequisites (one-time setup)

### 0.1 — Create LICENSE file

npm and Homebrew expect a LICENSE. The README says MIT but there's no file.

```bash
# From the gittui repo root:
cat > LICENSE << 'EOF'
MIT License

Copyright (c) 2026 rsbmk

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF
```

### 0.2 — Complete package.json metadata

Add the missing fields npm needs. In `package.json` add:

```json
{
  "license": "MIT",
  "author": "rsbmk",
  "keywords": ["git", "terminal", "tui", "cli", "lazygit", "solid", "opentui"]
}
```

### 0.3 — Verify the npm package name is available

```bash
npm view gittui
```

If the name is taken, you'll need to either:
- Use a scoped name: `@rsbmk/gittui` (update `name` in package.json)
- Pick a different name

### 0.4 — Make sure tests and typecheck pass

```bash
bun test && bun run typecheck
```

### 0.5 — Push everything to `main`

```bash
git add -A
git commit -m "chore: add LICENSE and complete npm metadata"
git push origin main
```

---

## Phase 1 — GitHub Release (foundation for curl + brew)

This is the foundation. Both the curl script and Homebrew depend on GitHub Releases
containing the 4 platform binaries.

### 1.1 — Verify the release workflow

The workflow at `.github/workflows/release.yml` is already configured. It triggers on
tags matching `v*` and:

1. Builds 4 binaries: `darwin-arm64`, `darwin-x64`, `linux-x64`, `linux-arm64`
2. Creates a GitHub Release with auto-generated release notes
3. Uploads all 4 tarballs as release assets
4. Publishes to npm (needs `NPM_TOKEN`, see Phase 2)

### 1.2 — Create and push the first tag

```bash
# Make sure you're on main with everything committed
git checkout main
git pull origin main

# Create an annotated tag
git tag -a v0.1.0 -m "v0.1.0 — initial release"

# Push the tag (this triggers the release workflow)
git push origin v0.1.0
```

### 1.3 — Watch the workflow

```bash
# Monitor from CLI
gh run watch

# Or open in browser
gh run list --workflow=release.yml
```

### 1.4 — Verify the release

```bash
# List release assets
gh release view v0.1.0

# Should show 4 tarballs:
#   gittui-darwin-arm64.tar.gz
#   gittui-darwin-x64.tar.gz
#   gittui-linux-arm64.tar.gz
#   gittui-linux-x64.tar.gz
```

Also check: https://github.com/rsbmk/gittui/releases

### 1.5 — Test the curl install locally

Once the release exists:

```bash
curl -fsSL https://raw.githubusercontent.com/rsbmk/gittui/main/scripts/install.sh | sh
```

At this point the **curl** and **build from source** channels are DONE.

---

## Phase 2 — npm Publish

### 2.1 — Create npm account (if you don't have one)

```bash
npm adduser
# Or sign up at https://www.npmjs.com/signup
```

### 2.2 — Generate an npm access token

1. Go to https://www.npmjs.com → Profile → Access Tokens
2. Click **"Generate New Token"** → **"Granular Access Token"**
3. Configure:
   - **Token name**: `gittui-github-actions`
   - **Expiration**: 365 days (or no expiry)
   - **Packages and scopes**: Read and write
   - **Select packages**: Only select packages → `gittui`
     (if the package doesn't exist yet, select "All packages")
4. Copy the token (starts with `npm_...`)

### 2.3 — Add token as GitHub secret

```bash
# Via CLI (recommended)
gh secret set NPM_TOKEN
# Paste the token when prompted

# Or go to:
# https://github.com/rsbmk/gittui/settings/secrets/actions
# → New repository secret → Name: NPM_TOKEN → Value: <paste token>
```

### 2.4 — Test npm publish locally first (dry run)

```bash
npm publish --dry-run
```

Check the output:
- File list makes sense (no `node_modules`, no `.git`)
- Package size is reasonable
- Name, version, license are correct

### 2.5 — First manual publish (recommended)

For the first release, publish manually to catch issues:

```bash
npm publish --access public
```

After this works, subsequent releases are automated via the GitHub Actions workflow.

### 2.6 — Important: npm install requires Bun

Users installing via `npm i -g gittui` need Bun installed because the `bin` entry
points to `./src/index.ts` (not a compiled binary). This is already noted in the README.

If you want npm users to NOT need Bun, you'd need a postinstall script that downloads
the correct binary — but that's a future optimization.

---

## Phase 3 — Homebrew Tap

The formula lives in the same repo under `homebrew-tap/Formula/gittui.rb`.
Since the repo isn't named `homebrew-gittui`, users tap with the full URL.

### 3.1 — Calculate SHA256 hashes

After the GitHub Release exists (Phase 1), download each tarball and compute hashes:

```bash
# Download all 4 tarballs and compute SHA256
for target in darwin-arm64 darwin-x64 linux-arm64 linux-x64; do
  url="https://github.com/rsbmk/gittui/releases/download/v0.1.0/gittui-${target}.tar.gz"
  sha=$(curl -sL "$url" | shasum -a 256 | cut -d' ' -f1)
  echo "${target}: ${sha}"
done
```

### 3.2 — Update the formula with real SHA256 values

Edit `homebrew-tap/Formula/gittui.rb` and replace each `PLACEHOLDER` with the
corresponding hash from the previous step.

### 3.3 — Commit and push

```bash
git add homebrew-tap/Formula/gittui.rb
git commit -m "chore: update homebrew formula SHA256 for v0.1.0"
git push origin main
```

### 3.4 — Test the installation

```bash
# Add the tap (full URL because repo isn't named homebrew-gittui)
brew tap rsbmk/gittui https://github.com/rsbmk/gittui

# Install
brew install gittui

# Verify
gittui --version
```

---

## Phase 4 — Future Releases (repeating process)

Once everything is set up, this is the process for each new release:

### 4.1 — Bump the version

```bash
# Update version in package.json (e.g., 0.1.0 → 0.2.0)
# You can do this manually or:
npm version minor --no-git-tag-version
# Or for patches:
npm version patch --no-git-tag-version
```

### 4.2 — Commit and tag

```bash
git add package.json
git commit -m "chore: bump version to 0.2.0"
git tag -a v0.2.0 -m "v0.2.0 — description of changes"
git push origin main --tags
```

This triggers the release workflow which:
- Builds 4 binaries
- Creates GitHub Release
- Publishes to npm

### 4.3 — Update Homebrew formula

After the release workflow completes:

```bash
# Get the new SHA256 hashes
for target in darwin-arm64 darwin-x64 linux-arm64 linux-x64; do
  url="https://github.com/rsbmk/gittui/releases/download/v0.2.0/gittui-${target}.tar.gz"
  sha=$(curl -sL "$url" | shasum -a 256 | cut -d' ' -f1)
  echo "${target}: ${sha}"
done

# Update homebrew-tap/Formula/gittui.rb in main repo:
#   1. Change version "0.2.0"
#   2. Replace all 4 sha256 values
#   3. Commit and push
```

### 4.4 — (Future improvement) Automate Homebrew updates

You can add a step to the release workflow that automatically updates the
formula in the same repo:

```yaml
# Add to .github/workflows/release.yml after the release job
update-homebrew:
  needs: release
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4

    - name: Download release assets and compute SHA256
      run: |
        VERSION="${GITHUB_REF_NAME#v}"
        for target in darwin-arm64 darwin-x64 linux-arm64 linux-x64; do
          SHA=$(curl -sL "https://github.com/rsbmk/gittui/releases/download/v${VERSION}/gittui-${target}.tar.gz" | shasum -a 256 | cut -d' ' -f1)
          echo "${target}=${SHA}" >> sha256sums.txt
        done
        echo "VERSION=${VERSION}" >> $GITHUB_ENV

    - name: Update formula
      run: |
        DARWIN_ARM64=$(grep darwin-arm64 sha256sums.txt | cut -d= -f2)
        DARWIN_X64=$(grep darwin-x64 sha256sums.txt | cut -d= -f2)
        LINUX_ARM64=$(grep linux-arm64 sha256sums.txt | cut -d= -f2)
        LINUX_X64=$(grep linux-x64 sha256sums.txt | cut -d= -f2)

        sed -i "s/version \".*\"/version \"${VERSION}\"/" homebrew-tap/Formula/gittui.rb
        # Update each sha256 line with computed values

    - name: Commit and push
      run: |
        git config user.name "github-actions[bot]"
        git config user.email "github-actions[bot]@users.noreply.github.com"
        git add homebrew-tap/Formula/gittui.rb
        git commit -m "chore: update homebrew formula for v${VERSION}"
        git push
```

This is optional for v0.1.0 but highly recommended once you're releasing frequently.

---

## Checklist — First Release

Run through this checklist for the first release:

```
Prerequisites:
  [ ] LICENSE file exists
  [ ] package.json has: license, author, keywords
  [ ] npm package name is available (run: npm view gittui)
  [ ] All tests pass (bun test)
  [ ] Typecheck passes (bun run typecheck)
  [ ] Everything pushed to main

GitHub Release:
  [ ] Tag created: git tag -a v0.1.0 -m "v0.1.0"
  [ ] Tag pushed: git push origin v0.1.0
  [ ] Release workflow completed successfully (gh run watch)
  [ ] 4 tarballs visible in release (gh release view v0.1.0)
  [ ] curl install works

npm:
  [ ] npm account created
  [ ] NPM_TOKEN generated (granular access token)
  [ ] NPM_TOKEN added as GitHub secret (gh secret set NPM_TOKEN)
  [ ] npm publish succeeded (check workflow logs)
  [ ] npm i -g gittui works (on a machine with Bun)

Homebrew:
  [ ] SHA256 computed for all 4 tarballs
  [ ] homebrew-tap/Formula/gittui.rb updated with real hashes
  [ ] Pushed to main
  [ ] brew tap rsbmk/gittui https://github.com/rsbmk/gittui works
  [ ] brew install gittui works
  [ ] gittui --version shows correct version
```

---

## Troubleshooting

### Release workflow fails on `bun build --compile`

- **linux-arm64** cross-compilation from `ubuntu-latest` (x64) can fail.
  The current workflow runs `linux-arm64` on `ubuntu-latest` (x64), which requires
  Bun's cross-compilation support. If this fails, you may need a self-hosted ARM runner
  or use QEMU emulation.

### npm publish fails with 403

- The package name might be taken or too similar to an existing package
- The token might not have write permissions
- Try `npm publish --access public` if the package is scoped

### Homebrew `sha256 mismatch`

- Re-download the tarball and recompute: `curl -sL <url> | shasum -a 256`
- Make sure you're using the FINAL release assets (not draft release URLs)

### curl install says "Could not determine latest version"

- The GitHub API returns empty if there are no releases yet
- Make sure the release is published (not draft)
- Check: `curl -sL https://api.github.com/repos/rsbmk/gittui/releases/latest`
