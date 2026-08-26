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
