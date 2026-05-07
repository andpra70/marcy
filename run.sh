#!/usr/bin/env bash
set -euo pipefail

REGISTRY="${REGISTRY:-docker.io/andpra70}"
IMAGE_NAME="${IMAGE_NAME:-marcy}"
TAG="${TAG:-latest}"
CONTAINER_NAME="${CONTAINER_NAME:-marcy-app}"
HOST_PORT="${HOST_PORT:-3001}"
CONTAINER_PORT="${CONTAINER_PORT:-3001}"
IMAGE="${REGISTRY}/${IMAGE_NAME}:${TAG}"

if docker ps -a --format '{{.Names}}' | grep -Fxq "${CONTAINER_NAME}"; then
  docker stop "${CONTAINER_NAME}" >/dev/null
  docker rm "${CONTAINER_NAME}" >/dev/null
fi

docker pull "${IMAGE}"

docker run -d \
  --name "${CONTAINER_NAME}" \
  --restart unless-stopped \
  -p "${HOST_PORT}:${CONTAINER_PORT}" \
  -e PORT="${CONTAINER_PORT}" \
  -e STRIPE_SECRET_KEY="${STRIPE_SECRET_KEY:-}" \
  "${IMAGE}"

echo "Container ${CONTAINER_NAME} avviato"
echo "Immagine: ${IMAGE}"
echo "URL: http://localhost:${HOST_PORT}"
