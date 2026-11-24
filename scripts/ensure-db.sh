#!/bin/sh
# Starts (once) a private PostgreSQL container for an environment and waits until it is healthy.
# Usage:  POSTGRES_PASSWORD=... APP_DB_PASSWORD=... sh scripts/ensure-db.sh <dev|qa|prod>
# Safe to run on every deploy: an existing DB container and its data volume are left untouched.
set -eu

ENV_NAME="$1"
NET="fc27-${ENV_NAME}-net"
DB="fc27-${ENV_NAME}-db"
VOL="fc27-${ENV_NAME}-pgdata"

docker network inspect "$NET" >/dev/null 2>&1 || docker network create "$NET"

if ! docker container inspect "$DB" >/dev/null 2>&1; then
  # -e NAME (no value) copies it from the environment, so secrets never appear in the command line.
  # No -p flag: the database is NOT reachable from outside the Docker network.
  docker run -d \
    --name "$DB" \
    --restart unless-stopped \
    --network "$NET" \
    --security-opt no-new-privileges:true \
    -e POSTGRES_DB=fc27 \
    -e POSTGRES_USER=admin \
    -e POSTGRES_PASSWORD \
    -e APP_DB_USER=fc27_app \
    -e APP_DB_PASSWORD \
    -e POSTGRES_INITDB_ARGS=--auth-host=scram-sha-256 \
    -v "${VOL}:/var/lib/postgresql/data" \
    -v "$(pwd)/db/init:/docker-entrypoint-initdb.d:ro" \
    postgres:17-alpine
fi

echo "Waiting for PostgreSQL..."
for i in $(seq 1 30); do
  if docker exec "$DB" pg_isready -U _admin -d fc27 >/dev/null 2>&1; then
    echo "PostgreSQL is ready."
    exit 0
  fi
  sleep 2
done
echo "PostgreSQL did not become ready." >&2
docker logs --tail 30 "$DB" >&2 || true
exit 1
