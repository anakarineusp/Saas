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
create or replace view public.painel_resumo
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
