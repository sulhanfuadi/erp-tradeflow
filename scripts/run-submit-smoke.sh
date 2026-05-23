#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="${MONGO_CONTAINER_NAME:-erp-tradeflow-mongo}"
MONGO_IMAGE="${MONGO_IMAGE:-mongo:7}"
MONGO_PORT="${MONGO_PORT:-27017}"
MONGO_RS="${MONGO_RS:-rs0}"
DB_NAME="${DB_NAME:-erp_tradeflow}"

export DATABASE_URL="${DATABASE_URL:-mongodb://127.0.0.1:${MONGO_PORT}/${DB_NAME}?replicaSet=${MONGO_RS}}"

echo "[submit-smoke] DATABASE_URL=$DATABASE_URL"

echo "[submit-smoke] memastikan container MongoDB tersedia..."
if ! docker ps -a --format '{{.Names}}' | grep -Fxq "$CONTAINER_NAME"; then
  docker run -d --name "$CONTAINER_NAME" -p "${MONGO_PORT}:27017" "$MONGO_IMAGE" --replSet "$MONGO_RS" --bind_ip_all >/dev/null
fi

echo "[submit-smoke] memastikan container MongoDB berjalan..."
if ! docker ps --format '{{.Names}}' | grep -Fxq "$CONTAINER_NAME"; then
  docker start "$CONTAINER_NAME" >/dev/null
fi

echo "[submit-smoke] inisialisasi replica set (jika belum)..."
docker exec "$CONTAINER_NAME" mongosh --quiet --eval "try { rs.status().ok } catch (e) { rs.initiate({_id:'${MONGO_RS}', members:[{_id:0, host:'127.0.0.1:${MONGO_PORT}'}]}); 1 }" >/dev/null
sleep 2

echo "[submit-smoke] sinkronisasi schema Prisma..."
npm run prisma:push

echo "[submit-smoke] jalankan unit test..."
npm test

echo "[submit-smoke] jalankan invalidation coverage..."
npm run test:invalidate

echo "[submit-smoke] jalankan e2e Playwright..."
npm run test:e2e

echo "[submit-smoke] selesai ✅"
