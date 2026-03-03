#!/bin/sh
set -e

REPO="rsbmk/gittui"
INSTALL_DIR="${GITTUI_INSTALL_DIR:-/usr/local/bin}"

OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

case "$ARCH" in
  x86_64) ARCH="x64" ;;
  aarch64|arm64) ARCH="arm64" ;;
  *) echo "Error: Unsupported architecture: $ARCH"; exit 1 ;;
esac

case "$OS" in
  darwin|linux) ;;
  *) echo "Error: Unsupported OS: $OS"; exit 1 ;;
esac

LATEST=$(curl -sL "https://api.github.com/repos/${REPO}/releases/latest" | grep '"tag_name"' | sed 's/.*"v\(.*\)".*/\1/')

if [ -z "$LATEST" ]; then
  echo "Error: Could not determine latest version"
  exit 1
fi

URL="https://github.com/${REPO}/releases/download/v${LATEST}/gittui-${OS}-${ARCH}.tar.gz"

echo "Installing gittui v${LATEST} (${OS}-${ARCH})..."
echo "  from: ${URL}"
echo "  to:   ${INSTALL_DIR}/gittui"
echo ""

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

curl -fsSL "$URL" -o "${TMP}/gittui.tar.gz"
tar xzf "${TMP}/gittui.tar.gz" -C "$TMP"

# Ensure install directory exists, then install binary
if [ -w "$INSTALL_DIR" ] || mkdir -p "$INSTALL_DIR" 2>/dev/null; then
  mv "${TMP}/gittui" "${INSTALL_DIR}/gittui"
else
  echo "Need sudo to install to ${INSTALL_DIR}"
  sudo mkdir -p "$INSTALL_DIR"
  sudo mv "${TMP}/gittui" "${INSTALL_DIR}/gittui"
fi

chmod +x "${INSTALL_DIR}/gittui"

echo ""
echo "gittui v${LATEST} installed to ${INSTALL_DIR}/gittui"
echo ""
echo "Run 'gittui' in a git repository to get started!"
