#!/usr/bin/env bash
# Monta docs/tudo-em-um.sql a partir da pasta supabase/migrations, na ordem.
# É este arquivo que a pessoa cola no SQL Editor do Supabase.
#
#   bash ferramentas/montar-sql.sh
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SAIDA="$RAIZ/docs/tudo-em-um.sql"

{
  cat <<'CABECALHO'
-- =====================================================================
--  TRANSFER — todas as regras do sistema, num arquivo só
-- =====================================================================
--
--  COMO USAR:
--    1. Copie TUDO deste arquivo (aqui no GitHub tem um botão de copiar,
--       no canto de cima à direita da caixa de código).
--    2. No Supabase, abra "SQL Editor" e clique em "New query".
--    3. Cole aqui dentro e clique em "Run".
--    4. Espere aparecer "Success". Pronto, o banco está montado.
--
--  Pode rodar quantas vezes quiser: o que já existir, ele refaz por cima.
--  E é isso que você faz TODA VEZ que o sistema ganhar recursos novos.
--
--  Se o site avisar que "o banco está desatualizado", é este arquivo que
--  resolve: copie e rode de novo.
--
--  Este arquivo é montado a partir da pasta supabase/migrations, pelo
--  comando: bash ferramentas/montar-sql.sh
-- =====================================================================

CABECALHO

  for arquivo in "$RAIZ"/supabase/migrations/*.sql; do
    echo ""
    echo "-- ---------------------------------------------------------------------"
    echo "-- $(basename "$arquivo")"
    echo "-- ---------------------------------------------------------------------"
    echo ""
    cat "$arquivo"
  done
} > "$SAIDA"

echo "montado: $SAIDA ($(grep -c '' "$SAIDA") linhas, $(ls "$RAIZ"/supabase/migrations/*.sql | wc -l) partes)"
