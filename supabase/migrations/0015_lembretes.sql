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
