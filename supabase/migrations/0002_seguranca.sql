-- Quem enxerga o quê. Estas regras valem dentro do banco de dados: mesmo que
-- alguém tente acessar por fora do aplicativo, o banco recusa.

create schema if not exists app;

-- ------------------------------------------------------- quem está logado

create or replace function app.papel() returns text
language sql stable security definer set search_path = '' as $$
  select p.papel from public.perfis p where p.id = auth.uid()
$$;

create or replace function app.empresa_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select p.empresa_id from public.perfis p where p.id = auth.uid()
$$;

create or replace function app.eh_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select p.papel = 'admin' from public.perfis p where p.id = auth.uid()), false)
$$;

create or replace function app.eh_dono_de(p_empresa uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((
    select p.papel = 'dono' and p.empresa_id = p_empresa
    from public.perfis p where p.id = auth.uid()
  ), false)
$$;

-- Os cadastros de motorista ligados a quem está logado (uma pessoa pode dirigir
-- para mais de uma empresa).
create or replace function app.meus_motoristas() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select m.id from public.motoristas m where m.perfil_id = auth.uid()
$$;

-- ------------------------------------------------------------ trancar tudo

alter table public.empresas          enable row level security;
alter table public.perfis            enable row level security;
alter table public.motoristas        enable row level security;
alter table public.indicadores       enable row level security;
alter table public.servicos          enable row level security;
alter table public.servico_valores   enable row level security;
alter table public.convites          enable row level security;
alter table public.planos            enable row level security;
alter table public.assinaturas       enable row level security;
alter table public.pagamentos        enable row level security;
alter table public.eventos_pagamento enable row level security;

-- ----------------------------------------------------------------- empresas

create policy empresas_ver on public.empresas for select using (
  id = app.empresa_id()
  or app.eh_admin()
  or exists (select 1 from public.motoristas m where m.empresa_id = empresas.id and m.perfil_id = auth.uid())
);

create policy empresas_editar on public.empresas for update
  using (app.eh_dono_de(id) or app.eh_admin())
  with check (app.eh_dono_de(id) or app.eh_admin());

-- ------------------------------------------------------------------- perfis

create policy perfis_ver on public.perfis for select using (
  id = auth.uid()
  or app.eh_admin()
  or (empresa_id is not null and empresa_id = app.empresa_id())
);

create policy perfis_editar on public.perfis for update
  using (id = auth.uid()) with check (id = auth.uid());

-- --------------------------------------------------------------- motoristas

create policy motoristas_ver on public.motoristas for select using (
  empresa_id = app.empresa_id() or app.eh_admin() or perfil_id = auth.uid()
);

create policy motoristas_gravar on public.motoristas for insert
  with check (app.eh_dono_de(empresa_id) or app.eh_admin());

create policy motoristas_editar on public.motoristas for update
  using (app.eh_dono_de(empresa_id) or app.eh_admin())
  with check (app.eh_dono_de(empresa_id) or app.eh_admin());

create policy motoristas_excluir on public.motoristas for delete
  using (app.eh_dono_de(empresa_id) or app.eh_admin());

-- -------------------------------------------------------------- indicadores

create policy indicadores_ver on public.indicadores for select
  using (empresa_id = app.empresa_id() or app.eh_admin());

create policy indicadores_gravar on public.indicadores for insert
  with check (app.eh_dono_de(empresa_id) or app.eh_admin());

create policy indicadores_editar on public.indicadores for update
  using (app.eh_dono_de(empresa_id) or app.eh_admin())
  with check (app.eh_dono_de(empresa_id) or app.eh_admin());

create policy indicadores_excluir on public.indicadores for delete
  using (app.eh_dono_de(empresa_id) or app.eh_admin());

-- ----------------------------------------------------------------- serviços
-- O motorista enxerga apenas os serviços que são dele.

create policy servicos_ver on public.servicos for select using (
  empresa_id = app.empresa_id()
  or app.eh_admin()
  or motorista_id in (select app.meus_motoristas())
);

create policy servicos_gravar on public.servicos for insert
  with check (app.eh_dono_de(empresa_id) or app.eh_admin());

create policy servicos_editar on public.servicos for update
  using (app.eh_dono_de(empresa_id) or app.eh_admin())
  with check (app.eh_dono_de(empresa_id) or app.eh_admin());

create policy servicos_excluir on public.servicos for delete
  using (app.eh_dono_de(empresa_id) or app.eh_admin());

-- ------------------------------------------------- valor cobrado do cliente
-- Sem nenhuma regra para motorista: para ele esta tabela simplesmente não existe.

create policy valores_ver on public.servico_valores for select
  using (empresa_id = app.empresa_id() or app.eh_admin());

create policy valores_gravar on public.servico_valores for insert
  with check (app.eh_dono_de(empresa_id) or app.eh_admin());

create policy valores_editar on public.servico_valores for update
  using (app.eh_dono_de(empresa_id) or app.eh_admin())
  with check (app.eh_dono_de(empresa_id) or app.eh_admin());

create policy valores_excluir on public.servico_valores for delete
  using (app.eh_dono_de(empresa_id) or app.eh_admin());

-- ----------------------------------------------------------------- convites

create policy convites_ver on public.convites for select
  using (app.eh_dono_de(empresa_id) or app.eh_admin());

create policy convites_gravar on public.convites for insert
  with check (app.eh_dono_de(empresa_id) or app.eh_admin());

create policy convites_excluir on public.convites for delete
  using (app.eh_dono_de(empresa_id) or app.eh_admin());

-- ------------------------------------------------------------------- planos
-- Os planos são públicos: a página de preços precisa deles antes do cadastro.

create policy planos_ver on public.planos for select using (true);

create policy planos_admin on public.planos for all
  using (app.eh_admin()) with check (app.eh_admin());

-- --------------------------------------------------- assinaturas e pagamentos
-- Só leitura para a empresa. Quem escreve é o servidor que recebe o aviso da
-- empresa de pagamentos (chave de serviço, que passa por cima destas regras).

create policy assinaturas_ver on public.assinaturas for select
  using (empresa_id = app.empresa_id() or app.eh_admin());

create policy pagamentos_ver on public.pagamentos for select
  using (empresa_id = app.empresa_id() or app.eh_admin());

create policy eventos_admin on public.eventos_pagamento for select
  using (app.eh_admin());

-- ------------------------------------------------------------------ acessos

grant usage on schema public, app to anon, authenticated;
grant select on public.planos to anon, authenticated;
grant select, insert, update, delete on
  public.empresas, public.perfis, public.motoristas, public.indicadores,
  public.servicos, public.servico_valores, public.convites
  to authenticated;
grant select on public.assinaturas, public.pagamentos, public.eventos_pagamento to authenticated;
