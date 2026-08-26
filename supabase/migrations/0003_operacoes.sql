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
create or replace view public.minha_assinatura
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

create or replace view public.painel_clientes
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
