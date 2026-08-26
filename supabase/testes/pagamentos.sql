-- Prova que a cobrança funciona: aviso recebido vira pagamento registrado e
-- assinatura em dia, aviso repetido não cobra duas vezes, atraso e estorno
-- mudam o estado, e ninguém de fora consegue forjar um pagamento.

insert into auth.users (id, email) values
  ('44444444-4444-4444-4444-444444444444', 'carla@serragramado.com.br'),
  ('99999999-9999-9999-9999-999999999999', 'admin@sistema.com.br')
on conflict do nothing;

begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444"}';
  select public.criar_empresa('Serra Gramado Turismo', 'Carla Menegotto', '5554999000004') as empresa \gset
  select public.escolher_plano('profissional');
  select testes.confere((select plano_id from public.minha_assinatura) = 'profissional', 'a empresa escolheu o plano Profissional');
commit;

\echo ''
\echo '— A cobrança é criada (ainda não paga)'
begin;
  set local role postgres;
  select testes.confere(
    public.processar_evento_pagamento('asaas', jsonb_build_object(
      'id', 'evt_001', 'event', 'PAYMENT_CREATED',
      'payment', jsonb_build_object(
        'id', 'pay_001', 'customer', 'cus_001', 'subscription', 'sub_001',
        'value', 199.00, 'billingType', 'PIX', 'dueDate', to_char(current_date, 'YYYY-MM-DD'),
        'externalReference', :'empresa'
      ))) = 'ok', 'o aviso de cobrança criada foi aceito');

  select testes.confere((select status from public.pagamentos where provedor_cobranca_id = 'pay_001') = 'pendente',
                        'a cobrança ficou como pendente');
  select testes.confere((select status from public.assinaturas where empresa_id = :'empresa') = 'teste',
                        'enquanto não paga, a assinatura segue em teste');
commit;

\echo ''
\echo '— O cliente paga'
begin;
  set local role postgres;
  select testes.confere(
    public.processar_evento_pagamento('asaas', jsonb_build_object(
      'id', 'evt_002', 'event', 'PAYMENT_CONFIRMED',
      'payment', jsonb_build_object(
        'id', 'pay_001', 'customer', 'cus_001', 'subscription', 'sub_001',
        'value', 199.00, 'billingType', 'PIX',
        'dueDate', to_char(current_date, 'YYYY-MM-DD'),
        'paymentDate', to_char(current_date, 'YYYY-MM-DD'),
        'externalReference', :'empresa'
      ))) = 'ok', 'o aviso de pagamento foi aceito');

  select testes.confere((select status from public.pagamentos where provedor_cobranca_id = 'pay_001') = 'pago',
                        'a cobrança virou paga');
  select testes.confere((select valor_centavos from public.pagamentos where provedor_cobranca_id = 'pay_001') = 19900,
                        'o valor foi guardado certo: R$ 199,00');
  select testes.confere((select count(*) from public.pagamentos where provedor_cobranca_id = 'pay_001') = 1,
                        'a mesma cobrança não virou duas linhas');
  select testes.confere((select status from public.assinaturas where empresa_id = :'empresa') = 'ativa',
                        'a assinatura ficou ativa');
  select testes.confere((select proxima_cobranca from public.assinaturas where empresa_id = :'empresa')
                          = current_date + interval '1 month',
                        'a próxima cobrança ficou marcada para daqui a um mês');
commit;

\echo ''
\echo '— O mesmo aviso chega de novo (acontece o tempo todo)'
begin;
  set local role postgres;
  select testes.confere(
    public.processar_evento_pagamento('asaas', jsonb_build_object(
      'id', 'evt_002', 'event', 'PAYMENT_CONFIRMED',
      'payment', jsonb_build_object('id', 'pay_001', 'value', 199.00, 'externalReference', :'empresa')
    )) = 'repetido', 'o aviso repetido é reconhecido e ignorado');
  select testes.confere((select count(*) from public.pagamentos where empresa_id = :'empresa') = 1,
                        'continua havendo uma cobrança só');
commit;

\echo ''
\echo '— O mês seguinte atrasa'
begin;
  set local role postgres;
  select public.processar_evento_pagamento('asaas', jsonb_build_object(
    'id', 'evt_003', 'event', 'PAYMENT_OVERDUE',
    'payment', jsonb_build_object(
      'id', 'pay_002', 'value', 199.00, 'billingType', 'BOLETO',
      'dueDate', to_char(current_date - 5, 'YYYY-MM-DD'), 'externalReference', :'empresa')));

  select testes.confere((select status from public.assinaturas where empresa_id = :'empresa') = 'atrasada',
                        'a assinatura ficou como atrasada');
  select testes.confere((select status from public.pagamentos where provedor_cobranca_id = 'pay_002') = 'pendente',
                        'a cobrança atrasada continua pendente');
rollback;

\echo ''
\echo '— Um estorno'
begin;
  set local role postgres;
  select public.processar_evento_pagamento('asaas', jsonb_build_object(
    'id', 'evt_004', 'event', 'PAYMENT_REFUNDED',
    'payment', jsonb_build_object('id', 'pay_001', 'value', 199.00, 'externalReference', :'empresa')));

  select testes.confere((select status from public.assinaturas where empresa_id = :'empresa') = 'cancelada',
                        'o estorno cancela a assinatura');
  select testes.confere((select status from public.pagamentos where provedor_cobranca_id = 'pay_001') = 'estornado',
                        'a cobrança ficou como estornada');
rollback;

\echo ''
\echo '— Aviso de uma empresa que não existe aqui'
begin;
  set local role postgres;
  select testes.confere(
    public.processar_evento_pagamento('asaas', jsonb_build_object(
      'id', 'evt_005', 'event', 'PAYMENT_CONFIRMED',
      'payment', jsonb_build_object('id', 'pay_009', 'value', 50.00, 'customer', 'cus_desconhecido')
    )) = 'empresa_desconhecida', 'aviso sem empresa conhecida não vira pagamento');
  select testes.confere((select count(*) from public.pagamentos where provedor_cobranca_id = 'pay_009') = 0,
                        'e nenhuma cobrança foi criada por engano');
commit;

\echo ''
\echo '— Alguém logado tentando forjar um pagamento'
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444"}';
  select testes.confere_erro(
    'select public.processar_evento_pagamento(''asaas'', ''{}''::jsonb)',
    'nem o dono da empresa consegue registrar pagamento por conta própria');
  select testes.confere_erro(
    'update public.assinaturas set status = ''ativa''',
    'nem consegue deixar a própria assinatura ativa na marra');
  select testes.confere_erro(
    'insert into public.pagamentos (empresa_id, valor_centavos, status) values (''' || :'empresa' || ''', 1, ''pago'')',
    'nem consegue inventar um pagamento');
commit;

\echo ''
\echo '— O painel de quem vende o sistema'
begin;
  set local role postgres;
  insert into public.perfis (id, nome, papel) values
    ('99999999-9999-9999-9999-999999999999', 'Administração', 'admin') on conflict do nothing;

  set local role authenticated;
  set local request.jwt.claims = '{"sub":"99999999-9999-9999-9999-999999999999"}';
  select testes.confere((select assinantes from public.painel_resumo) = 1, 'o painel mostra 1 assinante pagante');
  select testes.confere((select recebido_mes_centavos from public.painel_resumo) = 19900,
                        'o painel mostra R$ 199,00 recebidos no mês');
  select testes.confere((select recorrente_centavos from public.painel_resumo) = 19900,
                        'o painel mostra a receita recorrente');
commit;

\echo ''
\echo 'PAGAMENTOS: TODOS OS TESTES PASSARAM'
