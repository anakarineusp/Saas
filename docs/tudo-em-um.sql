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
--  Pode rodar mais de uma vez sem medo: o que já existir, ele refaz por cima.
--
--  Este arquivo é montado a partir da pasta supabase/migrations.
--  Mexeu aqui, mexa lá também.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0001_estrutura.sql
-- ---------------------------------------------------------------------

-- Estrutura do banco de dados.
-- Vale para o Supabase e para qualquer PostgreSQL 15+.
-- Dinheiro é sempre guardado em centavos, em número inteiro, para nunca ter erro de arredondamento.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- empresas

create table if not exists public.empresas (
  id                uuid primary key default gen_random_uuid(),
  nome              text not null,
  documento         text,                    -- CNPJ ou CPF
  telefone          text,
  cidade            text,
  criada_em         timestamptz not null default now(),
  teste_termina_em  timestamptz not null default now() + interval '7 days'
);

-- ------------------------------------------------------------------ perfis
-- Uma linha para cada pessoa que faz login. O papel decide o que ela enxerga.
--   dono      = dono da empresa de transfer, cliente pagante
--   motorista = motorista convidado por uma empresa
--   admin     = você, dona do sistema

create table if not exists public.perfis (
  id          uuid primary key references auth.users(id) on delete cascade,
  nome        text not null,
  telefone    text,
  papel       text not null check (papel in ('dono', 'motorista', 'admin')),
  empresa_id  uuid references public.empresas(id) on delete cascade,
  criado_em   timestamptz not null default now(),
  constraint dono_tem_empresa check (papel <> 'dono' or empresa_id is not null)
);

create index if not exists perfis_empresa_idx on public.perfis (empresa_id);

-- ------------------------------------------------------------- operacional

create table if not exists public.motoristas (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas(id) on delete cascade,
  perfil_id   uuid references public.perfis(id) on delete set null,
  nome        text not null,
  telefone    text not null,
  veiculo     text not null,
  lugares     int  not null check (lugares > 0),
  percentual  numeric(5, 2) not null check (percentual >= 0 and percentual <= 100),
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now()
);

create index if not exists motoristas_empresa_idx on public.motoristas (empresa_id);
create unique index if not exists motoristas_perfil_unico
  on public.motoristas (empresa_id, perfil_id) where perfil_id is not null;

create table if not exists public.indicadores (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas(id) on delete cascade,
  nome        text not null,
  telefone    text,
  comissao    numeric(5, 2) not null check (comissao >= 0 and comissao <= 100),
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now()
);

create index if not exists indicadores_empresa_idx on public.indicadores (empresa_id);

-- Serviço: tudo o que o motorista pode ver.
-- O valor cobrado do cliente NÃO fica aqui — fica em servico_valores.
create table if not exists public.servicos (
  id                       uuid primary key default gen_random_uuid(),
  empresa_id               uuid not null references public.empresas(id) on delete cascade,
  data                     date not null,
  hora                     time not null,
  tipo                     text not null check (tipo in ('transfer_in', 'transfer_out', 'passeio')),
  passageiro               text not null,
  pax                      int  not null check (pax > 0),
  origem                   text not null,
  destino                  text not null,
  voo                      text,
  motorista_id             uuid references public.motoristas(id) on delete set null,
  indicador_id             uuid references public.indicadores(id) on delete set null,
  valor_motorista_centavos int  not null default 0 check (valor_motorista_centavos >= 0),
  status                   text not null default 'sem_motorista'
                             check (status in ('sem_motorista', 'atribuido', 'confirmado', 'concluido')),
  criado_em                timestamptz not null default now()
);

create index if not exists servicos_empresa_data_idx on public.servicos (empresa_id, data);
create index if not exists servicos_motorista_idx on public.servicos (motorista_id, data);

-- O valor cobrado do cliente vive numa tabela separada, sem nenhuma permissão
-- para motorista. Assim a regra "o motorista nunca vê o valor" é garantida pelo
-- banco de dados, e não só pela tela.
create table if not exists public.servico_valores (
  servico_id                  uuid primary key references public.servicos(id) on delete cascade,
  empresa_id                  uuid not null references public.empresas(id) on delete cascade,
  valor_centavos              int not null check (valor_centavos >= 0),
  comissao_indicador_centavos int not null default 0 check (comissao_indicador_centavos >= 0)
);

create index if not exists servico_valores_empresa_idx on public.servico_valores (empresa_id);

-- Convite para o motorista criar o login dele, sem a empresa saber a senha.
create table if not exists public.convites (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references public.empresas(id) on delete cascade,
  motorista_id  uuid not null references public.motoristas(id) on delete cascade,
  token         text not null unique default encode(gen_random_bytes(16), 'hex'),
  expira_em     timestamptz not null default now() + interval '14 days',
  usado_em      timestamptz,
  criado_em     timestamptz not null default now()
);

-- ------------------------------------------------------------ planos e dinheiro

create table if not exists public.planos (
  id                  text primary key,          -- 'essencial', 'profissional'
  nome                text not null,
  descricao           text,
  preco_centavos      int  not null check (preco_centavos >= 0),
  limite_motoristas   int,                       -- nulo = sem limite
  limite_servicos_mes int,
  ordem               int  not null default 0,
  ativo               boolean not null default true
);

create table if not exists public.assinaturas (
  id                     uuid primary key default gen_random_uuid(),
  empresa_id             uuid not null unique references public.empresas(id) on delete cascade,
  plano_id               text references public.planos(id),
  status                 text not null default 'teste'
                           check (status in ('teste', 'ativa', 'atrasada', 'cancelada')),
  inicio                 timestamptz not null default now(),
  proxima_cobranca       date,
  cancelada_em           timestamptz,
  provedor               text,                   -- 'asaas', 'mercadopago'
  provedor_cliente_id    text,
  provedor_assinatura_id text,
  atualizada_em          timestamptz not null default now()
);

create table if not exists public.pagamentos (
  id                    uuid primary key default gen_random_uuid(),
  empresa_id            uuid not null references public.empresas(id) on delete cascade,
  assinatura_id         uuid references public.assinaturas(id) on delete set null,
  valor_centavos        int  not null check (valor_centavos >= 0),
  status                text not null check (status in ('pendente', 'pago', 'falhou', 'estornado')),
  metodo                text check (metodo in ('pix', 'boleto', 'cartao')),
  vencimento            date,
  pago_em               timestamptz,
  provedor              text,
  provedor_cobranca_id  text unique,
  criado_em             timestamptz not null default now()
);

create index if not exists pagamentos_empresa_idx on public.pagamentos (empresa_id, criado_em desc);

-- Tudo o que a empresa de pagamentos avisa fica registrado aqui, sem repetir.
create table if not exists public.eventos_pagamento (
  id                  uuid primary key default gen_random_uuid(),
  provedor            text not null,
  provedor_evento_id  text not null,
  tipo                text,
  corpo               jsonb not null,
  processado_em       timestamptz,
  recebido_em         timestamptz not null default now(),
  unique (provedor, provedor_evento_id)
);


-- ---------------------------------------------------------------------
-- 0002_seguranca.sql
-- ---------------------------------------------------------------------

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

drop policy if exists empresas_ver on public.empresas;
create policy empresas_ver on public.empresas for select using (
  id = app.empresa_id()
  or app.eh_admin()
  or exists (select 1 from public.motoristas m where m.empresa_id = empresas.id and m.perfil_id = auth.uid())
);

drop policy if exists empresas_editar on public.empresas;
create policy empresas_editar on public.empresas for update
  using (app.eh_dono_de(id) or app.eh_admin())
  with check (app.eh_dono_de(id) or app.eh_admin());

-- ------------------------------------------------------------------- perfis

drop policy if exists perfis_ver on public.perfis;
create policy perfis_ver on public.perfis for select using (
  id = auth.uid()
  or app.eh_admin()
  or (empresa_id is not null and empresa_id = app.empresa_id())
);

drop policy if exists perfis_editar on public.perfis;
create policy perfis_editar on public.perfis for update
  using (id = auth.uid()) with check (id = auth.uid());

-- --------------------------------------------------------------- motoristas

drop policy if exists motoristas_ver on public.motoristas;
create policy motoristas_ver on public.motoristas for select using (
  empresa_id = app.empresa_id() or app.eh_admin() or perfil_id = auth.uid()
);

drop policy if exists motoristas_gravar on public.motoristas;
create policy motoristas_gravar on public.motoristas for insert
  with check (app.eh_dono_de(empresa_id) or app.eh_admin());

drop policy if exists motoristas_editar on public.motoristas;
create policy motoristas_editar on public.motoristas for update
  using (app.eh_dono_de(empresa_id) or app.eh_admin())
  with check (app.eh_dono_de(empresa_id) or app.eh_admin());

drop policy if exists motoristas_excluir on public.motoristas;
create policy motoristas_excluir on public.motoristas for delete
  using (app.eh_dono_de(empresa_id) or app.eh_admin());

-- -------------------------------------------------------------- indicadores

drop policy if exists indicadores_ver on public.indicadores;
create policy indicadores_ver on public.indicadores for select
  using (empresa_id = app.empresa_id() or app.eh_admin());

drop policy if exists indicadores_gravar on public.indicadores;
create policy indicadores_gravar on public.indicadores for insert
  with check (app.eh_dono_de(empresa_id) or app.eh_admin());

drop policy if exists indicadores_editar on public.indicadores;
create policy indicadores_editar on public.indicadores for update
  using (app.eh_dono_de(empresa_id) or app.eh_admin())
  with check (app.eh_dono_de(empresa_id) or app.eh_admin());

drop policy if exists indicadores_excluir on public.indicadores;
create policy indicadores_excluir on public.indicadores for delete
  using (app.eh_dono_de(empresa_id) or app.eh_admin());

-- ----------------------------------------------------------------- serviços
-- O motorista enxerga apenas os serviços que são dele.

drop policy if exists servicos_ver on public.servicos;
create policy servicos_ver on public.servicos for select using (
  empresa_id = app.empresa_id()
  or app.eh_admin()
  or motorista_id in (select app.meus_motoristas())
);

drop policy if exists servicos_gravar on public.servicos;
create policy servicos_gravar on public.servicos for insert
  with check (app.eh_dono_de(empresa_id) or app.eh_admin());

drop policy if exists servicos_editar on public.servicos;
create policy servicos_editar on public.servicos for update
  using (app.eh_dono_de(empresa_id) or app.eh_admin())
  with check (app.eh_dono_de(empresa_id) or app.eh_admin());

drop policy if exists servicos_excluir on public.servicos;
create policy servicos_excluir on public.servicos for delete
  using (app.eh_dono_de(empresa_id) or app.eh_admin());

-- ------------------------------------------------- valor cobrado do cliente
-- Sem nenhuma regra para motorista: para ele esta tabela simplesmente não existe.

drop policy if exists valores_ver on public.servico_valores;
create policy valores_ver on public.servico_valores for select
  using (empresa_id = app.empresa_id() or app.eh_admin());

drop policy if exists valores_gravar on public.servico_valores;
create policy valores_gravar on public.servico_valores for insert
  with check (app.eh_dono_de(empresa_id) or app.eh_admin());

drop policy if exists valores_editar on public.servico_valores;
create policy valores_editar on public.servico_valores for update
  using (app.eh_dono_de(empresa_id) or app.eh_admin())
  with check (app.eh_dono_de(empresa_id) or app.eh_admin());

drop policy if exists valores_excluir on public.servico_valores;
create policy valores_excluir on public.servico_valores for delete
  using (app.eh_dono_de(empresa_id) or app.eh_admin());

-- ----------------------------------------------------------------- convites

drop policy if exists convites_ver on public.convites;
create policy convites_ver on public.convites for select
  using (app.eh_dono_de(empresa_id) or app.eh_admin());

drop policy if exists convites_gravar on public.convites;
create policy convites_gravar on public.convites for insert
  with check (app.eh_dono_de(empresa_id) or app.eh_admin());

drop policy if exists convites_excluir on public.convites;
create policy convites_excluir on public.convites for delete
  using (app.eh_dono_de(empresa_id) or app.eh_admin());

-- ------------------------------------------------------------------- planos
-- Os planos são públicos: a página de preços precisa deles antes do cadastro.

drop policy if exists planos_ver on public.planos;
create policy planos_ver on public.planos for select using (true);

drop policy if exists planos_admin on public.planos;
create policy planos_admin on public.planos for all
  using (app.eh_admin()) with check (app.eh_admin());

-- --------------------------------------------------- assinaturas e pagamentos
-- Só leitura para a empresa. Quem escreve é o servidor que recebe o aviso da
-- empresa de pagamentos (chave de serviço, que passa por cima destas regras).

drop policy if exists assinaturas_ver on public.assinaturas;
create policy assinaturas_ver on public.assinaturas for select
  using (empresa_id = app.empresa_id() or app.eh_admin());

drop policy if exists pagamentos_ver on public.pagamentos;
create policy pagamentos_ver on public.pagamentos for select
  using (empresa_id = app.empresa_id() or app.eh_admin());

drop policy if exists eventos_admin on public.eventos_pagamento;
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


-- ---------------------------------------------------------------------
-- 0003_operacoes.sql
-- ---------------------------------------------------------------------

-- As operações que mexem em mais de uma tabela ao mesmo tempo ficam aqui dentro
-- do banco, para nunca gravar pela metade e para a conta do motorista ser
-- sempre calculada no mesmo lugar.

-- --------------------------------------------------------- cadastro da empresa
-- Chamada logo depois que a pessoa cria o login. Cria a empresa, o perfil de
-- dono e a assinatura em teste de 7 dias, tudo de uma vez.

create or replace function public.criar_empresa(
  p_empresa   text,
  p_seu_nome  text,
  p_telefone  text default null,
  p_documento text default null,
  p_cidade    text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_usuario uuid := auth.uid();
  v_empresa uuid;
begin
  if v_usuario is null then
    raise exception 'Faça login antes de cadastrar a empresa.';
  end if;
  if exists (select 1 from public.perfis p where p.id = v_usuario) then
    raise exception 'Esta conta já está ligada a uma empresa.';
  end if;

  insert into public.empresas (nome, documento, telefone, cidade)
  values (p_empresa, p_documento, p_telefone, p_cidade)
  returning id into v_empresa;

  insert into public.perfis (id, nome, telefone, papel, empresa_id)
  values (v_usuario, p_seu_nome, p_telefone, 'dono', v_empresa);

  insert into public.assinaturas (empresa_id, status)
  values (v_empresa, 'teste');

  return v_empresa;
end;
$$;

-- ------------------------------------------------------- cadastro do motorista
-- O motorista entra pelo link de convite, cria a senha dele e fica ligado ao
-- cadastro que a empresa já tinha feito. A empresa nunca vê a senha.

create or replace function public.aceitar_convite(p_token text, p_seu_nome text default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_usuario uuid := auth.uid();
  v_convite public.convites;
  v_nome    text;
begin
  if v_usuario is null then
    raise exception 'Faça login antes de aceitar o convite.';
  end if;

  select * into v_convite from public.convites c
   where c.token = p_token and c.usado_em is null and c.expira_em > now();

  if not found then
    raise exception 'Convite inválido ou vencido.';
  end if;

  select coalesce(p_seu_nome, m.nome) into v_nome
    from public.motoristas m where m.id = v_convite.motorista_id;

  insert into public.perfis (id, nome, papel)
  values (v_usuario, v_nome, 'motorista')
  on conflict (id) do nothing;

  update public.motoristas set perfil_id = v_usuario where id = v_convite.motorista_id;
  update public.convites set usado_em = now() where id = v_convite.id;

  return v_convite.motorista_id;
end;
$$;

-- ----------------------------------------------------------------- serviços

-- Grava o serviço e o valor do cliente juntos, e recalcula o que o motorista
-- recebe. Se p_id vier preenchido, edita; se vier vazio, cria.
create or replace function public.gravar_servico(
  p_data           date,
  p_hora           time,
  p_tipo           text,
  p_passageiro     text,
  p_pax            int,
  p_origem         text,
  p_destino        text,
  p_valor_centavos int,
  p_voo            text default null,
  p_indicador_id   uuid default null,
  p_id             uuid default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_empresa   uuid := app.empresa_id();
  v_id        uuid := p_id;
  v_percentual numeric := 0;
  v_comissao  numeric := 0;
begin
  if v_empresa is null or app.papel() <> 'dono' then
    raise exception 'Só o dono da empresa pode gravar serviços.';
  end if;

  if v_id is null then
    insert into public.servicos (empresa_id, data, hora, tipo, passageiro, pax, origem, destino, voo, indicador_id)
    values (v_empresa, p_data, p_hora, p_tipo, p_passageiro, p_pax, p_origem, p_destino, p_voo, p_indicador_id)
    returning id into v_id;
  else
    update public.servicos s
       set data = p_data, hora = p_hora, tipo = p_tipo, passageiro = p_passageiro,
           pax = p_pax, origem = p_origem, destino = p_destino, voo = p_voo,
           indicador_id = p_indicador_id
     where s.id = v_id and s.empresa_id = v_empresa;
    if not found then
      raise exception 'Serviço não encontrado nesta empresa.';
    end if;
  end if;

  select coalesce(i.comissao, 0) into v_comissao
    from public.indicadores i where i.id = p_indicador_id;

  insert into public.servico_valores (servico_id, empresa_id, valor_centavos, comissao_indicador_centavos)
  values (v_id, v_empresa, p_valor_centavos, round(p_valor_centavos * coalesce(v_comissao, 0) / 100))
  on conflict (servico_id) do update
    set valor_centavos = excluded.valor_centavos,
        comissao_indicador_centavos = excluded.comissao_indicador_centavos;

  -- se já tem motorista, o valor dele acompanha a mudança
  select m.percentual into v_percentual
    from public.servicos s join public.motoristas m on m.id = s.motorista_id
   where s.id = v_id;

  update public.servicos
     set valor_motorista_centavos = round(p_valor_centavos * coalesce(v_percentual, 0) / 100)
   where id = v_id;

  return v_id;
end;
$$;

-- Atribui o motorista e já grava o valor que é dele.
create or replace function public.atribuir_motorista(p_servico_id uuid, p_motorista_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_empresa    uuid := app.empresa_id();
  v_valor      int;
  v_percentual numeric;
begin
  if v_empresa is null or app.papel() <> 'dono' then
    raise exception 'Só o dono da empresa pode atribuir motoristas.';
  end if;

  select v.valor_centavos into v_valor
    from public.servico_valores v
    join public.servicos s on s.id = v.servico_id
   where v.servico_id = p_servico_id and s.empresa_id = v_empresa;

  if not found then
    raise exception 'Serviço não encontrado nesta empresa.';
  end if;

  select m.percentual into v_percentual
    from public.motoristas m where m.id = p_motorista_id and m.empresa_id = v_empresa;

  if not found then
    raise exception 'Motorista não encontrado nesta empresa.';
  end if;

  update public.servicos
     set motorista_id = p_motorista_id,
         status = 'atribuido',
         valor_motorista_centavos = round(v_valor * v_percentual / 100)
   where id = p_servico_id;
end;
$$;

-- O motorista confirma o serviço dele. Não consegue mexer em mais nada.
create or replace function public.confirmar_servico(p_servico_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.servicos s
     set status = 'confirmado'
   where s.id = p_servico_id
     and s.motorista_id in (select app.meus_motoristas())
     and s.status in ('atribuido', 'confirmado');

  if not found then
    raise exception 'Este serviço não é seu.';
  end if;
end;
$$;

-- --------------------------------------------------------------- assinatura

-- Quantos dias de teste ainda restam e em que pé está a assinatura.
drop view if exists public.minha_assinatura;
create view public.minha_assinatura
with (security_invoker = true) as
select
  a.empresa_id,
  e.nome as empresa,
  a.status,
  a.plano_id,
  p.nome as plano,
  p.preco_centavos,
  a.proxima_cobranca,
  e.teste_termina_em,
  greatest(0, ceil(extract(epoch from (e.teste_termina_em - now())) / 86400))::int as dias_de_teste,
  (a.status = 'ativa' or (a.status = 'teste' and e.teste_termina_em > now())) as pode_usar
from public.assinaturas a
join public.empresas e on e.id = a.empresa_id
left join public.planos p on p.id = a.plano_id;

-- ------------------------------------------------------------ painel do dono do sistema

drop view if exists public.painel_clientes;
create view public.painel_clientes
with (security_invoker = true) as
select
  e.id,
  e.nome,
  e.documento,
  e.telefone,
  e.cidade,
  e.criada_em,
  e.teste_termina_em,
  a.status,
  a.plano_id,
  a.proxima_cobranca,
  (select count(*) from public.motoristas m where m.empresa_id = e.id) as motoristas,
  (select count(*) from public.servicos s where s.empresa_id = e.id) as servicos,
  coalesce((select sum(pg.valor_centavos) from public.pagamentos pg
             where pg.empresa_id = e.id and pg.status = 'pago'), 0) as pago_centavos
from public.empresas e
left join public.assinaturas a on a.empresa_id = e.id;

grant select on public.minha_assinatura, public.painel_clientes to authenticated;
grant execute on function
  public.criar_empresa(text, text, text, text, text),
  public.aceitar_convite(text, text),
  public.gravar_servico(date, time, text, text, int, text, text, int, text, uuid, uuid),
  public.atribuir_motorista(uuid, uuid),
  public.confirmar_servico(uuid)
  to authenticated;


-- ---------------------------------------------------------------------
-- 0004_planos.sql
-- ---------------------------------------------------------------------

-- Os planos vendidos. Mude preço e limites aqui.

insert into public.planos (id, nome, descricao, preco_centavos, limite_motoristas, limite_servicos_mes, ordem)
values
  ('essencial',    'Essencial',    'Para quem está começando, com até 3 motoristas.',      9900,  3,   150,  1),
  ('profissional', 'Profissional', 'Para a operação do dia a dia, motoristas à vontade.', 19900,  null, null, 2),
  ('frota',        'Frota',        'Para quem tem vários carros e precisa de apoio.',     34900,  null, null, 3)
on conflict (id) do update
  set nome = excluded.nome,
      descricao = excluded.descricao,
      preco_centavos = excluded.preco_centavos,
      limite_motoristas = excluded.limite_motoristas,
      limite_servicos_mes = excluded.limite_servicos_mes,
      ordem = excluded.ordem;


-- ---------------------------------------------------------------------
-- 0005_confirmacao_sem_login.sql
-- ---------------------------------------------------------------------

-- A regra do produto continua valendo: o motorista NÃO é obrigado a criar conta.
-- Ele recebe um link com uma chave secreta, abre no navegador e confirma.
-- A chave dá acesso a um serviço só, e a nada mais.

create table if not exists public.confirmacoes (
  token         text primary key default encode(gen_random_bytes(24), 'hex'),
  servico_id    uuid not null references public.servicos(id) on delete cascade,
  motorista_id  uuid not null references public.motoristas(id) on delete cascade,
  criada_em     timestamptz not null default now(),
  expira_em     timestamptz not null default now() + interval '30 days',
  confirmada_em timestamptz
);

create index if not exists confirmacoes_servico_idx on public.confirmacoes (servico_id);

alter table public.confirmacoes enable row level security;

drop policy if exists confirmacoes_ver on public.confirmacoes;
create policy confirmacoes_ver on public.confirmacoes for select
  using (app.eh_dono_de((select s.empresa_id from public.servicos s where s.id = servico_id)) or app.eh_admin());

-- Cria (ou reaproveita) o link do serviço. Só o dono da empresa consegue.
create or replace function public.link_do_servico(p_servico_id uuid)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_empresa   uuid := app.empresa_id();
  v_motorista uuid;
  v_token     text;
begin
  select s.motorista_id into v_motorista
    from public.servicos s where s.id = p_servico_id and s.empresa_id = v_empresa;

  if v_motorista is null then
    raise exception 'O serviço precisa ter motorista antes de gerar o link.';
  end if;

  select c.token into v_token
    from public.confirmacoes c
   where c.servico_id = p_servico_id and c.motorista_id = v_motorista and c.expira_em > now();

  if v_token is null then
    insert into public.confirmacoes (servico_id, motorista_id)
    values (p_servico_id, v_motorista)
    returning token into v_token;
  end if;

  return v_token;
end;
$$;

-- O que o motorista enxerga ao abrir o link, sem login nenhum.
-- Repare que o valor cobrado do cliente não sai daqui de dentro.
create or replace function public.servico_do_link(p_token text)
returns table (
  servico_id               uuid,
  data                     date,
  hora                     time,
  tipo                     text,
  passageiro               text,
  pax                      int,
  origem                   text,
  destino                  text,
  voo                      text,
  motorista                text,
  empresa                  text,
  valor_motorista_centavos int,
  confirmado               boolean
)
language sql stable security definer set search_path = '' as $$
  select s.id, s.data, s.hora, s.tipo, s.passageiro, s.pax, s.origem, s.destino, s.voo,
         m.nome, e.nome, s.valor_motorista_centavos,
         (s.status in ('confirmado', 'concluido'))
    from public.confirmacoes c
    join public.servicos s   on s.id = c.servico_id
    join public.motoristas m on m.id = c.motorista_id
    join public.empresas e   on e.id = s.empresa_id
   where c.token = p_token and c.expira_em > now();
$$;

-- O "Aceito" do motorista, também sem login.
create or replace function public.confirmar_pelo_link(p_token text)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_servico uuid;
begin
  select c.servico_id into v_servico
    from public.confirmacoes c where c.token = p_token and c.expira_em > now();

  if v_servico is null then
    raise exception 'Link inválido ou vencido.';
  end if;

  update public.servicos set status = 'confirmado'
   where id = v_servico and status = 'atribuido';

  update public.confirmacoes set confirmada_em = now() where token = p_token;
  return true;
end;
$$;

grant execute on function public.link_do_servico(uuid) to authenticated;
grant execute on function public.servico_do_link(text) to anon, authenticated;
grant execute on function public.confirmar_pelo_link(text) to anon, authenticated;


-- ---------------------------------------------------------------------
-- 0006_limites_do_plano.sql
-- ---------------------------------------------------------------------

-- Cada plano tem limite de motoristas. Quem está no teste de 7 dias usa o limite
-- do plano de entrada. Quem passou do teste sem assinar não cadastra mais serviço.

-- Atenção: plano sem limite guarda "nulo" no limite, que é diferente de "não tem
-- plano". Por isso o caso é decidido antes, e não com coalesce.
create or replace function app.limite_de_motoristas(p_empresa uuid)
returns int
language sql stable security definer set search_path = '' as $$
  select case
    when exists (
      select 1 from public.assinaturas a
       where a.empresa_id = p_empresa and a.status = 'ativa' and a.plano_id is not null
    )
    then (
      select p.limite_motoristas
        from public.assinaturas a
        join public.planos p on p.id = a.plano_id
       where a.empresa_id = p_empresa and a.status = 'ativa'
    )
    else (select p.limite_motoristas from public.planos p where p.id = 'essencial')
  end
$$;

create or replace function app.pode_usar(p_empresa uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((
    select a.status = 'ativa'
        or (a.status in ('teste', 'atrasada') and e.teste_termina_em > now())
      from public.assinaturas a
      join public.empresas e on e.id = a.empresa_id
     where a.empresa_id = p_empresa
  ), false)
$$;

create or replace function app.confere_limite_motoristas()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_limite  int := app.limite_de_motoristas(new.empresa_id);
  v_quantos int;
begin
  if v_limite is null then
    return new;
  end if;

  select count(*) into v_quantos from public.motoristas m where m.empresa_id = new.empresa_id;

  if v_quantos >= v_limite then
    raise exception 'O plano atual permite % motoristas. Mude de plano para cadastrar mais.', v_limite
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists limite_motoristas on public.motoristas;
create trigger limite_motoristas before insert on public.motoristas
  for each row execute function app.confere_limite_motoristas();

-- Depois do teste vencido e sem assinatura, a empresa não grava mais serviços.
create or replace function app.confere_assinatura()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not app.pode_usar(new.empresa_id) then
    raise exception 'O período de teste terminou. Escolha um plano para continuar.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists assinatura_ativa on public.servicos;
create trigger assinatura_ativa before insert on public.servicos
  for each row execute function app.confere_assinatura();

-- Descobre o plano pelo valor pago, usado quando o pagamento chega sem plano escolhido.
create or replace function app.plano_do_valor(p_centavos int)
returns text
language sql stable security definer set search_path = '' as $$
  select p.id from public.planos p
   where p.preco_centavos = p_centavos and p.ativo
   order by p.ordem limit 1
$$;


-- ---------------------------------------------------------------------
-- 0007_pagamentos.sql
-- ---------------------------------------------------------------------

-- Toda a lógica de cobrança mora aqui dentro, para poder ser testada sem
-- depender da empresa de pagamentos. O servidor que recebe o aviso (webhook)
-- só repassa o recado para esta função.
--
-- Hoje está escrito para o formato do Asaas. Trocar de empresa de pagamentos
-- significa mexer só no "de para" do começo desta função.

create or replace function public.processar_evento_pagamento(
  p_provedor text,
  p_evento   jsonb
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_evento_id  text := coalesce(p_evento ->> 'id', p_evento -> 'payment' ->> 'id');
  v_tipo       text := p_evento ->> 'event';
  v_cobranca   jsonb := p_evento -> 'payment';
  v_empresa    uuid;
  v_assinatura public.assinaturas;
  v_centavos   int;
  v_status     text;
  v_metodo     text;
  v_vencimento date;
  v_pago_em    timestamptz;
begin
  if v_evento_id is null or v_cobranca is null then
    return 'sem_dados';
  end if;

  -- 1. registra o aviso. Se já tiver chegado antes, para por aqui.
  begin
    insert into public.eventos_pagamento (provedor, provedor_evento_id, tipo, corpo)
    values (p_provedor, v_evento_id, v_tipo, p_evento);
  exception when unique_violation then
    return 'repetido';
  end;

  -- 2. descobre de qual empresa é
  v_empresa := nullif(v_cobranca ->> 'externalReference', '')::uuid;

  if v_empresa is null then
    select a.empresa_id into v_empresa
      from public.assinaturas a
     where a.provedor = p_provedor
       and (a.provedor_assinatura_id = v_cobranca ->> 'subscription'
            or a.provedor_cliente_id = v_cobranca ->> 'customer');
  end if;

  if v_empresa is null then
    update public.eventos_pagamento set processado_em = now()
     where provedor = p_provedor and provedor_evento_id = v_evento_id;
    return 'empresa_desconhecida';
  end if;

  select * into v_assinatura from public.assinaturas a where a.empresa_id = v_empresa;

  -- 3. traduz o recado da empresa de pagamentos
  v_centavos   := round((v_cobranca ->> 'value')::numeric * 100);
  v_vencimento := nullif(v_cobranca ->> 'dueDate', '')::date;
  v_pago_em    := nullif(v_cobranca ->> 'paymentDate', '')::timestamptz;

  v_metodo := case upper(coalesce(v_cobranca ->> 'billingType', ''))
                when 'PIX' then 'pix'
                when 'BOLETO' then 'boleto'
                when 'CREDIT_CARD' then 'cartao'
                else null end;

  v_status := case v_tipo
                when 'PAYMENT_CONFIRMED' then 'pago'
                when 'PAYMENT_RECEIVED'  then 'pago'
                when 'PAYMENT_CREATED'   then 'pendente'
                when 'PAYMENT_UPDATED'   then 'pendente'
                when 'PAYMENT_OVERDUE'   then 'pendente'
                when 'PAYMENT_REFUNDED'  then 'estornado'
                when 'PAYMENT_DELETED'   then 'falhou'
                when 'PAYMENT_CHARGEBACK_REQUESTED' then 'estornado'
                else null end;

  if v_status is null then
    update public.eventos_pagamento set processado_em = now()
     where provedor = p_provedor and provedor_evento_id = v_evento_id;
    return 'evento_ignorado';
  end if;

  -- 4. guarda a cobrança
  insert into public.pagamentos (
    empresa_id, assinatura_id, valor_centavos, status, metodo, vencimento, pago_em,
    provedor, provedor_cobranca_id
  ) values (
    v_empresa, v_assinatura.id, v_centavos, v_status, v_metodo, v_vencimento,
    case when v_status = 'pago' then coalesce(v_pago_em, now()) else null end,
    p_provedor, v_cobranca ->> 'id'
  )
  on conflict (provedor_cobranca_id) do update
    set status = excluded.status,
        valor_centavos = excluded.valor_centavos,
        metodo = coalesce(excluded.metodo, public.pagamentos.metodo),
        vencimento = coalesce(excluded.vencimento, public.pagamentos.vencimento),
        pago_em = coalesce(excluded.pago_em, public.pagamentos.pago_em);

  -- 5. atualiza a assinatura
  if v_status = 'pago' then
    update public.assinaturas
       set status = 'ativa',
           plano_id = coalesce(plano_id, app.plano_do_valor(v_centavos), 'essencial'),
           proxima_cobranca = coalesce(v_vencimento, current_date) + interval '1 month',
           provedor = p_provedor,
           provedor_assinatura_id = coalesce(v_cobranca ->> 'subscription', provedor_assinatura_id),
           provedor_cliente_id = coalesce(v_cobranca ->> 'customer', provedor_cliente_id),
           atualizada_em = now()
     where empresa_id = v_empresa;

  elsif v_tipo = 'PAYMENT_OVERDUE' then
    update public.assinaturas
       set status = 'atrasada', atualizada_em = now()
     where empresa_id = v_empresa and status <> 'cancelada';

  elsif v_status = 'estornado' then
    update public.assinaturas
       set status = 'cancelada', cancelada_em = now(), atualizada_em = now()
     where empresa_id = v_empresa;
  end if;

  update public.eventos_pagamento set processado_em = now()
   where provedor = p_provedor and provedor_evento_id = v_evento_id;

  return 'ok';
end;
$$;

-- Só o servidor (chave de serviço) chama isto. Nem a empresa, nem o motorista.
revoke execute on function public.processar_evento_pagamento(text, jsonb) from public, anon, authenticated;

-- Guarda de qual empresa é a assinatura em criação, antes do primeiro pagamento.
create or replace function public.escolher_plano(p_plano text)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_empresa uuid := app.empresa_id();
begin
  if v_empresa is null or app.papel() <> 'dono' then
    raise exception 'Só o dono da empresa pode escolher o plano.';
  end if;
  if not exists (select 1 from public.planos p where p.id = p_plano and p.ativo) then
    raise exception 'Plano não encontrado.';
  end if;

  update public.assinaturas
     set plano_id = p_plano, atualizada_em = now()
   where empresa_id = v_empresa;
end;
$$;

grant execute on function public.escolher_plano(text) to authenticated;

-- Resumo do dinheiro do mês, para o painel do dono do sistema.
drop view if exists public.painel_resumo;
create view public.painel_resumo
with (security_invoker = true) as
select
  (select count(*) from public.empresas) as empresas,
  (select count(*) from public.assinaturas where status = 'ativa') as assinantes,
  (select count(*) from public.assinaturas a join public.empresas e on e.id = a.empresa_id
    where a.status = 'teste' and e.teste_termina_em > now()) as em_teste,
  (select count(*) from public.assinaturas where status = 'atrasada') as atrasados,
  coalesce((select sum(p.valor_centavos) from public.pagamentos p
             where p.status = 'pago' and p.pago_em >= date_trunc('month', now())), 0) as recebido_mes_centavos,
  coalesce((select sum(pl.preco_centavos) from public.assinaturas a
             join public.planos pl on pl.id = a.plano_id where a.status = 'ativa'), 0) as recorrente_centavos;

grant select on public.painel_resumo to authenticated;


-- ---------------------------------------------------------------------
-- 0008_visoes_do_app.sql
-- ---------------------------------------------------------------------

-- Visões que o aplicativo lê direto, para cada tela fazer uma consulta só.
-- Como usam "security_invoker", as regras de quem vê o quê continuam valendo:
-- para o motorista, a parte do valor do cliente simplesmente volta vazia.

drop view if exists public.servicos_completos;
create view public.servicos_completos
with (security_invoker = true) as
select
  s.id,
  s.empresa_id,
  s.data,
  s.hora,
  s.tipo,
  s.passageiro,
  s.pax,
  s.origem,
  s.destino,
  s.voo,
  s.status,
  s.motorista_id,
  m.nome      as motorista,
  m.veiculo   as veiculo,
  m.lugares   as lugares,
  m.percentual as percentual,
  s.indicador_id,
  i.nome      as indicador,
  s.valor_motorista_centavos,
  v.valor_centavos,
  v.comissao_indicador_centavos
from public.servicos s
left join public.motoristas m     on m.id = s.motorista_id
left join public.indicadores i    on i.id = s.indicador_id
left join public.servico_valores v on v.servico_id = s.id;

grant select on public.servicos_completos to authenticated;


-- ---------------------------------------------------------------------
-- 0009_ajustes_do_painel.sql
-- ---------------------------------------------------------------------

-- O painel mostra o nome do plano, não o código interno.

-- Trocar a ordem das colunas exige recriar a visão, não só substituir.
drop view if exists public.painel_clientes;

create view public.painel_clientes
with (security_invoker = true) as
select
  e.id,
  e.nome,
  e.documento,
  e.telefone,
  e.cidade,
  e.criada_em,
  e.teste_termina_em,
  a.status,
  a.plano_id,
  pl.nome as plano,
  a.proxima_cobranca,
  (select count(*) from public.motoristas m where m.empresa_id = e.id) as motoristas,
  (select count(*) from public.servicos s where s.empresa_id = e.id) as servicos,
  coalesce((select sum(pg.valor_centavos) from public.pagamentos pg
             where pg.empresa_id = e.id and pg.status = 'pago'), 0) as pago_centavos
from public.empresas e
left join public.assinaturas a on a.empresa_id = e.id
left join public.planos pl on pl.id = a.plano_id;

grant select on public.painel_clientes to authenticated;


