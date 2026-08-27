-- Agora que a empresa escolhe o plano já no cadastro, o pagamento passa a ser
-- a palavra final: se o valor pago é o de outro plano, é esse que vale — e o
-- valor anual também é reconhecido, junto com o ciclo.

-- A função mudava só o valor devolvido; agora devolve plano e ciclo, então
-- precisa ser derrubada antes de ser recriada.
drop function if exists app.plano_do_valor(int);

create or replace function app.plano_do_valor(p_centavos int)
returns table (plano text, ciclo text)
language sql stable security definer set search_path = '' as $$
  select p.id, 'mensal'::text from public.planos p
   where p.preco_centavos = p_centavos and p.ativo
  union all
  select p.id, 'anual'::text from public.planos p
   where p.preco_anual_centavos = p_centavos and p.ativo
  limit 1
$$;

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
  v_plano      text;
  v_ciclo      text;
begin
  if v_evento_id is null or v_cobranca is null then
    return 'sem_dados';
  end if;

  begin
    insert into public.eventos_pagamento (provedor, provedor_evento_id, tipo, corpo)
    values (p_provedor, v_evento_id, v_tipo, p_evento);
  exception when unique_violation then
    return 'repetido';
  end;

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

  if v_status = 'pago' then
    -- o que foi pago decide o plano e o ciclo
    select d.plano, d.ciclo into v_plano, v_ciclo from app.plano_do_valor(v_centavos) d;

    update public.assinaturas
       set status = 'ativa',
           plano_id = coalesce(v_plano, plano_id, 'equipe'),
           ciclo = coalesce(v_ciclo, ciclo),
           proxima_cobranca = coalesce(v_vencimento, current_date)
                              + case when coalesce(v_ciclo, ciclo) = 'anual'
                                     then interval '1 year' else interval '1 month' end,
           provedor = p_provedor,
           provedor_assinatura_id = coalesce(v_cobranca ->> 'subscription', provedor_assinatura_id),
           provedor_cliente_id = coalesce(v_cobranca ->> 'customer', provedor_cliente_id),
           atualizada_em = now()
     where empresa_id = v_empresa;

  elsif v_tipo = 'PAYMENT_OVERDUE' then
    update public.assinaturas set status = 'atrasada', atualizada_em = now()
     where empresa_id = v_empresa and status <> 'cancelada';

  elsif v_status = 'estornado' then
    update public.assinaturas set status = 'cancelada', cancelada_em = now(), atualizada_em = now()
     where empresa_id = v_empresa;
  end if;

  update public.eventos_pagamento set processado_em = now()
   where provedor = p_provedor and provedor_evento_id = v_evento_id;

  return 'ok';
end;
$$;

revoke execute on function public.processar_evento_pagamento(text, jsonb) from public, anon, authenticated;

create or replace function public.versao_do_banco() returns int
language sql stable security definer set search_path = '' as $$ select 19 $$;
