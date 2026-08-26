-- Os planos vendidos. Mude preço e limites aqui.

insert into public.planos (id, nome, descricao, preco_centavos, limite_motoristas, limite_servicos_mes, ordem)
values
  ('essencial',    'Essencial',    'Para quem está começando, com até 3 motoristas.',      9900,  3,   150,  1),
  ('profissional', 'Profissional', 'Para a operação do dia a dia, motoristas à vontade.', 19900,  null, null, 2),
  ('frota',        'Frota',        'Para quem tem vários carros e precisa de apoio.',     34900,  null, null, 3)
on conflict (id) do update
  set nome = excluded.nome,
      descricao = excluded.descricao,
      preco_centavos = excluded.preco_centavos,
      limite_motoristas = excluded.limite_motoristas,
      limite_servicos_mes = excluded.limite_servicos_mes,
      ordem = excluded.ordem;
