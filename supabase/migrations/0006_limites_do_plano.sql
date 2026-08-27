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

