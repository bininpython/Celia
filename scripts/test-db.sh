#!/usr/bin/env bash
# Valida migrations, seed e políticas RLS em um PostgreSQL local descartável.
# Uso: DATABASE_ADMIN_URL=postgres://postgres@localhost:5432/postgres ./scripts/test-db.sh
set -euo pipefail
ADMIN_URL="${DATABASE_ADMIN_URL:-postgres://postgres@localhost:5432/postgres}"
DB="celia_test_$$"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TEST_URL="${ADMIN_URL%/*}/$DB"

cleanup() { psql "$ADMIN_URL" -qc "drop database if exists $DB" >/dev/null 2>&1 || true; }
trap cleanup EXIT

psql "$ADMIN_URL" -qc "create database $DB"
run() { psql "$TEST_URL" -v ON_ERROR_STOP=1 -q -f "$1" >/dev/null; echo "✓ $(basename "$1")"; }

run "$ROOT/supabase/tests/00_supabase_stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do run "$f"; done
run "$ROOT/supabase/seed.sql"
for f in "$ROOT"/supabase/tests/[1-9]*.sql; do
  psql "$TEST_URL" -v ON_ERROR_STOP=1 -q -f "$f"
  echo "✓ $(basename "$f")"
done
echo "Banco de dados: todos os testes passaram."
