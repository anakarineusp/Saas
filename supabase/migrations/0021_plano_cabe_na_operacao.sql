-- O plano não pode ficar menor do que a operação já é.
--
-- Antes, o limite de motoristas só era conferido na hora de cadastrar um
-- motorista novo. Quem já tinha dois motoristas e depois trocava para o plano
-- Solo ficava num estado impossível: o aplicativo mostrava a tela de quem
-- dirige sozinho, e a lista tinha duas pessoas.
--
-- Agora a troca de plano confere a operação inteira, e a tela sabe dizer
-- quando uma empresa antiga ficou acima do limite.

/** Quantos motoristas a empresa tem hoje. */
create or replace function app.motoristas_da_empresa(p_empresa uuid)
returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.motoristas m where m.empresa_id = p_empresa
$$;

/** Verdadeiro quando os motoristas de hoje cabem no plano indicado. */
create or replace function app.cabe_no_plano(p_empresa uuid, p_plano text)
returns boolean
language sql stable security definer set search_path = '' as $$
  select case
    when (select p.limite_motoristas from public.planos p where p.id = p_plano) is null then true
    else app.motoristas_da_empresa(p_empresa)
         <= (select p.limite_motoristas from public.planos p where p.id = p_plano)
  end
$$;

/** A frase que explica por que a troca não pode acontecer. */
create or replace function app.recado_do_limite(p_empresa uuid, p_plano text)
returns text
language sql stable security definer set search_path = '' as $$
  select format(
    'Esta operação tem %s motorista%s cadastrado%s, e o plano %s é para %s. Exclua motoristas em Cadastros, ou escolha um plano maior.',
    app.motoristas_da_empresa(p_empresa),
    case when app.motoristas_da_empresa(p_empresa) = 1 then '' else 's' end,
    case when app.motoristas_da_empresa(p_empresa) = 1 then '' else 's' end,
    (select p.nome from public.planos p where p.id = p_plano),
    case when (select p.limite_motoristas from public.planos p where p.id = p_plano) = 1
         then 'quem dirige sozinho'
         else 'até ' || (select p.limite_motoristas from public.planos p where p.id = p_plano) || ' motoristas'
    end
  )
$$;

/**
 * Trava a troca de plano quando a operação não cabe no plano novo.
 *
 * Esta função é de propósito "security invoker": ela precisa enxergar quem
 * está mandando a mudança. O dinheiro que já entrou nunca é barrado — o aviso
 * de pagamento roda por dentro do sistema, como "postgres" ou "service_role",
 * e nesse caso a mudança passa e o aplicativo mostra o aviso de que a empresa
 * ficou acima do limite. Quem é barrado é a mudança feita a mão: no
 * aplicativo, ou no painel de administração.
 */
create or replace function app.confere_plano_da_assinatura()
returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.plano_id is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.plano_id is not distinct from old.plano_id then
    return new;
  end if;
  -- mudança vinda de dentro do sistema (pagamento, manutenção): passa direto
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if app.cabe_no_plano(new.empresa_id, new.plano_id) then
    return new;
  end if;

  raise exception '%', app.recado_do_limite(new.empresa_id, new.plano_id)
    using errcode = 'check_violation';
end;
$$;

drop trigger if exists plano_cabe_na_operacao on public.assinaturas;
create trigger plano_cabe_na_operacao before insert or update of plano_id on public.assinaturas
  for each row execute function app.confere_plano_da_assinatura();

-- A escolha do plano dentro do aplicativo confere na mesma hora, com a mesma
-- frase. (Ela roda como "postgres", então a trava de cima não a alcança.)
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
  if not app.cabe_no_plano(v_empresa, p_plano) then
    raise exception '%', app.recado_do_limite(v_empresa, p_plano)
      using errcode = 'check_violation';
  end if;

  update public.assinaturas
     set plano_id = p_plano, atualizada_em = now()
   where empresa_id = v_empresa;
end;
$$;

grant execute on function public.escolher_plano(text) to authenticated;

-- No plano Solo, o cadastro de motorista do próprio dono não pode ser excluído;
-- os outros, que sobraram de antes, podem — é assim que a empresa se acerta.
create or replace function app.confere_exclusao_de_motorista()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if app.modo_da_empresa(old.empresa_id) = 'solo'
     and old.perfil_id is not null
     and app.motoristas_da_empresa(old.empresa_id) = 1 then
    raise exception 'No plano Solo o motorista é você. Este cadastro não pode ser excluído.'
      using errcode = 'check_violation';
  end if;
  return old;
end;
$$;

drop trigger if exists motorista_do_solo on public.motoristas;
create trigger motorista_do_solo before delete on public.motoristas
  for each row execute function app.confere_exclusao_de_motorista();

-- A tela precisa saber quando a empresa está acima do limite, para pedir o
-- acerto em vez de fingir que está tudo certo.
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
  app.motoristas_da_empresa(e.id) as motoristas_cadastrados,
  (not app.cabe_no_plano(e.id, app.plano_da_empresa(e.id))) as acima_do_limite,
  (a.status = 'ativa' or (a.status in ('teste', 'atrasada') and e.teste_termina_em > now())) as pode_usar
from public.assinaturas a
join public.empresas e on e.id = a.empresa_id
left join public.planos p on p.id = a.plano_id;

grant select on public.minha_assinatura to authenticated;

create or replace function public.versao_do_banco() returns int
language sql stable security definer set search_path = '' as $$ select 21 $$;
