#!/usr/bin/env bash
# Recria um banco limpo, aplica todas as migrações e roda os testes de segurança.
# Uso: bash supabase/testes/rodar.sh
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BANCO="${BANCO:-transfer_teste}"
COMO="${COMO:-su postgres -c}"

echo "Recriando o banco $BANCO..."
$COMO "psql -q -c 'drop database if exists $BANCO' -c 'create database $BANCO'" >/dev/null

for arquivo in "$RAIZ"/supabase/local/*.sql "$RAIZ"/supabase/migracoes/*.sql; do
  printf '  aplicando %-28s' "$(basename "$arquivo")"
  $COMO "psql -q -v ON_ERROR_STOP=1 -d $BANCO -f $arquivo" 2>&1 | grep -v 'already exists, skipping' || true
  echo 'ok'
done

echo ''
$COMO "psql -q -v ON_ERROR_STOP=1 -d $BANCO -f $RAIZ/supabase/testes/seguranca.sql" 2>&1 \
  | grep -E 'NOTICE: +(ok|FALHOU)|^—|^TODOS' \
  | sed -E 's/.*NOTICE: +//'
