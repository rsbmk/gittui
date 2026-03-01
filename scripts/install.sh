#!/bin/sh
set -e

REPO="guit-cli/guit"
INSTALL_DIR="${GUIT_INSTALL_DIR:-/usr/local/bin}"

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

URL="https://github.com/${REPO}/releases/download/v${LATEST}/guit-${OS}-${ARCH}.tar.gz"

echo "Installing guit v${LATEST} (${OS}-${ARCH})..."
echo "  from: ${URL}"
echo "  to:   ${INSTALL_DIR}/guit"
echo ""

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

curl -fsSL "$URL" -o "${TMP}/guit.tar.gz"
tar xzf "${TMP}/guit.tar.gz" -C "$TMP"

# Install - try without sudo first, fall back to sudo
if [ -w "$INSTALL_DIR" ]; then
  mv "${TMP}/guit" "${INSTALL_DIR}/guit"
else
  echo "Need sudo to install to ${INSTALL_DIR}"
  sudo mv "${TMP}/guit" "${INSTALL_DIR}/guit"
fi

chmod +x "${INSTALL_DIR}/guit"

echo ""
echo "guit v${LATEST} installed to ${INSTALL_DIR}/guit"
echo ""
echo "Run 'guit' in a git repository to get started!"
