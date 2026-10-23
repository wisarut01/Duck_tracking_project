#!/usr/bin/env bash
# Starts the 4 backend processes in one container (see Dockerfile).
# They share DATABASE_URL; each keeps its tables in its own schema.
# If any process exits, the container exits too and Render restarts it.
set -euo pipefail

: "${DATABASE_URL:?set DATABASE_URL (Supabase → Connect → Session pooler)}"
export AUTH_MODE="${AUTH_MODE:-supabase}"

DB_SCHEMA=tb_auth    GRPC_ADDR=127.0.0.1:50051 auth-service &
DB_SCHEMA=tb_tracker GRPC_ADDR=127.0.0.1:50052 tracker-service &
DB_SCHEMA=tb_docs    GRPC_ADDR=127.0.0.1:50053 python -m docs_service &

AUTH_ADDR=127.0.0.1:50051 TRACKER_ADDR=127.0.0.1:50052 DOCS_ADDR=127.0.0.1:50053 \
  HTTP_ADDR=":${PORT:-8080}" api-gateway &

wait -n
echo "a backend process exited — stopping the container" >&2
exit 1
