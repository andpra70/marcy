#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "${PROJECT_DIR}/server"
npm install
NODE_ENV=development npm run start &
SERVER_PID=$!

cd "${PROJECT_DIR}/client"
npm install
npm run dev &
CLIENT_PID=$!

cleanup() {
  kill "${SERVER_PID}" "${CLIENT_PID}" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

echo "Server API: http://localhost:3001"
echo "Client Vite: http://localhost:5173"
echo "Apri il client su http://localhost:5173. La porta 3001 serve solo le API in sviluppo."

wait
