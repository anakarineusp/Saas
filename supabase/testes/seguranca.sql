-- Prova, com o banco de verdade, que:
--  1. uma empresa nunca enxerga os dados da outra
--  2. o motorista só vê os serviços dele
--  3. o motorista não alcança o valor cobrado do cliente nem indo direto no banco
--  4. o motorista não consegue alterar nada além de confirmar o serviço dele
--  5. o administrador do sistema enxerga todos os clientes

create schema if not exists testes;

create or replace function testes.confere(p_ok boolean, p_texto text) returns void
language plpgsql as $$
begin
  if p_ok then raise notice '  ok    %', p_texto;
  else raise exception 'FALHOU: %', p_texto;
  end if;
end $$;

grant usage on schema testes to anon, authenticated;
grant execute on function testes.confere(boolean, text) to anon, authenticated;

-- pessoas de teste
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'ana@serratransfer.com.br'),
  ('22222222-2222-2222-2222-222222222222', 'bruno@valeturismo.com.br'),
  ('33333333-3333-3333-3333-333333333333', 'jocemar@gmail.com'),
  ('99999999-9999-9999-9999-999999999999', 'admin@sistema.com.br')
on conflict do nothing;

\echo ''
\echo '— Ana cadastra a empresa dela'
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
  select public.criar_empresa('Serra Transfer', 'Ana Karine', '5554999000001', '12.345.678/0001-90', 'Gramado') as empresa_ana \gset
  select testes.confere((select count(*) from public.empresas) = 1, 'a empresa foi criada');
  select testes.confere((select status from public.minha_assinatura) = 'teste', 'assinatura começa em teste');
  select testes.confere((select dias_de_teste from public.minha_assinatura) = 7, 'o teste começa com 7 dias');
  select testes.confere((select pode_usar from public.minha_assinatura), 'durante o teste ela pode usar');
commit;

\echo ''
\echo '— Bruno cadastra outra empresa'
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
  select public.criar_empresa('Vale Turismo', 'Bruno Reis', '5554999000002') as empresa_bruno \gset
commit;

\echo ''
\echo '— Ana cadastra motorista, indicador e um serviço de R$ 480,00'
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

  insert into public.motoristas (empresa_id, nome, telefone, veiculo, lugares, percentual)
  values (:'empresa_ana', 'Jocemar', '5554999120031', 'Spin', 6, 40) returning id as motorista \gset

  insert into public.indicadores (empresa_id, nome, telefone, comissao)
  values (:'empresa_ana', 'Pousada Vila Suíça', '555432958120', 10) returning id as indicador \gset

  select public.gravar_servico(
    current_date, '14:20', 'transfer_in', 'Grupo Tavares', 5,
    'Aeroporto Salgado Filho, Porto Alegre', 'Pousada Vila Suíça, Gramado',
    48000, 'G3 1408', :'indicador'
  ) as servico \gset

  select testes.confere((select valor_centavos from public.servico_valores where servico_id = :'servico') = 48000,
                        'o valor do cliente ficou guardado: R$ 480,00');
  select testes.confere((select comissao_indicador_centavos from public.servico_valores where servico_id = :'servico') = 4800,
                        'a comissão do indicador saiu certa: R$ 48,00');

  select public.atribuir_motorista(:'servico', :'motorista');
  select testes.confere((select valor_motorista_centavos from public.servicos where id = :'servico') = 19200,
                        'o valor do motorista saiu certo: R$ 192,00 (40%)');
  select testes.confere((select status from public.servicos where id = :'servico') = 'atribuido',
                        'o serviço virou atribuído');

  insert into public.convites (empresa_id, motorista_id) values (:'empresa_ana', :'motorista')
  returning token as convite \gset
commit;

\echo ''
\echo '— Bruno tenta bisbilhotar a empresa da Ana'
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
  select testes.confere((select count(*) from public.servicos) = 0, 'Bruno não vê nenhum serviço da Ana');
  select testes.confere((select count(*) from public.servico_valores) = 0, 'Bruno não vê nenhum valor da Ana');
  select testes.confere((select count(*) from public.motoristas) = 0, 'Bruno não vê os motoristas da Ana');
  select testes.confere((select count(*) from public.empresas) = 1, 'Bruno só enxerga a empresa dele');
commit;

\echo ''
\echo '— Jocemar aceita o convite e vira motorista com login'
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';
  select public.aceitar_convite(:'convite', 'Jocemar Bariatto');
  select testes.confere((select papel from public.perfis where id = auth.uid()) = 'motorista', 'o perfil dele é de motorista');
commit;

\echo ''
\echo '— O que o motorista consegue ver e fazer'
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';

  select testes.confere((select count(*) from public.servicos) = 1, 'vê o serviço que é dele');
  select testes.confere((select valor_motorista_centavos from public.servicos limit 1) = 19200, 'vê o valor dele: R$ 192,00');
  select testes.confere((select count(*) from public.servico_valores) = 0,
                        'NÃO alcança o valor cobrado do cliente, nem indo direto no banco');
  select testes.confere((select count(*) from public.indicadores) = 0, 'não vê os indicadores da empresa');
  select testes.confere((select count(*) from public.pagamentos) = 0, 'não vê pagamentos');

  select public.confirmar_servico((select id from public.servicos limit 1));
  select testes.confere((select status from public.servicos limit 1) = 'confirmado', 'consegue confirmar o serviço dele');

  update public.servicos set passageiro = 'invasão', valor_motorista_centavos = 999999;
  select testes.confere(not exists (select 1 from public.servicos where passageiro = 'invasão'),
                        'não consegue alterar o serviço por fora');
commit;

\echo ''
\echo '— O motorista tenta aumentar o próprio percentual'
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';
  update public.motoristas set percentual = 90;
  select testes.confere((select count(*) from public.motoristas where percentual = 90) = 0,
                        'não consegue mexer no próprio percentual');
commit;

\echo ''
\echo '— O administrador do sistema'
begin;
  set local role postgres;
  insert into public.perfis (id, nome, papel) values
    ('99999999-9999-9999-9999-999999999999', 'Administração', 'admin') on conflict do nothing;
  insert into public.pagamentos (empresa_id, valor_centavos, status, metodo, pago_em, provedor, provedor_cobranca_id)
  values (:'empresa_ana', 19900, 'pago', 'pix', now(), 'asaas', 'pay_teste_1') on conflict do nothing;

  set local role authenticated;
  set local request.jwt.claims = '{"sub":"99999999-9999-9999-9999-999999999999"}';
  select testes.confere((select count(*) from public.painel_clientes) = 2, 'enxerga as duas empresas cadastradas');
  select testes.confere((select count(*) from public.servicos) = 1, 'enxerga os serviços de todas');
  select testes.confere((select pago_centavos from public.painel_clientes where nome = 'Serra Transfer') = 19900,
                        'enxerga quanto cada cliente já pagou');
commit;

\echo ''
\echo 'TODOS OS TESTES PASSARAM'
