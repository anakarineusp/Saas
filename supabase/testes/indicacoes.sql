-- Prova o programa de indicação e o plano anual: cada empresa ganha um código,
-- quem entra por indicação fica ligado a quem indicou, e o prêmio só cai quando
-- o indicado paga de verdade.

insert into auth.users (id, email) values
  ('a1111111-1111-1111-1111-111111111111', 'ana@serratransfer.com.br'),
  ('b2222222-2222-2222-2222-222222222222', 'bruno@valeturismo.com.br')
on conflict do nothing;

\echo ''
\echo '— Toda empresa nasce com um código para indicar'
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"a1111111-1111-1111-1111-111111111111"}';
  select public.criar_empresa('Serra Transfer', 'Ana Karine') as empresa_ana \gset
  select codigo_indicacao as codigo from public.minha_assinatura \gset
  select testes.confere(length(:'codigo') >= 6, 'a empresa ganhou um código de indicação: ' || :'codigo');
  select testes.confere((select indicacoes_feitas from public.minha_assinatura) = 0, 'ainda não indicou ninguém');
commit;

\echo ''
\echo '— Um código inventado não vale'
begin;
  set local role anon;
  select testes.confere(public.conferir_indicacao('XXXXXX') is null, 'código inventado não encontra empresa');
  select testes.confere(public.conferir_indicacao(:'codigo') = 'Serra Transfer',
                        'o código verdadeiro mostra o nome de quem indicou');
commit;

\echo ''
\echo '— Bruno se cadastra usando o código da Ana'
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"b2222222-2222-2222-2222-222222222222"}';
  select public.criar_empresa('Vale Turismo', 'Bruno Reis', null, null, null, :'codigo') as empresa_bruno \gset
commit;

begin;
  set local role postgres;
  select testes.confere(
    (select count(*) from public.indicacoes where empresa_origem = :'empresa_ana'
       and empresa_indicada = :'empresa_bruno' and status = 'pendente') = 1,
    'a indicação ficou registrada como pendente');
  select testes.confere((select meses_de_credito from public.empresas where id = :'empresa_ana') = 0,
                        'ninguém ganha prêmio só por cadastrar');
commit;

\echo ''
\echo '— O prêmio cai quando o indicado paga'
begin;
  set local role postgres;
  select public.processar_evento_pagamento('asaas', jsonb_build_object(
    'id', 'evt_ind_1', 'event', 'PAYMENT_CONFIRMED',
    'payment', jsonb_build_object('id', 'pay_ind_1', 'value', 199.00, 'billingType', 'PIX',
      'paymentDate', to_char(current_date, 'YYYY-MM-DD'), 'externalReference', :'empresa_bruno')));

  select testes.confere(
    (select status from public.indicacoes where empresa_indicada = :'empresa_bruno') = 'confirmada',
    'a indicação virou confirmada');
  select testes.confere((select meses_de_credito from public.empresas where id = :'empresa_ana') = 1,
                        'quem indicou ganhou 1 mês de crédito');
  select testes.confere((select meses_de_credito from public.empresas where id = :'empresa_bruno') = 1,
                        'quem foi indicado também ganhou 1 mês');
commit;

\echo ''
\echo '— O prêmio não cai duas vezes'
begin;
  set local role postgres;
  select public.processar_evento_pagamento('asaas', jsonb_build_object(
    'id', 'evt_ind_2', 'event', 'PAYMENT_CONFIRMED',
    'payment', jsonb_build_object('id', 'pay_ind_2', 'value', 199.00, 'billingType', 'PIX',
      'paymentDate', to_char(current_date, 'YYYY-MM-DD'), 'externalReference', :'empresa_bruno')));

  select testes.confere((select meses_de_credito from public.empresas where id = :'empresa_ana') = 1,
                        'o segundo pagamento não premia de novo');
commit;

\echo ''
\echo '— Plano anual'
begin;
  set local role postgres;
  select testes.confere(
    (select preco_anual_centavos from public.planos where id = 'equipe') = 149000,
    'o anual do Equipe é R$ 1.490,00 — dez meses no lugar de doze');

  update public.assinaturas set ciclo = 'anual', plano_id = 'equipe', status = 'ativa'
   where empresa_id = :'empresa_ana';

  set local role authenticated;
  set local request.jwt.claims = '{"sub":"a1111111-1111-1111-1111-111111111111"}';
  select testes.confere((select ciclo from public.minha_assinatura) = 'anual', 'a assinatura ficou como anual');
  select testes.confere((select preco_centavos from public.minha_assinatura) = 149000,
                        'e passa a mostrar o preço anual');
rollback;

\echo ''
\echo '— Os ajustes que a administração liga e desliga'
begin;
  set local role anon;
  select testes.confere(public.ajuste('exigir_cartao_no_teste') = 'false'::jsonb,
                        'o cadastro consegue perguntar se precisa de cartão, mesmo sem login');
commit;

\echo ''
\echo 'INDICAÇÕES: TODOS OS TESTES PASSARAM'
