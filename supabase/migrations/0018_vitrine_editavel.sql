-- O conteúdo da página de vendas sai do código e vem para o banco, para poder
-- ser editado pela administração sem publicar nada.
--
-- Fica tudo numa linha só, em jsonb: assim, acrescentar um campo novo depois
-- não exige mexer na estrutura da tabela.

create table if not exists public.vitrine (
  id            int primary key default 1 check (id = 1),
  conteudo      jsonb not null default '{}'::jsonb,
  atualizada_em timestamptz not null default now()
);

insert into public.vitrine (id, conteudo) values (1, '{}'::jsonb) on conflict (id) do nothing;

alter table public.vitrine enable row level security;

-- Precisa ser lida por quem ainda nem tem conta: é a página de vendas.
drop policy if exists vitrine_ver on public.vitrine;
create policy vitrine_ver on public.vitrine for select using (true);

drop policy if exists vitrine_admin on public.vitrine;
create policy vitrine_admin on public.vitrine for all
  using (app.eh_admin()) with check (app.eh_admin());

grant select on public.vitrine to anon, authenticated;
grant insert, update on public.vitrine to authenticated;

-- ------------------------------------------------------ imagens da vitrine

-- No Supabase existe um lugar para guardar arquivos. Fora dele (por exemplo
-- num PostgreSQL comum, usado para testar), este trecho é ignorado.
do $$
begin
  if to_regclass('storage.buckets') is null then
    return;
  end if;

  insert into storage.buckets (id, name, public)
  values ('vitrine', 'vitrine', true)
  on conflict (id) do update set public = true;

  execute 'drop policy if exists vitrine_arquivos_ver on storage.objects';
  execute $regra$
    create policy vitrine_arquivos_ver on storage.objects for select
      using (bucket_id = 'vitrine')
  $regra$;

  execute 'drop policy if exists vitrine_arquivos_admin on storage.objects';
  execute $regra$
    create policy vitrine_arquivos_admin on storage.objects for all
      using (bucket_id = 'vitrine' and app.eh_admin())
      with check (bucket_id = 'vitrine' and app.eh_admin())
  $regra$;
end $$;

create or replace function public.versao_do_banco() returns int
language sql stable security definer set search_path = '' as $$ select 18 $$;
