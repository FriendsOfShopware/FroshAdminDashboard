#!/usr/bin/env bash
# Idempotently start the Docker daemon inside the Cloud Agent VM (Docker-in-Docker).
# Must be run as root (the caller uses sudo). Safe to call repeatedly.
set -euo pipefail

if docker info >/dev/null 2>&1; then
    exit 0
fi

# overlay2 cannot stack on the VM's overlay rootfs, so use fuse-overlayfs.
mkdir -p /etc/docker
if [ ! -f /etc/docker/daemon.json ]; then
    echo '{ "storage-driver": "fuse-overlayfs" }' >/etc/docker/daemon.json
fi

nohup dockerd >/var/log/dockerd.log 2>&1 &

for _ in $(seq 1 60); do
    if docker info >/dev/null 2>&1; then
        exit 0
    fi
    sleep 1
done

echo "dockerd did not become ready; see /var/log/dockerd.log" >&2
tail -n 40 /var/log/dockerd.log >&2 || true
exit 1
