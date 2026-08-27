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

-- (o formato desta função mudou numa migração posterior; por isso ela é
-- derrubada antes de ser recriada, para o arquivo poder rodar mais de uma vez)
drop function if exists public.servico_do_link(text);

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
-- (o formato mudou depois; derrubada antes para o arquivo poder rodar de novo)
drop function if exists app.plano_do_valor(int);
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


-- ---------------------------------------------------------------------
-- 0010_anual_e_indicacao.sql
-- ---------------------------------------------------------------------

-- Plano anual, programa de indicação e os ajustes que a administração liga e
-- desliga sem precisar de programador.

-- ------------------------------------------------------------ plano anual

alter table public.planos add column if not exists preco_anual_centavos int;

-- No anual, paga 10 meses e leva 12. Conta redonda, fácil de explicar na venda.
update public.planos
   set preco_anual_centavos = preco_centavos * 10
 where preco_anual_centavos is null;

alter table public.assinaturas add column if not exists ciclo text not null default 'mensal';

do $$ begin
  alter table public.assinaturas add constraint assinaturas_ciclo
    check (ciclo in ('mensal', 'anual'));
exception when duplicate_object then null;
end $$;

-- --------------------------------------------------------- indicação

alter table public.empresas add column if not exists codigo_indicacao text;
alter table public.empresas add column if not exists indicada_por uuid references public.empresas(id);
alter table public.empresas add column if not exists meses_de_credito int not null default 0;

create unique index if not exists empresas_codigo_indicacao on public.empresas (codigo_indicacao)
  where codigo_indicacao is not null;

/** Código curto, fácil de ditar no telefone. Sem letras que se confundem. */
create or replace function app.novo_codigo_de_indicacao()
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_letras text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_codigo text;
  v_tentativa int := 0;
begin
  loop
    v_codigo := '';
    for _ in 1..6 loop
      v_codigo := v_codigo || substr(v_letras, 1 + floor(random() * length(v_letras))::int, 1);
    end loop;
    exit when not exists (select 1 from public.empresas e where e.codigo_indicacao = v_codigo);
    v_tentativa := v_tentativa + 1;
    if v_tentativa > 40 then
      v_codigo := v_codigo || floor(random() * 90 + 10)::text;
      exit;
    end if;
  end loop;
  return v_codigo;
end;
$$;

update public.empresas set codigo_indicacao = app.novo_codigo_de_indicacao()
 where codigo_indicacao is null;

create table if not exists public.indicacoes (
  id                uuid primary key default gen_random_uuid(),
  empresa_origem    uuid not null references public.empresas(id) on delete cascade,
  empresa_indicada  uuid not null unique references public.empresas(id) on delete cascade,
  status            text not null default 'pendente' check (status in ('pendente', 'confirmada', 'cancelada')),
  meses_premio      int not null default 1,
  criada_em         timestamptz not null default now(),
  confirmada_em     timestamptz
);

create index if not exists indicacoes_origem_idx on public.indicacoes (empresa_origem);

alter table public.indicacoes enable row level security;

drop policy if exists indicacoes_ver on public.indicacoes;
create policy indicacoes_ver on public.indicacoes for select using (
  empresa_origem = app.empresa_id() or empresa_indicada = app.empresa_id() or app.eh_admin()
);

-- ------------------------------------------------- ajustes da administração

create table if not exists public.configuracoes (
  chave       text primary key,
  valor       jsonb not null,
  descricao   text,
  atualizada_em timestamptz not null default now()
);

alter table public.configuracoes enable row level security;

-- A tela de cadastro precisa saber, antes do login, se vai pedir cartão.
drop policy if exists configuracoes_ver on public.configuracoes;
create policy configuracoes_ver on public.configuracoes for select using (true);

drop policy if exists configuracoes_admin on public.configuracoes;
create policy configuracoes_admin on public.configuracoes for all
  using (app.eh_admin()) with check (app.eh_admin());

insert into public.configuracoes (chave, valor, descricao) values
  ('exigir_cartao_no_teste', 'false'::jsonb,
   'Pedir cartão para começar o teste de 7 dias. Ligado costuma trazer menos cadastros, porém mais qualificados.'),
  ('meses_de_premio_por_indicacao', '1'::jsonb,
   'Quantos meses grátis cada lado ganha quando uma indicação vira cliente pagante.'),
  ('meses_gratis_no_anual', '2'::jsonb,
   'Quantos meses saem de graça no plano anual. Serve só para o texto da vitrine.')
on conflict (chave) do nothing;

grant select on public.configuracoes, public.indicacoes to anon, authenticated;
grant insert, update, delete on public.planos, public.configuracoes to authenticated;

/** Lê um ajuste com um valor de reserva, para a tela nunca ficar sem resposta. */
create or replace function public.ajuste(p_chave text)
returns jsonb
language sql stable security definer set search_path = '' as $$
  select c.valor from public.configuracoes c where c.chave = p_chave
$$;

grant execute on function public.ajuste(text) to anon, authenticated;


-- ------------------------------------- cadastro com código de quem indicou

drop function if exists public.criar_empresa(text, text, text, text, text);

create or replace function public.criar_empresa(
  p_empresa    text,
  p_seu_nome   text,
  p_telefone   text default null,
  p_documento  text default null,
  p_cidade     text default null,
  p_indicacao  text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_usuario uuid := auth.uid();
  v_empresa uuid;
  v_origem  uuid;
  v_premio  int;
begin
  if v_usuario is null then
    raise exception 'Faça login antes de cadastrar a empresa.';
  end if;
  if exists (select 1 from public.perfis p where p.id = v_usuario) then
    raise exception 'Esta conta já está ligada a uma empresa.';
  end if;

  -- quem indicou, se veio código
  if p_indicacao is not null and length(trim(p_indicacao)) > 0 then
    select e.id into v_origem
      from public.empresas e
     where e.codigo_indicacao = upper(trim(p_indicacao));
  end if;

  insert into public.empresas (nome, documento, telefone, cidade, codigo_indicacao, indicada_por)
  values (p_empresa, p_documento, p_telefone, p_cidade, app.novo_codigo_de_indicacao(), v_origem)
  returning id into v_empresa;

  insert into public.perfis (id, nome, telefone, papel, empresa_id)
  values (v_usuario, p_seu_nome, p_telefone, 'dono', v_empresa);

  insert into public.assinaturas (empresa_id, status) values (v_empresa, 'teste');

  if v_origem is not null then
    v_premio := coalesce((select (c.valor)::text::int from public.configuracoes c
                           where c.chave = 'meses_de_premio_por_indicacao'), 1);
    insert into public.indicacoes (empresa_origem, empresa_indicada, meses_premio)
    values (v_origem, v_empresa, v_premio);
  end if;

  return v_empresa;
end;
$$;

grant execute on function public.criar_empresa(text, text, text, text, text, text) to authenticated;

/** Confere se um código de indicação existe, para a tela de cadastro avisar na hora. */
create or replace function public.conferir_indicacao(p_codigo text)
returns text
language sql stable security definer set search_path = '' as $$
  select e.nome from public.empresas e where e.codigo_indicacao = upper(trim(p_codigo))
$$;

grant execute on function public.conferir_indicacao(text) to anon, authenticated;

-- ------------------------- a indicação vira prêmio quando o indicado paga

create or replace function app.premiar_indicacao()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_indicacao public.indicacoes;
begin
  if new.status <> 'pago' then
    return new;
  end if;

  select * into v_indicacao from public.indicacoes i
   where i.empresa_indicada = new.empresa_id and i.status = 'pendente';

  if not found then
    return new;
  end if;

  update public.indicacoes set status = 'confirmada', confirmada_em = now()
   where id = v_indicacao.id;

  -- os dois lados ganham: quem indicou e quem foi indicado
  update public.empresas
     set meses_de_credito = meses_de_credito + v_indicacao.meses_premio
   where id in (v_indicacao.empresa_origem, v_indicacao.empresa_indicada);

  return new;
end;
$$;

drop trigger if exists premiar_indicacao on public.pagamentos;
create trigger premiar_indicacao after insert or update of status on public.pagamentos
  for each row execute function app.premiar_indicacao();

-- ------------------------------------------------- a assinatura vista pela empresa

drop view if exists public.minha_assinatura;
create view public.minha_assinatura
with (security_invoker = true) as
select
  a.empresa_id,
  e.nome as empresa,
  a.status,
  a.ciclo,
  a.plano_id,
  p.nome as plano,
  case when a.ciclo = 'anual' then p.preco_anual_centavos else p.preco_centavos end as preco_centavos,
  a.proxima_cobranca,
  e.teste_termina_em,
  e.codigo_indicacao,
  e.meses_de_credito,
  greatest(0, ceil(extract(epoch from (e.teste_termina_em - now())) / 86400))::int as dias_de_teste,
  (select count(*) from public.indicacoes i where i.empresa_origem = e.id) as indicacoes_feitas,
  (select count(*) from public.indicacoes i where i.empresa_origem = e.id and i.status = 'confirmada')
    as indicacoes_confirmadas,
  (a.status = 'ativa' or (a.status in ('teste', 'atrasada') and e.teste_termina_em > now())) as pode_usar
from public.assinaturas a
join public.empresas e on e.id = a.empresa_id
left join public.planos p on p.id = a.plano_id;

grant select on public.minha_assinatura to authenticated;


-- ---------------------------------------------------------------------
-- 0011_concluir_servico.sql
-- ---------------------------------------------------------------------

-- Fechar o serviço depois de rodado. É o que separa "o que está marcado" de
-- "o que já aconteceu" na hora de acertar o mês.

create or replace function public.concluir_servico(p_servico_id uuid, p_concluido boolean default true)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_empresa uuid := app.empresa_id();
begin
  if v_empresa is null or app.papel() <> 'dono' then
    raise exception 'Só o dono da empresa pode concluir serviços.';
  end if;

  update public.servicos s
     set status = case
                    when p_concluido then 'concluido'
                    when s.motorista_id is null then 'sem_motorista'
                    else 'atribuido'
                  end
   where s.id = p_servico_id and s.empresa_id = v_empresa;

  if not found then
    raise exception 'Serviço não encontrado nesta empresa.';
  end if;
end;
$$;

grant execute on function public.concluir_servico(uuid, boolean) to authenticated;


-- ---------------------------------------------------------------------
-- 0012_recusar_e_cancelar.sql
-- ---------------------------------------------------------------------

-- O motorista pode dizer não, e o dono pode cancelar. Sem isso, a agenda
-- mente: fica tudo "atribuído" e ninguém sabe o que caiu.

alter table public.servicos drop constraint if exists servicos_status_check;
alter table public.servicos add constraint servicos_status_check
  check (status in ('sem_motorista', 'atribuido', 'confirmado', 'recusado', 'concluido', 'cancelado'));

alter table public.servicos add column if not exists motivo text;
alter table public.servicos add column if not exists respondido_em timestamptz;

-- ------------------------------------------------------ o motorista recusa

/** Recusa pelo link do WhatsApp, sem login. O serviço volta para a fila. */
create or replace function public.recusar_pelo_link(p_token text, p_motivo text default null)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_servico uuid;
begin
  select c.servico_id into v_servico
    from public.confirmacoes c where c.token = p_token and c.expira_em > now();

  if v_servico is null then
    raise exception 'Link inválido ou vencido.';
  end if;

  update public.servicos
     set status = 'recusado',
         motivo = nullif(trim(coalesce(p_motivo, '')), ''),
         respondido_em = now()
   where id = v_servico and status in ('atribuido', 'confirmado');

  return true;
end;
$$;

/** Recusa por dentro da área do motorista, com conta. */
create or replace function public.recusar_servico(p_servico_id uuid, p_motivo text default null)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.servicos s
     set status = 'recusado',
         motivo = nullif(trim(coalesce(p_motivo, '')), ''),
         respondido_em = now()
   where s.id = p_servico_id
     and s.motorista_id in (select app.meus_motoristas())
     and s.status in ('atribuido', 'confirmado');

  if not found then
    raise exception 'Este serviço não é seu, ou já foi respondido.';
  end if;
end;
$$;

-- --------------------------------------------------------- o dono cancela

create or replace function public.cancelar_servico(p_servico_id uuid, p_motivo text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_empresa uuid := app.empresa_id();
begin
  if v_empresa is null or app.papel() <> 'dono' then
    raise exception 'Só o dono da empresa pode cancelar serviços.';
  end if;

  update public.servicos
     set status = 'cancelado',
         motivo = nullif(trim(coalesce(p_motivo, '')), '')
   where id = p_servico_id and empresa_id = v_empresa;

  if not found then
    raise exception 'Serviço não encontrado nesta empresa.';
  end if;

  -- os links já enviados param de valer
  update public.confirmacoes set expira_em = now() where servico_id = p_servico_id;
end;
$$;

/** Volta um serviço recusado ou cancelado para a fila, sem motorista. */
create or replace function public.reabrir_servico(p_servico_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_empresa uuid := app.empresa_id();
begin
  if v_empresa is null or app.papel() <> 'dono' then
    raise exception 'Só o dono da empresa pode reabrir serviços.';
  end if;

  update public.servicos
     set status = 'sem_motorista',
         motorista_id = null,
         valor_motorista_centavos = 0,
         motivo = null,
         respondido_em = null
   where id = p_servico_id and empresa_id = v_empresa;

  if not found then
    raise exception 'Serviço não encontrado nesta empresa.';
  end if;
end;
$$;

grant execute on function public.recusar_pelo_link(text, text) to anon, authenticated;
grant execute on function public.recusar_servico(uuid, text) to authenticated;
grant execute on function public.cancelar_servico(uuid, text) to authenticated;
grant execute on function public.reabrir_servico(uuid) to authenticated;

-- o link do motorista passa a dizer também se ele já respondeu, e o que respondeu
drop function if exists public.servico_do_link(text);
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
  status                   text,
  confirmado               boolean,
  recusado                 boolean
)
language sql stable security definer set search_path = '' as $$
  select s.id, s.data, s.hora, s.tipo, s.passageiro, s.pax, s.origem, s.destino, s.voo,
         m.nome, e.nome, s.valor_motorista_centavos, s.status,
         (s.status in ('confirmado', 'concluido')),
         (s.status = 'recusado')
    from public.confirmacoes c
    join public.servicos s   on s.id = c.servico_id
    join public.motoristas m on m.id = c.motorista_id
    join public.empresas e   on e.id = s.empresa_id
   where c.token = p_token and c.expira_em > now();
$$;

grant execute on function public.servico_do_link(text) to anon, authenticated;

-- serviço cancelado não entra na conta do mês
drop view if exists public.servicos_completos;
create view public.servicos_completos
with (security_invoker = true) as
select
  s.id, s.empresa_id, s.data, s.hora, s.tipo, s.passageiro, s.pax, s.origem, s.destino, s.voo,
  s.status, s.motivo, s.respondido_em,
  s.motorista_id, m.nome as motorista, m.veiculo, m.lugares, m.percentual,
  s.indicador_id, i.nome as indicador,
  s.valor_motorista_centavos,
  v.valor_centavos, v.comissao_indicador_centavos
from public.servicos s
left join public.motoristas m      on m.id = s.motorista_id
left join public.indicadores i     on i.id = s.indicador_id
left join public.servico_valores v on v.servico_id = s.id;

grant select on public.servicos_completos to authenticated;


-- ---------------------------------------------------------------------
-- 0013_avaliacoes_e_rotas.sql
-- ---------------------------------------------------------------------

-- Avaliação do passageiro, reputação do motorista, link de acompanhamento
-- para o hotel e tabela de preços por rota.

-- ------------------------------------------------------------- avaliações

create table if not exists public.avaliacoes (
  id           uuid primary key default gen_random_uuid(),
  token        text not null unique default encode(gen_random_bytes(18), 'hex'),
  servico_id   uuid not null references public.servicos(id) on delete cascade,
  empresa_id   uuid not null references public.empresas(id) on delete cascade,
  motorista_id uuid references public.motoristas(id) on delete set null,
  nota         int check (nota between 1 and 5),
  pontualidade int check (pontualidade between 1 and 5),
  veiculo      int check (veiculo between 1 and 5),
  comentario   text,
  criada_em    timestamptz not null default now(),
  respondida_em timestamptz,
  unique (servico_id)
);

create index if not exists avaliacoes_motorista_idx on public.avaliacoes (motorista_id) where nota is not null;
create index if not exists avaliacoes_empresa_idx on public.avaliacoes (empresa_id);

alter table public.avaliacoes enable row level security;

drop policy if exists avaliacoes_ver on public.avaliacoes;
create policy avaliacoes_ver on public.avaliacoes for select using (
  empresa_id = app.empresa_id()
  or app.eh_admin()
  or motorista_id in (select app.meus_motoristas())
);

/** Cria (ou reaproveita) o link de avaliação de um serviço. */
create or replace function public.link_de_avaliacao(p_servico_id uuid)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_empresa   uuid := app.empresa_id();
  v_motorista uuid;
  v_token     text;
begin
  select s.motorista_id into v_motorista
    from public.servicos s where s.id = p_servico_id and s.empresa_id = v_empresa;

  if not found then
    raise exception 'Serviço não encontrado nesta empresa.';
  end if;

  select a.token into v_token from public.avaliacoes a where a.servico_id = p_servico_id;

  if v_token is null then
    insert into public.avaliacoes (servico_id, empresa_id, motorista_id)
    values (p_servico_id, v_empresa, v_motorista)
    returning token into v_token;
  end if;

  return v_token;
end;
$$;

/** O que o passageiro vê ao abrir o link. Sem valor nenhum. */
create or replace function public.avaliacao_do_link(p_token text)
returns table (
  ja_respondeu boolean,
  empresa      text,
  motorista    text,
  veiculo      text,
  data         date,
  hora         time,
  passageiro   text,
  origem       text,
  destino      text
)
language sql stable security definer set search_path = '' as $$
  select (a.respondida_em is not null), e.nome, m.nome, m.veiculo,
         s.data, s.hora, s.passageiro, s.origem, s.destino
    from public.avaliacoes a
    join public.servicos s  on s.id = a.servico_id
    join public.empresas e  on e.id = a.empresa_id
    left join public.motoristas m on m.id = a.motorista_id
   where a.token = p_token;
$$;

/** O passageiro responde, sem login. Só uma vez por serviço. */
create or replace function public.avaliar(
  p_token        text,
  p_nota         int,
  p_pontualidade int default null,
  p_veiculo      int default null,
  p_comentario   text default null
) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if p_nota is null or p_nota < 1 or p_nota > 5 then
    raise exception 'Dê uma nota de 1 a 5.';
  end if;

  update public.avaliacoes
     set nota = p_nota,
         pontualidade = p_pontualidade,
         veiculo = p_veiculo,
         comentario = nullif(trim(coalesce(p_comentario, '')), ''),
         respondida_em = now()
   where token = p_token and respondida_em is null;

  if not found then
    raise exception 'Este link já foi respondido ou não existe.';
  end if;

  return true;
end;
$$;

grant execute on function public.link_de_avaliacao(uuid) to authenticated;
grant execute on function public.avaliacao_do_link(text) to anon, authenticated;
grant execute on function public.avaliar(text, int, int, int, text) to anon, authenticated;
grant select on public.avaliacoes to authenticated;

-- ------------------------------------------------------------- reputação

create or replace view public.reputacao
with (security_invoker = true) as
select
  m.id as motorista_id,
  m.empresa_id,
  m.nome,
  m.veiculo,
  count(a.nota) as avaliacoes,
  round(avg(a.nota)::numeric, 2) as media,
  round(avg(a.pontualidade)::numeric, 2) as media_pontualidade,
  round(avg(a.veiculo)::numeric, 2) as media_veiculo,
  count(a.nota) filter (where a.nota >= 4) as elogios,
  count(a.nota) filter (where a.nota <= 2) as reclamacoes,
  (select count(*) from public.servicos s
    where s.motorista_id = m.id and s.status = 'concluido') as servicos_concluidos,
  (select count(*) from public.servicos s
    where s.motorista_id = m.id and s.status = 'recusado') as servicos_recusados
from public.motoristas m
left join public.avaliacoes a on a.motorista_id = m.id and a.nota is not null
group by m.id, m.empresa_id, m.nome, m.veiculo;

grant select on public.reputacao to authenticated;

-- ------------------------------------------- acompanhamento do passageiro

create table if not exists public.acompanhamentos (
  token      text primary key default encode(gen_random_bytes(18), 'hex'),
  servico_id uuid not null unique references public.servicos(id) on delete cascade,
  criado_em  timestamptz not null default now()
);

alter table public.acompanhamentos enable row level security;

drop policy if exists acompanhamentos_ver on public.acompanhamentos;
create policy acompanhamentos_ver on public.acompanhamentos for select
  using (app.eh_dono_de((select s.empresa_id from public.servicos s where s.id = servico_id)) or app.eh_admin());

create or replace function public.link_de_acompanhamento(p_servico_id uuid)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_empresa uuid := app.empresa_id();
  v_token   text;
begin
  if not exists (select 1 from public.servicos s where s.id = p_servico_id and s.empresa_id = v_empresa) then
    raise exception 'Serviço não encontrado nesta empresa.';
  end if;

  select token into v_token from public.acompanhamentos where servico_id = p_servico_id;
  if v_token is null then
    insert into public.acompanhamentos (servico_id) values (p_servico_id) returning token into v_token;
  end if;
  return v_token;
end;
$$;

/** O que o hotel e o passageiro veem. Nenhum valor, nem do cliente nem do motorista. */
create or replace function public.acompanhar(p_token text)
returns table (
  empresa            text,
  telefone_empresa   text,
  data               date,
  hora               time,
  tipo               text,
  passageiro         text,
  pax                int,
  origem             text,
  destino            text,
  voo                text,
  motorista          text,
  veiculo            text,
  status             text
)
language sql stable security definer set search_path = '' as $$
  select e.nome, e.telefone, s.data, s.hora, s.tipo, s.passageiro, s.pax,
         s.origem, s.destino, s.voo, m.nome, m.veiculo, s.status
    from public.acompanhamentos c
    join public.servicos s on s.id = c.servico_id
    join public.empresas e on e.id = s.empresa_id
    left join public.motoristas m on m.id = s.motorista_id
   where c.token = p_token;
$$;

grant execute on function public.link_de_acompanhamento(uuid) to authenticated;
grant execute on function public.acompanhar(text) to anon, authenticated;

-- ------------------------------------------------- tabela de preços por rota

create table if not exists public.rotas (
  id             uuid primary key default gen_random_uuid(),
  empresa_id     uuid not null references public.empresas(id) on delete cascade,
  nome           text not null,
  origem         text not null,
  destino        text not null,
  tipo           text check (tipo in ('transfer_in', 'transfer_out', 'passeio')),
  valor_centavos int not null check (valor_centavos >= 0),
  pax_ate        int,
  ativa          boolean not null default true,
  criada_em      timestamptz not null default now()
);

create index if not exists rotas_empresa_idx on public.rotas (empresa_id);

alter table public.rotas enable row level security;

drop policy if exists rotas_ver on public.rotas;
create policy rotas_ver on public.rotas for select
  using (empresa_id = app.empresa_id() or app.eh_admin());

drop policy if exists rotas_gravar on public.rotas;
create policy rotas_gravar on public.rotas for insert
  with check (app.eh_dono_de(empresa_id) or app.eh_admin());

drop policy if exists rotas_editar on public.rotas;
create policy rotas_editar on public.rotas for update
  using (app.eh_dono_de(empresa_id) or app.eh_admin())
  with check (app.eh_dono_de(empresa_id) or app.eh_admin());

drop policy if exists rotas_excluir on public.rotas;
create policy rotas_excluir on public.rotas for delete
  using (app.eh_dono_de(empresa_id) or app.eh_admin());

grant select, insert, update, delete on public.rotas to authenticated;


-- ---------------------------------------------------------------------
-- 0014_cupons_e_gestao.sql
-- ---------------------------------------------------------------------

-- Cupons para os primeiros clientes, gestão de clientes pela administração e
-- os números do negócio.

-- ---------------------------------------------------------------- cupons

create table if not exists public.cupons (
  codigo        text primary key,
  descricao     text,
  tipo          text not null check (tipo in ('percentual', 'meses_gratis', 'valor')),
  valor         int not null check (valor > 0),
  plano_id      text references public.planos(id),
  validade      date,
  usos_maximos  int,
  usos          int not null default 0,
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now()
);

create table if not exists public.cupom_usos (
  id         uuid primary key default gen_random_uuid(),
  codigo     text not null references public.cupons(codigo) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  usado_em   timestamptz not null default now(),
  unique (codigo, empresa_id)
);

alter table public.cupons enable row level security;
alter table public.cupom_usos enable row level security;

-- A tela de cadastro precisa conferir o cupom antes do login.
drop policy if exists cupons_ver on public.cupons;
create policy cupons_ver on public.cupons for select using (true);

drop policy if exists cupons_admin on public.cupons;
create policy cupons_admin on public.cupons for all
  using (app.eh_admin()) with check (app.eh_admin());

drop policy if exists cupom_usos_ver on public.cupom_usos;
create policy cupom_usos_ver on public.cupom_usos for select
  using (empresa_id = app.empresa_id() or app.eh_admin());

grant select on public.cupons, public.cupom_usos to anon, authenticated;
grant insert, update, delete on public.cupons to authenticated;

alter table public.empresas add column if not exists cupom text references public.cupons(codigo);

/** Confere um cupom e devolve o que ele dá, sem gastar o uso. */
create or replace function public.conferir_cupom(p_codigo text)
returns table (codigo text, descricao text, tipo text, valor int)
language sql stable security definer set search_path = '' as $$
  select c.codigo, c.descricao, c.tipo, c.valor
    from public.cupons c
   where c.codigo = upper(trim(p_codigo))
     and c.ativo
     and (c.validade is null or c.validade >= current_date)
     and (c.usos_maximos is null or c.usos < c.usos_maximos)
$$;

/** Aplica o cupom na empresa de quem está logado. */
create or replace function public.aplicar_cupom(p_codigo text)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_empresa uuid := app.empresa_id();
  v_cupom   public.cupons;
begin
  if v_empresa is null or app.papel() <> 'dono' then
    raise exception 'Só o dono da empresa pode usar cupom.';
  end if;

  select * into v_cupom from public.cupons c
   where c.codigo = upper(trim(p_codigo))
     and c.ativo
     and (c.validade is null or c.validade >= current_date)
     and (c.usos_maximos is null or c.usos < c.usos_maximos);

  if not found then
    raise exception 'Cupom inválido, vencido ou esgotado.';
  end if;

  if exists (select 1 from public.cupom_usos u where u.codigo = v_cupom.codigo and u.empresa_id = v_empresa) then
    raise exception 'Este cupom já foi usado por esta empresa.';
  end if;

  insert into public.cupom_usos (codigo, empresa_id) values (v_cupom.codigo, v_empresa);
  update public.cupons set usos = usos + 1 where codigo = v_cupom.codigo;
  update public.empresas set cupom = v_cupom.codigo where id = v_empresa;

  -- Meses grátis viram crédito e esticam o teste na hora.
  if v_cupom.tipo = 'meses_gratis' then
    update public.empresas
       set meses_de_credito = meses_de_credito + v_cupom.valor,
           teste_termina_em = greatest(teste_termina_em, now()) + (v_cupom.valor || ' months')::interval
     where id = v_empresa;
  end if;

  return v_cupom.tipo;
end;
$$;

grant execute on function public.conferir_cupom(text) to anon, authenticated;
grant execute on function public.aplicar_cupom(text) to authenticated;

-- ------------------------------------------- a administração cuida dos clientes

drop policy if exists empresas_admin on public.empresas;
create policy empresas_admin on public.empresas for all
  using (app.eh_admin()) with check (app.eh_admin());

drop policy if exists assinaturas_admin on public.assinaturas;
create policy assinaturas_admin on public.assinaturas for all
  using (app.eh_admin()) with check (app.eh_admin());

grant insert, update, delete on public.empresas, public.assinaturas to authenticated;

/** Estica o teste de um cliente. Serve para negociar sem mexer no banco. */
create or replace function public.esticar_teste(p_empresa uuid, p_dias int)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not app.eh_admin() then
    raise exception 'Só a administração pode esticar o teste.';
  end if;
  update public.empresas
     set teste_termina_em = greatest(teste_termina_em, now()) + (p_dias || ' days')::interval
   where id = p_empresa;
end;
$$;

grant execute on function public.esticar_teste(uuid, int) to authenticated;

-- ------------------------------------------------------ os números do negócio

create or replace view public.painel_indicadores
with (security_invoker = true) as
with base as (
  select
    (select count(*) from public.empresas) as empresas,
    (select count(*) from public.assinaturas where status = 'ativa') as assinantes,
    (select count(*) from public.assinaturas a join public.empresas e on e.id = a.empresa_id
      where a.status = 'teste' and e.teste_termina_em > now()) as em_teste,
    (select count(*) from public.assinaturas a join public.empresas e on e.id = a.empresa_id
      where a.status = 'teste' and e.teste_termina_em <= now()) as testes_vencidos,
    (select count(*) from public.assinaturas where status = 'atrasada') as atrasados,
    (select count(*) from public.assinaturas where status = 'cancelada') as cancelados,
    (select count(*) from public.empresas where criada_em >= date_trunc('month', now())) as novos_no_mes,
    (select count(*) from public.empresas
      where criada_em >= date_trunc('month', now()) - interval '1 month'
        and criada_em < date_trunc('month', now())) as novos_mes_passado,
    coalesce((select sum(pl.preco_centavos) from public.assinaturas a
               join public.planos pl on pl.id = a.plano_id
              where a.status = 'ativa' and a.ciclo = 'mensal'), 0)
    + coalesce((select sum(pl.preco_anual_centavos / 12) from public.assinaturas a
                 join public.planos pl on pl.id = a.plano_id
                where a.status = 'ativa' and a.ciclo = 'anual'), 0) as recorrente_centavos,
    coalesce((select sum(p.valor_centavos) from public.pagamentos p
              where p.status = 'pago' and p.pago_em >= date_trunc('month', now())), 0) as recebido_mes_centavos,
    coalesce((select sum(p.valor_centavos) from public.pagamentos p
              where p.status = 'pago'
                and p.pago_em >= date_trunc('month', now()) - interval '1 month'
                and p.pago_em < date_trunc('month', now())), 0) as recebido_mes_passado_centavos,
    coalesce((select sum(p.valor_centavos) from public.pagamentos p where p.status = 'pago'), 0)
      as recebido_total_centavos,
    coalesce((select sum(p.valor_centavos) from public.pagamentos p
              where p.status = 'pendente'), 0) as a_receber_centavos,
    (select count(*) from public.indicacoes where status = 'confirmada') as indicacoes_confirmadas,
    (select count(*) from public.servicos) as servicos_no_sistema,
    (select count(*) from public.motoristas) as motoristas_no_sistema
)
select
  base.*,
  case when base.assinantes > 0 then round(base.recorrente_centavos::numeric / base.assinantes) else 0 end
    as ticket_medio_centavos,
  case when (base.assinantes + base.cancelados) > 0
       then round(base.cancelados::numeric * 100 / (base.assinantes + base.cancelados), 1)
       else 0 end as cancelamento_porcento,
  case when (base.assinantes + base.em_teste + base.testes_vencidos) > 0
       then round(base.assinantes::numeric * 100 / (base.assinantes + base.em_teste + base.testes_vencidos), 1)
       else 0 end as conversao_porcento,
  base.recorrente_centavos * 12 as anual_projetado_centavos
from base;

grant select on public.painel_indicadores to authenticated;

/** Faturamento mês a mês, para o gráfico do painel. */
create or replace function public.receita_por_mes(p_meses int default 12)
returns table (mes text, recebido_centavos bigint, clientes bigint)
language sql stable security definer set search_path = '' as $$
  select
    to_char(m.mes, 'YYYY-MM') as mes,
    coalesce((select sum(p.valor_centavos) from public.pagamentos p
               where p.status = 'pago' and date_trunc('month', p.pago_em) = m.mes), 0)::bigint,
    (select count(*) from public.empresas e where date_trunc('month', e.criada_em) <= m.mes)::bigint
  from generate_series(
         date_trunc('month', now()) - ((p_meses - 1) || ' months')::interval,
         date_trunc('month', now()),
         interval '1 month'
       ) as m(mes)
  where app.eh_admin()
  order by m.mes
$$;

grant execute on function public.receita_por_mes(int) to authenticated;


-- ---------------------------------------------------------------------
-- 0015_lembretes.sql
-- ---------------------------------------------------------------------

-- Lembrete da véspera: o que está marcado para amanhã e ainda não foi
-- confirmado. É o que evita o transfer que fura.

create table if not exists public.lembretes (
  id         uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  data       date not null,
  pendentes  int not null,
  enviado_em timestamptz,
  criado_em  timestamptz not null default now(),
  unique (empresa_id, data)
);

alter table public.lembretes enable row level security;

drop policy if exists lembretes_ver on public.lembretes;
create policy lembretes_ver on public.lembretes for select
  using (empresa_id = app.empresa_id() or app.eh_admin());

grant select on public.lembretes to authenticated;

/** O que precisa de atenção amanhã, para a empresa de quem está logado. */
create or replace function public.pendencias_de_amanha()
returns table (
  servico_id       uuid,
  hora             time,
  passageiro       text,
  origem           text,
  destino          text,
  status           text,
  motorista_id     uuid,
  motorista        text,
  telefone         text
)
language sql stable security definer set search_path = '' as $$
  select s.id, s.hora, s.passageiro, s.origem, s.destino, s.status, s.motorista_id, m.nome, m.telefone
    from public.servicos s
    left join public.motoristas m on m.id = s.motorista_id
   where s.empresa_id = app.empresa_id()
     and s.data = current_date + 1
     and s.status in ('sem_motorista', 'atribuido', 'recusado')
   order by s.hora
$$;

grant execute on function public.pendencias_de_amanha() to authenticated;

/**
 * Varre todas as empresas e anota quantas pendências cada uma tem para amanhã.
 * Feito para ser chamado uma vez por dia por um agendamento do Supabase.
 * Devolve a lista para quem vai avisar (servidor de envio).
 */
create or replace function public.montar_lembretes()
returns table (empresa_id uuid, empresa text, telefone text, pendentes int)
language sql security definer set search_path = '' as $$
  with gravados as (
    insert into public.lembretes (empresa_id, data, pendentes)
    select s.empresa_id, current_date + 1, count(*)::int
      from public.servicos s
     where s.data = current_date + 1
       and s.status in ('sem_motorista', 'atribuido', 'recusado')
     group by s.empresa_id
    on conflict (empresa_id, data) do update set pendentes = excluded.pendentes
    returning lembretes.empresa_id as eid, lembretes.pendentes as quantos
  )
  select g.eid, e.nome, e.telefone, g.quantos
    from gravados g
    join public.empresas e on e.id = g.eid
$$;

-- Só o servidor (chave de serviço) roda a varredura.
revoke execute on function public.montar_lembretes() from public, anon, authenticated;


-- ---------------------------------------------------------------------
-- 0016_versao_do_banco.sql
-- ---------------------------------------------------------------------

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


-- ---------------------------------------------------------------------
-- 0017_planos_por_porte.sql
-- ---------------------------------------------------------------------

-- Os planos passam a ser por porte da operação, e o limite de motoristas vira
-- uma trava de verdade: no plano de até 5, o sexto motorista não entra.
--
--   solo   = o próprio dono dirige. Um motorista só: ele mesmo.
--   equipe = de 1 a 5 motoristas
--   frota  = acima de 5, sem limite

update public.planos set ativo = false where id in ('essencial', 'profissional');

insert into public.planos
  (id, nome, descricao, preco_centavos, preco_anual_centavos, limite_motoristas, limite_servicos_mes, ordem, ativo)
values
  ('solo', 'Solo', 'Para quem dirige o próprio carro e cuida da agenda sozinho.',
   4900, 49000, 1, null, 1, true),
  ('equipe', 'Equipe', 'Para a empresa com até 5 motoristas.',
   14900, 149000, 5, null, 2, true),
  ('frota', 'Frota', 'Para quem tem mais de 5 motoristas, sem limite.',
   29900, 299000, null, null, 3, true)
on conflict (id) do update
  set nome = excluded.nome,
      descricao = excluded.descricao,
      preco_centavos = excluded.preco_centavos,
      preco_anual_centavos = excluded.preco_anual_centavos,
      limite_motoristas = excluded.limite_motoristas,
      limite_servicos_mes = excluded.limite_servicos_mes,
      ordem = excluded.ordem,
      ativo = true;

-- quem estava nos planos antigos vai para o equivalente
update public.assinaturas set plano_id = 'equipe' where plano_id = 'essencial';
update public.assinaturas set plano_id = 'frota' where plano_id = 'profissional';

-- ------------------------------------------------- o porte de cada empresa

/**
 * O plano escolhido, mesmo durante o teste. É ele que decide quantos
 * motoristas cabem e qual aplicativo a pessoa vê.
 */
create or replace function app.plano_da_empresa(p_empresa uuid)
returns text
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select a.plano_id from public.assinaturas a
      where a.empresa_id = p_empresa and a.plano_id is not null),
    'equipe'
  )
$$;

/** 'solo' quando o dono é o próprio motorista; 'equipe' ou 'frota' nos demais. */
create or replace function app.modo_da_empresa(p_empresa uuid)
returns text
language sql stable security definer set search_path = '' as $$
  select case when app.plano_da_empresa(p_empresa) = 'solo' then 'solo' else 'equipe' end
$$;

-- O limite passa a valer também no teste, e a mensagem diz o que fazer.
create or replace function app.limite_de_motoristas(p_empresa uuid)
returns int
language sql stable security definer set search_path = '' as $$
  select p.limite_motoristas
    from public.planos p
   where p.id = app.plano_da_empresa(p_empresa)
$$;

create or replace function app.confere_limite_motoristas()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_limite  int := app.limite_de_motoristas(new.empresa_id);
  v_plano   text := app.plano_da_empresa(new.empresa_id);
  v_quantos int;
begin
  if v_limite is null then
    return new;
  end if;

  select count(*) into v_quantos from public.motoristas m where m.empresa_id = new.empresa_id;

  if v_quantos >= v_limite then
    if v_plano = 'solo' then
      raise exception 'O plano Solo é para quem dirige sozinho. Para cadastrar outro motorista, mude para o plano Equipe.'
        using errcode = 'check_violation';
    else
      raise exception 'O plano % permite % motoristas. Mude para o plano Frota para cadastrar mais.', v_plano, v_limite
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

-- --------------------------------------- no plano Solo, o dono é o motorista

/**
 * Cria o cadastro de motorista do próprio dono, para os serviços terem dono e
 * a conta fechar. Chamada pelo aplicativo quando a empresa é do plano Solo e
 * ainda não tem motorista nenhum.
 */
create or replace function public.eu_sou_o_motorista(p_veiculo text default 'Meu carro', p_lugares int default 4)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_empresa uuid := app.empresa_id();
  v_perfil  public.perfis;
  v_id      uuid;
begin
  if v_empresa is null or app.papel() <> 'dono' then
    raise exception 'Só o dono da empresa pode fazer isso.';
  end if;

  select * into v_perfil from public.perfis p where p.id = auth.uid();

  select m.id into v_id from public.motoristas m
   where m.empresa_id = v_empresa and m.perfil_id = auth.uid();

  if v_id is not null then
    return v_id;
  end if;

  -- No Solo o dinheiro é todo dele: percentual de 100.
  insert into public.motoristas (empresa_id, perfil_id, nome, telefone, veiculo, lugares, percentual)
  values (v_empresa, auth.uid(), v_perfil.nome, coalesce(v_perfil.telefone, ''), p_veiculo, p_lugares, 100)
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.eu_sou_o_motorista(text, int) to authenticated;

-- A empresa passa a saber o próprio porte, para o aplicativo mudar de cara.
drop view if exists public.minha_assinatura;
create view public.minha_assinatura
with (security_invoker = true) as
select
  a.empresa_id,
  e.nome as empresa,
  a.status,
  a.ciclo,
  a.plano_id,
  p.nome as plano,
  app.modo_da_empresa(e.id) as modo,
  p.limite_motoristas,
  case when a.ciclo = 'anual' then p.preco_anual_centavos else p.preco_centavos end as preco_centavos,
  a.proxima_cobranca,
  e.teste_termina_em,
  e.codigo_indicacao,
  e.meses_de_credito,
  greatest(0, ceil(extract(epoch from (e.teste_termina_em - now())) / 86400))::int as dias_de_teste,
  (select count(*) from public.indicacoes i where i.empresa_origem = e.id) as indicacoes_feitas,
  (select count(*) from public.indicacoes i where i.empresa_origem = e.id and i.status = 'confirmada')
    as indicacoes_confirmadas,
  (select count(*) from public.motoristas m where m.empresa_id = e.id) as motoristas_cadastrados,
  (a.status = 'ativa' or (a.status in ('teste', 'atrasada') and e.teste_termina_em > now())) as pode_usar
from public.assinaturas a
join public.empresas e on e.id = a.empresa_id
left join public.planos p on p.id = a.plano_id;

grant select on public.minha_assinatura to authenticated;

-- o cadastro passa a aceitar o plano escolhido na vitrine
drop function if exists public.criar_empresa(text, text, text, text, text, text);

create or replace function public.criar_empresa(
  p_empresa    text,
  p_seu_nome   text,
  p_telefone   text default null,
  p_documento  text default null,
  p_cidade     text default null,
  p_indicacao  text default null,
  p_plano      text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_usuario uuid := auth.uid();
  v_empresa uuid;
  v_origem  uuid;
  v_premio  int;
  v_plano   text;
begin
  if v_usuario is null then
    raise exception 'Faça login antes de cadastrar a empresa.';
  end if;
  if exists (select 1 from public.perfis p where p.id = v_usuario) then
    raise exception 'Esta conta já está ligada a uma empresa.';
  end if;

  select p.id into v_plano from public.planos p where p.id = p_plano and p.ativo;

  if p_indicacao is not null and length(trim(p_indicacao)) > 0 then
    select e.id into v_origem from public.empresas e
     where e.codigo_indicacao = upper(trim(p_indicacao));
  end if;

  insert into public.empresas (nome, documento, telefone, cidade, codigo_indicacao, indicada_por)
  values (p_empresa, p_documento, p_telefone, p_cidade, app.novo_codigo_de_indicacao(), v_origem)
  returning id into v_empresa;

  insert into public.perfis (id, nome, telefone, papel, empresa_id)
  values (v_usuario, p_seu_nome, p_telefone, 'dono', v_empresa);

  insert into public.assinaturas (empresa_id, status, plano_id)
  values (v_empresa, 'teste', coalesce(v_plano, 'equipe'));

  if v_origem is not null then
    v_premio := coalesce((select (c.valor)::text::int from public.configuracoes c
                           where c.chave = 'meses_de_premio_por_indicacao'), 1);
    insert into public.indicacoes (empresa_origem, empresa_indicada, meses_premio)
    values (v_origem, v_empresa, v_premio);
  end if;

  return v_empresa;
end;
$$;

grant execute on function public.criar_empresa(text, text, text, text, text, text, text) to authenticated;

create or replace function public.versao_do_banco() returns int
language sql stable security definer set search_path = '' as $$ select 17 $$;


-- ---------------------------------------------------------------------
-- 0018_vitrine_editavel.sql
-- ---------------------------------------------------------------------

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


-- ---------------------------------------------------------------------
-- 0019_plano_pelo_pagamento.sql
-- ---------------------------------------------------------------------

-- Agora que a empresa escolhe o plano já no cadastro, o pagamento passa a ser
-- a palavra final: se o valor pago é o de outro plano, é esse que vale — e o
-- valor anual também é reconhecido, junto com o ciclo.

-- A função mudava só o valor devolvido; agora devolve plano e ciclo, então
-- precisa ser derrubada antes de ser recriada.
drop function if exists app.plano_do_valor(int);

create or replace function app.plano_do_valor(p_centavos int)
returns table (plano text, ciclo text)
language sql stable security definer set search_path = '' as $$
  select p.id, 'mensal'::text from public.planos p
   where p.preco_centavos = p_centavos and p.ativo
  union all
  select p.id, 'anual'::text from public.planos p
   where p.preco_anual_centavos = p_centavos and p.ativo
  limit 1
$$;

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
  v_plano      text;
  v_ciclo      text;
begin
  if v_evento_id is null or v_cobranca is null then
    return 'sem_dados';
  end if;

  begin
    insert into public.eventos_pagamento (provedor, provedor_evento_id, tipo, corpo)
    values (p_provedor, v_evento_id, v_tipo, p_evento);
  exception when unique_violation then
    return 'repetido';
  end;

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

  if v_status = 'pago' then
    -- o que foi pago decide o plano e o ciclo
    select d.plano, d.ciclo into v_plano, v_ciclo from app.plano_do_valor(v_centavos) d;

    update public.assinaturas
       set status = 'ativa',
           plano_id = coalesce(v_plano, plano_id, 'equipe'),
           ciclo = coalesce(v_ciclo, ciclo),
           proxima_cobranca = coalesce(v_vencimento, current_date)
                              + case when coalesce(v_ciclo, ciclo) = 'anual'
                                     then interval '1 year' else interval '1 month' end,
           provedor = p_provedor,
           provedor_assinatura_id = coalesce(v_cobranca ->> 'subscription', provedor_assinatura_id),
           provedor_cliente_id = coalesce(v_cobranca ->> 'customer', provedor_cliente_id),
           atualizada_em = now()
     where empresa_id = v_empresa;

  elsif v_tipo = 'PAYMENT_OVERDUE' then
    update public.assinaturas set status = 'atrasada', atualizada_em = now()
     where empresa_id = v_empresa and status <> 'cancelada';

  elsif v_status = 'estornado' then
    update public.assinaturas set status = 'cancelada', cancelada_em = now(), atualizada_em = now()
     where empresa_id = v_empresa;
  end if;

  update public.eventos_pagamento set processado_em = now()
   where provedor = p_provedor and provedor_evento_id = v_evento_id;

  return 'ok';
end;
$$;

revoke execute on function public.processar_evento_pagamento(text, jsonb) from public, anon, authenticated;

create or replace function public.versao_do_banco() returns int
language sql stable security definer set search_path = '' as $$ select 19 $$;


