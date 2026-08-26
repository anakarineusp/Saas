#!/usr/bin/env bash
# Roda todos os testes: os do banco de dados e os de tela.
#
#   bash ferramentas/testar-tudo.sh
#
# Precisa de um PostgreSQL rodando na máquina e de um usuário chamado "transfer".
# Para criar esse usuário uma vez:
#   sudo -u postgres psql -c "create role transfer login password 'transfer' superuser"
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BANCO="${BANCO:-transfer_local}"
FOTOS="${FOTOS:-/tmp/fotos-do-teste}"
export PGPASSWORD="${PGPASSWORD:-transfer}"

echo "=============================================="
echo " 1. Testes do banco de dados"
echo "=============================================="
bash "$RAIZ/supabase/testes/rodar.sh"

echo ""
echo "=============================================="
echo " 2. Testes de tela"
echo "=============================================="

psql -h 127.0.0.1 -U transfer -d postgres -q -c "drop database if exists $BANCO" -c "create database $BANCO"
for arquivo in "$RAIZ"/supabase/local/*.sql "$RAIZ"/supabase/migrations/*.sql; do
  psql -h 127.0.0.1 -U transfer -d "$BANCO" -q -v ON_ERROR_STOP=1 -f "$arquivo" > /dev/null
done

mkdir -p "$FOTOS"
node "$RAIZ/ferramentas/servidor-local/index.mjs" 54321 "$BANCO" > /tmp/servidor-local.log 2>&1 &
SERVIDOR=$!
# MODO=producao testa o site já construído, do jeitinho que vai para o ar.
if [ "${MODO:-desenvolvimento}" = "producao" ]; then
  echo "  (testando o site construído para produção)"
  (cd "$RAIZ" && npm run build > /tmp/build.log 2>&1) || { echo "falhou ao construir"; exit 1; }
  (cd "$RAIZ" && npm run preview -- --port 5173 --strictPort > /tmp/vite.log 2>&1) &
else
  (cd "$RAIZ" && npm run dev -- --port 5173 --strictPort > /tmp/vite.log 2>&1) &
fi
VITE=$!
trap 'kill $SERVIDOR $VITE 2>/dev/null || true' EXIT

for _ in $(seq 1 30); do
  if curl -sf http://localhost:5173 > /dev/null && curl -sf http://localhost:54321/rest/v1/planos > /dev/null; then break; fi
  sleep 1
done

BANCO="$BANCO" node "$RAIZ/ferramentas/testes-de-tela/fluxo.mjs" "$FOTOS"
echo ""
echo "As fotos das telas ficaram em $FOTOS"
