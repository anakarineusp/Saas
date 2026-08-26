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
