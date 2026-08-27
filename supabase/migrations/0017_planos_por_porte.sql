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
