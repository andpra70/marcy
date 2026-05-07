#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REGISTRY="${REGISTRY:-docker.io/andpra70}"
IMAGE_NAME="${IMAGE_NAME:-marcy}"
TAG="${TAG:-latest}"
IMAGE="${REGISTRY}/${IMAGE_NAME}:${TAG}"
PUSH_IMAGE="${PUSH_IMAGE:-true}"

cd "${PROJECT_DIR}"

docker build -t "${IMAGE}" .

if [ "${PUSH_IMAGE}" = "true" ]; then
  docker push "${IMAGE}"
fi

echo "Immagine pronta: ${IMAGE}"
