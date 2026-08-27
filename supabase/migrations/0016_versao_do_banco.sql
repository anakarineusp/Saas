-- Um número que diz até onde o banco foi montado.
--
-- Serve para o site perceber sozinho quando alguém publicou uma versão nova
-- do aplicativo mas esqueceu de rodar o arquivo do banco — que é o erro mais
-- fácil de cometer e o mais difícil de entender pelo sintoma.
--
-- Ao criar uma migração nova, suba este número e o número esperado em
-- src/supabase.ts.

create or replace function public.versao_do_banco()
returns int
language sql stable security definer set search_path = '' as $$
  select 16
$$;

grant execute on function public.versao_do_banco() to anon, authenticated;
