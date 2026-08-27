-- A trava do plano. No Solo cabe um motorista; no Equipe, cinco; no Frota, sem
-- limite. O sexto motorista do plano Equipe não entra de jeito nenhum.

insert into auth.users (id, email) values
  ('d1111111-1111-1111-1111-111111111111', 'solo@transfer.com.br'),
  ('d2222222-2222-2222-2222-222222222222', 'equipe@transfer.com.br'),
  ('d3333333-3333-3333-3333-333333333333', 'frota@transfer.com.br')
on conflict do nothing;

\echo ''
\echo '— Plano Solo: o dono é o motorista'
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"d1111111-1111-1111-1111-111111111111"}';
  select public.criar_empresa('Jocemar Transfer', 'Jocemar', '5554999120031', null, 'Gramado', null, 'solo')
    as empresa_solo \gset

  select testes.confere((select modo from public.minha_assinatura) = 'solo',
                        'a empresa nasce no modo solo');
  select testes.confere((select limite_motoristas from public.minha_assinatura) = 1,
                        'com limite de um motorista');

  select public.eu_sou_o_motorista('Spin', 6) as eu \gset
  select testes.confere((select count(*) from public.motoristas) = 1,
                        'o próprio dono virou motorista');
  select testes.confere((select percentual from public.motoristas where id = :'eu') = 100,
                        'e fica com 100% do valor, porque o dinheiro é dele');

  select testes.confere_erro(
    'insert into public.motoristas (empresa_id, nome, telefone, veiculo, lugares, percentual)
     values (''' || :'empresa_solo' || ''', ''Anderson'', ''5554999845512'', ''Spin'', 6, 40)',
    'no plano Solo, um segundo motorista é barrado');

  -- chamar de novo não duplica
  select public.eu_sou_o_motorista();
  select testes.confere((select count(*) from public.motoristas) = 1,
                        'e o cadastro do dono não duplica se repetir');
commit;

\echo ''
\echo '— Plano Equipe: cinco cabem, o sexto não'
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"d2222222-2222-2222-2222-222222222222"}';
  select public.criar_empresa('Serra Transfer', 'Ana', null, null, null, null, 'equipe') as empresa_equipe \gset

  insert into public.motoristas (empresa_id, nome, telefone, veiculo, lugares, percentual)
  values (:'empresa_equipe', 'Jocemar', '1', 'Spin', 6, 40),
         (:'empresa_equipe', 'Anderson', '2', 'Spin', 6, 40),
         (:'empresa_equipe', 'Luciane', '3', 'Onix', 4, 35),
         (:'empresa_equipe', 'Vanderlei', '4', 'Sprinter', 15, 45),
         (:'empresa_equipe', 'Cleber', '5', 'Spin', 6, 40);

  select testes.confere((select count(*) from public.motoristas where empresa_id = :'empresa_equipe') = 5,
                        'cinco motoristas entram');

  select testes.confere_erro(
    'insert into public.motoristas (empresa_id, nome, telefone, veiculo, lugares, percentual)
     values (''' || :'empresa_equipe' || ''', ''Sexto'', ''6'', ''Spin'', 6, 40)',
    'o SEXTO motorista é impossível de cadastrar');

  select testes.confere((select count(*) from public.motoristas where empresa_id = :'empresa_equipe') = 5,
                        'e a empresa continua com cinco');
commit;

\echo ''
\echo '— Mudando para Frota, o sexto entra'
begin;
  set local role postgres;
  update public.assinaturas set plano_id = 'frota', status = 'ativa' where empresa_id = :'empresa_equipe';

  set local role authenticated;
  set local request.jwt.claims = '{"sub":"d2222222-2222-2222-2222-222222222222"}';
  select testes.confere((select modo from public.minha_assinatura) = 'equipe',
                        'no Frota o aplicativo continua sendo o de empresa');
  insert into public.motoristas (empresa_id, nome, telefone, veiculo, lugares, percentual)
  values (:'empresa_equipe', 'Sexto', '6', 'Spin', 6, 40);
  select testes.confere((select count(*) from public.motoristas where empresa_id = :'empresa_equipe') = 6,
                        'e o sexto entra sem problema');
rollback;

\echo ''
\echo '— A trava vale durante o teste grátis também'
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"d3333333-3333-3333-3333-333333333333"}';
  select public.criar_empresa('Teste Solo', 'Paulo', null, null, null, null, 'solo') as e3 \gset
  select testes.confere((select status from public.minha_assinatura) = 'teste', 'a empresa está no teste grátis');
  select testes.confere_erro(
    'insert into public.motoristas (empresa_id, nome, telefone, veiculo, lugares, percentual)
     values (''' || :'e3' || ''', ''A'', ''1'', ''Spin'', 6, 40),
            (''' || :'e3' || ''', ''B'', ''2'', ''Spin'', 6, 40)',
    'mesmo sem pagar, o limite do plano escolhido vale');
commit;

\echo ''
\echo 'PLANOS: TODOS OS TESTES PASSARAM'
