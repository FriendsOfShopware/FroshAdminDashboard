#!/usr/bin/env bash
# Per-boot startup: bring up Docker, run the Shopware demo shop on :8000, then
# build and install the plugin so the environment is ready to develop and test.
# Must reconcile an already-running state and then return.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

DEMO_IMAGE="ghcr.io/friendsofshopware/shopware-demo-environment:6.7"
APP_URL="http://localhost:8000"

# --- Docker daemon -----------------------------------------------------------
sudo bash .cursor/dockerd-up.sh

# --- Shopware demo container -------------------------------------------------
if ! sudo docker ps --format '{{.Names}}' | grep -qx shopware; then
    if sudo docker ps -a --format '{{.Names}}' | grep -qx shopware; then
        sudo docker start shopware
    else
        sudo docker run -d --name shopware -p 8000:8000 "$DEMO_IMAGE"
    fi
fi

# --- Wait for the Admin API to answer ----------------------------------------
echo "Waiting for the Shopware Admin API..."
ready=0
for _ in $(seq 1 60); do
    if curl -s -X POST "${APP_URL}/api/oauth/token" \
        -H 'Content-Type: application/json' \
        -d '{"grant_type":"password","client_id":"administration","username":"admin","password":"shopware"}' \
        | grep -q access_token; then
        ready=1
        break
    fi
    sleep 5
done
if [ "$ready" -ne 1 ]; then
    echo "Shopware Admin API did not become ready in time" >&2
    exit 1
fi

# --- Build + install the plugin (fresh DB on each boot needs it re-uploaded) --
export PATH="/usr/local/bin:${PATH}"
export SHOPWARE_CLI_API_URL="${APP_URL}"
export SHOPWARE_CLI_API_USERNAME="admin"
export SHOPWARE_CLI_API_PASSWORD="shopware"

rm -rf dist
shopware-cli extension zip . --output-directory dist --disable-git
shopware-cli project extension upload dist/FroshAdminDashboard.zip --activate

echo "Shopware is ready at ${APP_URL}/admin (admin / shopware)."
