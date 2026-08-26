-- Visões que o aplicativo lê direto, para cada tela fazer uma consulta só.
-- Como usam "security_invoker", as regras de quem vê o quê continuam valendo:
-- para o motorista, a parte do valor do cliente simplesmente volta vazia.

create or replace view public.servicos_completos
with (security_invoker = true) as
select
  s.id,
  s.empresa_id,
  s.data,
  s.hora,
  s.tipo,
  s.passageiro,
  s.pax,
  s.origem,
  s.destino,
  s.voo,
  s.status,
  s.motorista_id,
  m.nome      as motorista,
  m.veiculo   as veiculo,
  m.lugares   as lugares,
  m.percentual as percentual,
  s.indicador_id,
  i.nome      as indicador,
  s.valor_motorista_centavos,
  v.valor_centavos,
  v.comissao_indicador_centavos
from public.servicos s
left join public.motoristas m     on m.id = s.motorista_id
left join public.indicadores i    on i.id = s.indicador_id
left join public.servico_valores v on v.servico_id = s.id;

grant select on public.servicos_completos to authenticated;
