-- Cupons para os primeiros clientes, gestão de clientes pela administração e
-- os números do negócio.

-- ---------------------------------------------------------------- cupons

create table if not exists public.cupons (
  codigo        text primary key,
  descricao     text,
  tipo          text not null check (tipo in ('percentual', 'meses_gratis', 'valor')),
  valor         int not null check (valor > 0),
  plano_id      text references public.planos(id),
  validade      date,
  usos_maximos  int,
  usos          int not null default 0,
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now()
);

create table if not exists public.cupom_usos (
  id         uuid primary key default gen_random_uuid(),
  codigo     text not null references public.cupons(codigo) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  usado_em   timestamptz not null default now(),
  unique (codigo, empresa_id)
);

alter table public.cupons enable row level security;
alter table public.cupom_usos enable row level security;

-- A tela de cadastro precisa conferir o cupom antes do login.
drop policy if exists cupons_ver on public.cupons;
create policy cupons_ver on public.cupons for select using (true);

drop policy if exists cupons_admin on public.cupons;
create policy cupons_admin on public.cupons for all
  using (app.eh_admin()) with check (app.eh_admin());

drop policy if exists cupom_usos_ver on public.cupom_usos;
create policy cupom_usos_ver on public.cupom_usos for select
  using (empresa_id = app.empresa_id() or app.eh_admin());

grant select on public.cupons, public.cupom_usos to anon, authenticated;
grant insert, update, delete on public.cupons to authenticated;

alter table public.empresas add column if not exists cupom text references public.cupons(codigo);

/** Confere um cupom e devolve o que ele dá, sem gastar o uso. */
create or replace function public.conferir_cupom(p_codigo text)
returns table (codigo text, descricao text, tipo text, valor int)
language sql stable security definer set search_path = '' as $$
  select c.codigo, c.descricao, c.tipo, c.valor
    from public.cupons c
   where c.codigo = upper(trim(p_codigo))
     and c.ativo
     and (c.validade is null or c.validade >= current_date)
     and (c.usos_maximos is null or c.usos < c.usos_maximos)
$$;

/** Aplica o cupom na empresa de quem está logado. */
create or replace function public.aplicar_cupom(p_codigo text)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_empresa uuid := app.empresa_id();
  v_cupom   public.cupons;
begin
  if v_empresa is null or app.papel() <> 'dono' then
    raise exception 'Só o dono da empresa pode usar cupom.';
  end if;

  select * into v_cupom from public.cupons c
   where c.codigo = upper(trim(p_codigo))
     and c.ativo
     and (c.validade is null or c.validade >= current_date)
     and (c.usos_maximos is null or c.usos < c.usos_maximos);

  if not found then
    raise exception 'Cupom inválido, vencido ou esgotado.';
  end if;

  if exists (select 1 from public.cupom_usos u where u.codigo = v_cupom.codigo and u.empresa_id = v_empresa) then
    raise exception 'Este cupom já foi usado por esta empresa.';
  end if;

  insert into public.cupom_usos (codigo, empresa_id) values (v_cupom.codigo, v_empresa);
  update public.cupons set usos = usos + 1 where codigo = v_cupom.codigo;
  update public.empresas set cupom = v_cupom.codigo where id = v_empresa;

  -- Meses grátis viram crédito e esticam o teste na hora.
  if v_cupom.tipo = 'meses_gratis' then
    update public.empresas
       set meses_de_credito = meses_de_credito + v_cupom.valor,
           teste_termina_em = greatest(teste_termina_em, now()) + (v_cupom.valor || ' months')::interval
     where id = v_empresa;
  end if;

  return v_cupom.tipo;
end;
$$;

grant execute on function public.conferir_cupom(text) to anon, authenticated;
grant execute on function public.aplicar_cupom(text) to authenticated;

-- ------------------------------------------- a administração cuida dos clientes

drop policy if exists empresas_admin on public.empresas;
create policy empresas_admin on public.empresas for all
  using (app.eh_admin()) with check (app.eh_admin());

drop policy if exists assinaturas_admin on public.assinaturas;
create policy assinaturas_admin on public.assinaturas for all
  using (app.eh_admin()) with check (app.eh_admin());

grant insert, update, delete on public.empresas, public.assinaturas to authenticated;

/** Estica o teste de um cliente. Serve para negociar sem mexer no banco. */
create or replace function public.esticar_teste(p_empresa uuid, p_dias int)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not app.eh_admin() then
    raise exception 'Só a administração pode esticar o teste.';
  end if;
  update public.empresas
     set teste_termina_em = greatest(teste_termina_em, now()) + (p_dias || ' days')::interval
   where id = p_empresa;
end;
$$;

grant execute on function public.esticar_teste(uuid, int) to authenticated;

-- ------------------------------------------------------ os números do negócio

create or replace view public.painel_indicadores
with (security_invoker = true) as
with base as (
  select
    (select count(*) from public.empresas) as empresas,
    (select count(*) from public.assinaturas where status = 'ativa') as assinantes,
    (select count(*) from public.assinaturas a join public.empresas e on e.id = a.empresa_id
      where a.status = 'teste' and e.teste_termina_em > now()) as em_teste,
    (select count(*) from public.assinaturas a join public.empresas e on e.id = a.empresa_id
      where a.status = 'teste' and e.teste_termina_em <= now()) as testes_vencidos,
    (select count(*) from public.assinaturas where status = 'atrasada') as atrasados,
    (select count(*) from public.assinaturas where status = 'cancelada') as cancelados,
    (select count(*) from public.empresas where criada_em >= date_trunc('month', now())) as novos_no_mes,
    (select count(*) from public.empresas
      where criada_em >= date_trunc('month', now()) - interval '1 month'
        and criada_em < date_trunc('month', now())) as novos_mes_passado,
    coalesce((select sum(pl.preco_centavos) from public.assinaturas a
               join public.planos pl on pl.id = a.plano_id
              where a.status = 'ativa' and a.ciclo = 'mensal'), 0)
    + coalesce((select sum(pl.preco_anual_centavos / 12) from public.assinaturas a
                 join public.planos pl on pl.id = a.plano_id
                where a.status = 'ativa' and a.ciclo = 'anual'), 0) as recorrente_centavos,
    coalesce((select sum(p.valor_centavos) from public.pagamentos p
              where p.status = 'pago' and p.pago_em >= date_trunc('month', now())), 0) as recebido_mes_centavos,
    coalesce((select sum(p.valor_centavos) from public.pagamentos p
              where p.status = 'pago'
                and p.pago_em >= date_trunc('month', now()) - interval '1 month'
                and p.pago_em < date_trunc('month', now())), 0) as recebido_mes_passado_centavos,
    coalesce((select sum(p.valor_centavos) from public.pagamentos p where p.status = 'pago'), 0)
      as recebido_total_centavos,
    coalesce((select sum(p.valor_centavos) from public.pagamentos p
              where p.status = 'pendente'), 0) as a_receber_centavos,
    (select count(*) from public.indicacoes where status = 'confirmada') as indicacoes_confirmadas,
    (select count(*) from public.servicos) as servicos_no_sistema,
    (select count(*) from public.motoristas) as motoristas_no_sistema
)
select
  base.*,
  case when base.assinantes > 0 then round(base.recorrente_centavos::numeric / base.assinantes) else 0 end
    as ticket_medio_centavos,
  case when (base.assinantes + base.cancelados) > 0
       then round(base.cancelados::numeric * 100 / (base.assinantes + base.cancelados), 1)
       else 0 end as cancelamento_porcento,
  case when (base.assinantes + base.em_teste + base.testes_vencidos) > 0
       then round(base.assinantes::numeric * 100 / (base.assinantes + base.em_teste + base.testes_vencidos), 1)
       else 0 end as conversao_porcento,
  base.recorrente_centavos * 12 as anual_projetado_centavos
from base;

grant select on public.painel_indicadores to authenticated;

/** Faturamento mês a mês, para o gráfico do painel. */
create or replace function public.receita_por_mes(p_meses int default 12)
returns table (mes text, recebido_centavos bigint, clientes bigint)
language sql stable security definer set search_path = '' as $$
  select
    to_char(m.mes, 'YYYY-MM') as mes,
    coalesce((select sum(p.valor_centavos) from public.pagamentos p
               where p.status = 'pago' and date_trunc('month', p.pago_em) = m.mes), 0)::bigint,
    (select count(*) from public.empresas e where date_trunc('month', e.criada_em) <= m.mes)::bigint
  from generate_series(
         date_trunc('month', now()) - ((p_meses - 1) || ' months')::interval,
         date_trunc('month', now()),
         interval '1 month'
       ) as m(mes)
  where app.eh_admin()
  order by m.mes
$$;

grant execute on function public.receita_por_mes(int) to authenticated;
