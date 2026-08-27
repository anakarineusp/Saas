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
