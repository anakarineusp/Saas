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
\echo ''
\echo '— O plano não pode ficar menor do que a operação já é'
-- Era este o buraco: a empresa cadastrava os motoristas e depois trocava para
-- um plano menor. A tela ficava dizendo "plano Solo" com dois motoristas na
-- lista.
insert into auth.users (id, email) values
  ('99999999-9999-9999-9999-999999999999', 'admin@sistema.com.br')
on conflict do nothing;

begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"d2222222-2222-2222-2222-222222222222"}';

  select testes.confere((select motoristas_cadastrados from public.minha_assinatura) = 5,
                        'a empresa tem cinco motoristas');
  select testes.confere_erro('select public.escolher_plano(''solo'')',
                             'com cinco motoristas, o dono não consegue ir para o plano Solo');
  select testes.confere((select plano_id from public.minha_assinatura) = 'equipe',
                        'e o plano continua sendo o Equipe');
  select testes.confere((select acima_do_limite from public.minha_assinatura) = false,
                        'a empresa não está acima do limite');
commit;

begin;
  -- pelo painel de administração, mexendo direto na tabela, também é barrado
  set local role postgres;
  insert into public.perfis (id, nome, papel)
  values ('99999999-9999-9999-9999-999999999999', 'Administração', 'admin') on conflict do nothing;

  set local role authenticated;
  set local request.jwt.claims = '{"sub":"99999999-9999-9999-9999-999999999999"}';
  select testes.confere_erro(
    'update public.assinaturas set plano_id = ''solo'' where empresa_id = ''' || :'empresa_equipe' || '''',
    'nem a administração consegue jogar essa empresa no plano Solo');
commit;

\echo ''
\echo '— A empresa que ficou acima do limite sabe disso, e consegue se acertar'
-- É o caso da empresa que já existia: cadastrou os motoristas no plano Equipe e
-- depois foi parar no Solo. O aviso de pagamento roda como sistema e nunca é
-- barrado — dinheiro que entrou tem de ser registrado —, então o aplicativo
-- precisa saber pedir o acerto.
insert into auth.users (id, email) values
  ('d4444444-4444-4444-4444-444444444444', 'antiga@transfer.com.br')
on conflict do nothing;

begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"d4444444-4444-4444-4444-444444444444"}';
  select public.criar_empresa('Empresa Antiga', 'Vera', null, null, null, null, 'equipe') as antiga \gset
  insert into public.motoristas (empresa_id, perfil_id, nome, telefone, veiculo, lugares, percentual)
  values (:'antiga', 'd4444444-4444-4444-4444-444444444444', 'Vera', '1', 'Onix', 4, 100),
         (:'antiga', null, 'Sobrou de antes', '2', 'Spin', 6, 40);
commit;

begin;
  set local role postgres;
  update public.assinaturas set plano_id = 'solo', status = 'ativa' where empresa_id = :'antiga';

  set local role authenticated;
  set local request.jwt.claims = '{"sub":"d4444444-4444-4444-4444-444444444444"}';
  select testes.confere((select modo from public.minha_assinatura) = 'solo',
                        'a empresa está no modo solo');
  select testes.confere((select acima_do_limite from public.minha_assinatura) = true,
                        'e a tela avisa que a operação está acima do plano');
  select testes.confere((select motoristas_cadastrados from public.minha_assinatura) = 2,
                        'são dois motoristas para um plano de um');

  delete from public.motoristas where empresa_id = :'antiga' and perfil_id is null;
  select testes.confere((select count(*) from public.motoristas where empresa_id = :'antiga') = 1,
                        'o motorista que sobrou pode ser excluído');
  select testes.confere((select acima_do_limite from public.minha_assinatura) = false,
                        'e a empresa volta a caber no plano');

  select testes.confere_erro(
    'delete from public.motoristas where empresa_id = ''' || :'antiga' || '''',
    'mas o cadastro do próprio dono, no Solo, não sai');
rollback;

\echo 'PLANOS: TODOS OS TESTES PASSARAM'
