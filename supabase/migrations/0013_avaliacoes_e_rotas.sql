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
