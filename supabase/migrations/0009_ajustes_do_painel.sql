-- O painel mostra o nome do plano, não o código interno.

-- Trocar a ordem das colunas exige recriar a visão, não só substituir.
drop view if exists public.painel_clientes;

create view public.painel_clientes
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
  pl.nome as plano,
  a.proxima_cobranca,
  (select count(*) from public.motoristas m where m.empresa_id = e.id) as motoristas,
  (select count(*) from public.servicos s where s.empresa_id = e.id) as servicos,
  coalesce((select sum(pg.valor_centavos) from public.pagamentos pg
             where pg.empresa_id = e.id and pg.status = 'pago'), 0) as pago_centavos
from public.empresas e
left join public.assinaturas a on a.empresa_id = e.id
left join public.planos pl on pl.id = a.plano_id;

grant select on public.painel_clientes to authenticated;
