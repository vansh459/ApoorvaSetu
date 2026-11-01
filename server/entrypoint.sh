#!/bin/sh
# Applies migrations and (first boot only) seeds the demo dataset before starting the API.
set -eu

if [ -n "${DATABASE_URL:-}" ]; then
  echo "[entrypoint] applying database migrations"
  attempt=0
  until ./node_modules/.bin/prisma migrate deploy; do
    attempt=$((attempt + 1))
    if [ "$attempt" -ge 30 ]; then
      echo "[entrypoint] database unreachable after $attempt attempts; starting without migrations" >&2
      break
    fi
    sleep 2
  done

  if [ "${SEED_ON_START:-0}" = "1" ]; then
    echo "[entrypoint] seeding the demo dataset if the database is empty"
    node --experimental-strip-types prisma/seed.ts
  fi
fi

exec node --experimental-strip-types server/index.ts
