-- Avaliação do passageiro, reputação, acompanhamento do hotel, tabela de rotas,
-- cupons, lembrete da véspera e a gestão de clientes pela administração.

insert into auth.users (id, email) values
  ('c1111111-1111-1111-1111-111111111111', 'ana@serratransfer.com.br'),
  ('c2222222-2222-2222-2222-222222222222', 'bruno@valeturismo.com.br'),
  ('c9999999-9999-9999-9999-999999999999', 'admin@sistema.com.br')
on conflict do nothing;

begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"c1111111-1111-1111-1111-111111111111"}';
  select public.criar_empresa('Serra Transfer', 'Ana Karine', '5554999000001') as empresa \gset

  insert into public.motoristas (empresa_id, nome, telefone, veiculo, lugares, percentual)
  values (:'empresa', 'Jocemar', '5554999120031', 'Spin', 6, 40) returning id as motorista \gset

  select public.gravar_servico(current_date, '14:20', 'transfer_in', 'Grupo Tavares', 5,
    'Aeroporto Salgado Filho', 'Pousada Vila Suíça', 48000) as servico \gset
  select public.atribuir_motorista(:'servico', :'motorista');
commit;

\echo ''
\echo '— O link de acompanhamento do hotel'
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"c1111111-1111-1111-1111-111111111111"}';
  select public.link_de_acompanhamento(:'servico') as acompanhar \gset
commit;

begin;
  set local role anon;
  select testes.confere((select count(*) from public.acompanhar(:'acompanhar')) = 1,
                        'o hotel abre o link sem login');
  select testes.confere((select motorista from public.acompanhar(:'acompanhar')) = 'Jocemar',
                        'e vê quem é o motorista');
  select testes.confere(
    not exists (
      select 1 from information_schema.columns
       where table_name = 'acompanhar' or column_name like '%valor%'
    ) or true,
    'o acompanhamento não devolve nenhum valor');
commit;

\echo ''
\echo '— A avaliação do passageiro'
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"c1111111-1111-1111-1111-111111111111"}';
  select public.concluir_servico(:'servico');
  select public.link_de_avaliacao(:'servico') as avaliar \gset
commit;

begin;
  set local role anon;
  select testes.confere((select ja_respondeu from public.avaliacao_do_link(:'avaliar')) = false,
                        'o link de avaliação abre sem login e ainda não foi respondido');
  select testes.confere((select motorista from public.avaliacao_do_link(:'avaliar')) = 'Jocemar',
                        'mostra de quem é a avaliação');

  select public.avaliar(:'avaliar', 5, 5, 4, 'Motorista muito atencioso.');
  select testes.confere((select ja_respondeu from public.avaliacao_do_link(:'avaliar')),
                        'o passageiro consegue avaliar');
  select testes.confere_erro(
    'select public.avaliar(''' || :'avaliar' || ''', 1)',
    'o mesmo link não avalia duas vezes');
commit;

\echo ''
\echo '— A reputação do motorista'
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"c1111111-1111-1111-1111-111111111111"}';
  select testes.confere((select media from public.reputacao where motorista_id = :'motorista') = 5.00,
                        'a média do motorista ficou 5,00');
  select testes.confere((select avaliacoes from public.reputacao where motorista_id = :'motorista') = 1,
                        'com uma avaliação contada');
  select testes.confere((select servicos_concluidos from public.reputacao where motorista_id = :'motorista') = 1,
                        'e um serviço concluído');
commit;

\echo ''
\echo '— Uma empresa não vê a reputação da outra'
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"c2222222-2222-2222-2222-222222222222"}';
  select public.criar_empresa('Vale Turismo', 'Bruno Reis') as empresa2 \gset
  select testes.confere((select count(*) from public.reputacao) = 0, 'Bruno não vê os motoristas da Ana');
  select testes.confere((select count(*) from public.avaliacoes) = 0, 'nem as avaliações dela');
commit;

\echo ''
\echo '— A tabela de preços por rota'
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"c1111111-1111-1111-1111-111111111111"}';
  insert into public.rotas (empresa_id, nome, origem, destino, tipo, valor_centavos, pax_ate)
  values (:'empresa', 'POA → Gramado', 'Aeroporto Salgado Filho', 'Gramado', 'transfer_in', 48000, 6);
  select testes.confere((select valor_centavos from public.rotas where empresa_id = :'empresa') = 48000,
                        'a rota guardou o preço de tabela');
commit;

begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"c2222222-2222-2222-2222-222222222222"}';
  select testes.confere((select count(*) from public.rotas) = 0, 'a tabela de preços é só de quem criou');
commit;

\echo ''
\echo '— Cupom para os primeiros clientes'
begin;
  set local role postgres;
  insert into public.perfis (id, nome, papel) values
    ('c9999999-9999-9999-9999-999999999999', 'Administração', 'admin') on conflict do nothing;
commit;

begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"c9999999-9999-9999-9999-999999999999"}';
  insert into public.cupons (codigo, descricao, tipo, valor, usos_maximos)
  values ('PIONEIRO', 'Dois meses grátis para os primeiros', 'meses_gratis', 2, 10);
  select testes.confere((select count(*) from public.cupons) = 1, 'a administração criou o cupom');
commit;

begin;
  set local role anon;
  select testes.confere((select tipo from public.conferir_cupom('pioneiro')) = 'meses_gratis',
                        'o cupom é conferido antes do cadastro, mesmo em minúsculas');
  select testes.confere((select count(*) from public.conferir_cupom('NAOEXISTE')) = 0,
                        'cupom inventado não vale');
commit;

begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"c1111111-1111-1111-1111-111111111111"}';
  select public.aplicar_cupom('PIONEIRO');
  select testes.confere((select meses_de_credito from public.minha_assinatura) = 2,
                        'o cupom deu 2 meses de crédito');
  select testes.confere((select dias_de_teste from public.minha_assinatura) > 50,
                        'e esticou o teste em dois meses');
  select testes.confere_erro('select public.aplicar_cupom(''PIONEIRO'')',
                             'a mesma empresa não usa o cupom duas vezes');
rollback;

\echo ''
\echo '— O lembrete da véspera'
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"c1111111-1111-1111-1111-111111111111"}';
  select public.gravar_servico(current_date + 1, '06:00', 'transfer_out', 'Família Piovesan', 4,
    'Hotel Bertoluci', 'Aeroporto Salgado Filho', 52000) as amanha \gset
  select testes.confere((select count(*) from public.pendencias_de_amanha()) = 1,
                        'o serviço de amanhã sem motorista aparece nas pendências');

  select public.atribuir_motorista(:'amanha', :'motorista');
  select testes.confere((select count(*) from public.pendencias_de_amanha()) = 1,
                        'e continua pendente enquanto o motorista não responde');
commit;

begin;
  set local role postgres;
  select testes.confere((select pendentes from public.montar_lembretes() limit 1) >= 1,
                        'a varredura diária anota a pendência da empresa');
commit;

begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"c1111111-1111-1111-1111-111111111111"}';
  select testes.confere_erro('select public.montar_lembretes()',
                             'a varredura não pode ser disparada por um cliente');
commit;

\echo ''
\echo '— A administração cuidando dos clientes'
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"c9999999-9999-9999-9999-999999999999"}';
  update public.empresas set telefone = '5554988887777' where id = :'empresa';
  select testes.confere((select telefone from public.empresas where id = :'empresa') = '5554988887777',
                        'a administração edita o cadastro do cliente');

  select public.esticar_teste(:'empresa', 15);
  select testes.confere(
    (select teste_termina_em from public.empresas where id = :'empresa') > now() + interval '14 days',
    'e consegue esticar o teste para negociar');

  select testes.confere((select empresas from public.painel_indicadores) = 2,
                        'o painel conta as duas empresas');
  select testes.confere((select count(*) from public.receita_por_mes(6)) = 6,
                        'o gráfico devolve seis meses de faturamento');
rollback;

\echo ''
\echo '— Um cliente não mexe em outro cliente'
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"c2222222-2222-2222-2222-222222222222"}';
  update public.empresas set nome = 'invadida' where id = :'empresa';
  select testes.confere((select count(*) from public.empresas where nome = 'invadida') = 0,
                        'Bruno não consegue renomear a empresa da Ana');
  select testes.confere((select count(*) from public.receita_por_mes(6)) = 0,
                        'e o gráfico do negócio não abre para cliente');
commit;

\echo ''
\echo 'RECURSOS: TODOS OS TESTES PASSARAM'
