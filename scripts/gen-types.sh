#!/usr/bin/env bash
# Aplica as migrations em um banco temporário e gera src/types/database.ts
set -euo pipefail
ADMIN_URL="${DATABASE_ADMIN_URL:-postgres://postgres@localhost:5432/postgres}"
DB="celia_types_$$"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
URL="${ADMIN_URL%/*}/$DB"
trap 'psql "$ADMIN_URL" -qc "drop database if exists $DB" >/dev/null 2>&1 || true' EXIT
psql "$ADMIN_URL" -qc "create database $DB"
psql "$URL" -v ON_ERROR_STOP=1 -q -f "$ROOT/supabase/tests/00_supabase_stub.sql" >/dev/null
for f in "$ROOT"/supabase/migrations/*.sql; do psql "$URL" -v ON_ERROR_STOP=1 -q -f "$f" >/dev/null; done
cd "$ROOT" && node scripts/gen-types.mjs "$URL"
