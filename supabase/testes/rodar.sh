#!/usr/bin/env bash
# Recria um banco limpo para cada teste, aplica todas as migrações e roda tudo.
# Uso: bash supabase/testes/rodar.sh
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BANCO="${BANCO:-transfer_teste}"
COMO="${COMO:-su postgres -c}"

for teste in seguranca pagamentos indicacoes; do
  $COMO "psql -q -c 'drop database if exists $BANCO' -c 'create database $BANCO'" >/dev/null 2>&1

  for arquivo in "$RAIZ"/supabase/local/*.sql "$RAIZ"/supabase/migrations/*.sql; do
    $COMO "psql -q -v ON_ERROR_STOP=1 -d $BANCO -f $arquivo" >/dev/null 2>&1 \
      || { echo "FALHOU ao aplicar $(basename "$arquivo")"; exit 1; }
  done

  $COMO "psql -q -v ON_ERROR_STOP=1 -d $BANCO -f $RAIZ/supabase/testes/00_ajudantes.sql" >/dev/null 2>&1

  echo ""
  echo "### $teste"
  $COMO "psql -q -v ON_ERROR_STOP=1 -d $BANCO -f $RAIZ/supabase/testes/$teste.sql" 2>&1 \
    | grep -E 'NOTICE: +(ok|FALHOU)|^—|PASSARAM|^ERROR' \
    | sed -E 's/.*NOTICE: +//'
done
