#!/usr/bin/env bash
# One-time, idempotent setup for the Frosh Admin Dashboard Cloud Agent
# environment. Installs the toolchain (Docker, Node 24, shopware-cli), pre-pulls
# the Shopware demo-environment image and installs the Playwright test stack.
# Per-boot service startup lives in start.sh instead.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

SW_CLI_VERSION="0.16.10"
DEMO_IMAGE="ghcr.io/friendsofshopware/shopware-demo-environment:6.7"

APT_OPTS=(-y -q -o Dpkg::Options::=--force-confold -o Dpkg::Options::=--force-confdef)
export DEBIAN_FRONTEND=noninteractive

# --- Docker engine -----------------------------------------------------------
if ! command -v docker >/dev/null 2>&1; then
    curl -fsSL https://get.docker.com | sudo sh
fi

# fuse-overlayfs (nested storage driver) + iptables (Docker bridge networking).
sudo apt-get update -qq
sudo apt-get install "${APT_OPTS[@]}" fuse-overlayfs iptables
sudo usermod -aG docker "$USER" || true

sudo mkdir -p /etc/docker
if [ ! -f /etc/docker/daemon.json ]; then
    echo '{ "storage-driver": "fuse-overlayfs" }' | sudo tee /etc/docker/daemon.json >/dev/null
fi

# --- Node.js 24 (required by @shopware-ag/acceptance-test-suite) --------------
if ! /usr/bin/node --version 2>/dev/null | grep -Eq '^v(24|25)\.'; then
    curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
    sudo apt-get install "${APT_OPTS[@]}" nodejs
fi

# --- shopware-cli (builds the admin bundle & uploads via the Admin API) -------
if ! command -v shopware-cli >/dev/null 2>&1; then
    tmp="$(mktemp -d)"
    curl -fsSL "https://github.com/shopware/shopware-cli/releases/download/${SW_CLI_VERSION}/shopware-cli_Linux_x86_64.tar.gz" \
        | tar -xz -C "$tmp"
    sudo install -m0755 "$tmp/shopware-cli" /usr/local/bin/shopware-cli
    rm -rf "$tmp"
fi

# --- Pre-pull the demo-environment image (baked into the snapshot) -----------
sudo bash .cursor/dockerd-up.sh
sudo docker pull "$DEMO_IMAGE"

# --- Playwright test dependencies --------------------------------------------
cd tests
npm ci
npx playwright install --with-deps chromium
