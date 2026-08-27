-- Plano anual, programa de indicação e os ajustes que a administração liga e
-- desliga sem precisar de programador.

-- ------------------------------------------------------------ plano anual

alter table public.planos add column if not exists preco_anual_centavos int;

-- No anual, paga 10 meses e leva 12. Conta redonda, fácil de explicar na venda.
update public.planos
   set preco_anual_centavos = preco_centavos * 10
 where preco_anual_centavos is null;

alter table public.assinaturas add column if not exists ciclo text not null default 'mensal';

do $$ begin
  alter table public.assinaturas add constraint assinaturas_ciclo
    check (ciclo in ('mensal', 'anual'));
exception when duplicate_object then null;
end $$;

-- --------------------------------------------------------- indicação

alter table public.empresas add column if not exists codigo_indicacao text;
alter table public.empresas add column if not exists indicada_por uuid references public.empresas(id);
alter table public.empresas add column if not exists meses_de_credito int not null default 0;

create unique index if not exists empresas_codigo_indicacao on public.empresas (codigo_indicacao)
  where codigo_indicacao is not null;

/** Código curto, fácil de ditar no telefone. Sem letras que se confundem. */
create or replace function app.novo_codigo_de_indicacao()
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_letras text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_codigo text;
  v_tentativa int := 0;
begin
  loop
    v_codigo := '';
    for _ in 1..6 loop
      v_codigo := v_codigo || substr(v_letras, 1 + floor(random() * length(v_letras))::int, 1);
    end loop;
    exit when not exists (select 1 from public.empresas e where e.codigo_indicacao = v_codigo);
    v_tentativa := v_tentativa + 1;
    if v_tentativa > 40 then
      v_codigo := v_codigo || floor(random() * 90 + 10)::text;
      exit;
    end if;
  end loop;
  return v_codigo;
end;
$$;

update public.empresas set codigo_indicacao = app.novo_codigo_de_indicacao()
 where codigo_indicacao is null;

create table if not exists public.indicacoes (
  id                uuid primary key default gen_random_uuid(),
  empresa_origem    uuid not null references public.empresas(id) on delete cascade,
  empresa_indicada  uuid not null unique references public.empresas(id) on delete cascade,
  status            text not null default 'pendente' check (status in ('pendente', 'confirmada', 'cancelada')),
  meses_premio      int not null default 1,
  criada_em         timestamptz not null default now(),
  confirmada_em     timestamptz
);

create index if not exists indicacoes_origem_idx on public.indicacoes (empresa_origem);

alter table public.indicacoes enable row level security;

drop policy if exists indicacoes_ver on public.indicacoes;
create policy indicacoes_ver on public.indicacoes for select using (
  empresa_origem = app.empresa_id() or empresa_indicada = app.empresa_id() or app.eh_admin()
);

-- ------------------------------------------------- ajustes da administração

create table if not exists public.configuracoes (
  chave       text primary key,
  valor       jsonb not null,
  descricao   text,
  atualizada_em timestamptz not null default now()
);

alter table public.configuracoes enable row level security;

-- A tela de cadastro precisa saber, antes do login, se vai pedir cartão.
drop policy if exists configuracoes_ver on public.configuracoes;
create policy configuracoes_ver on public.configuracoes for select using (true);

drop policy if exists configuracoes_admin on public.configuracoes;
create policy configuracoes_admin on public.configuracoes for all
  using (app.eh_admin()) with check (app.eh_admin());

insert into public.configuracoes (chave, valor, descricao) values
  ('exigir_cartao_no_teste', 'false'::jsonb,
   'Pedir cartão para começar o teste de 7 dias. Ligado costuma trazer menos cadastros, porém mais qualificados.'),
  ('meses_de_premio_por_indicacao', '1'::jsonb,
   'Quantos meses grátis cada lado ganha quando uma indicação vira cliente pagante.'),
  ('meses_gratis_no_anual', '2'::jsonb,
   'Quantos meses saem de graça no plano anual. Serve só para o texto da vitrine.')
on conflict (chave) do nothing;

grant select on public.configuracoes, public.indicacoes to anon, authenticated;
grant insert, update, delete on public.planos, public.configuracoes to authenticated;

/** Lê um ajuste com um valor de reserva, para a tela nunca ficar sem resposta. */
create or replace function public.ajuste(p_chave text)
returns jsonb
language sql stable security definer set search_path = '' as $$
  select c.valor from public.configuracoes c where c.chave = p_chave
$$;

grant execute on function public.ajuste(text) to anon, authenticated;


-- ------------------------------------- cadastro com código de quem indicou

drop function if exists public.criar_empresa(text, text, text, text, text);

create or replace function public.criar_empresa(
  p_empresa    text,
  p_seu_nome   text,
  p_telefone   text default null,
  p_documento  text default null,
  p_cidade     text default null,
  p_indicacao  text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_usuario uuid := auth.uid();
  v_empresa uuid;
  v_origem  uuid;
  v_premio  int;
begin
  if v_usuario is null then
    raise exception 'Faça login antes de cadastrar a empresa.';
  end if;
  if exists (select 1 from public.perfis p where p.id = v_usuario) then
    raise exception 'Esta conta já está ligada a uma empresa.';
  end if;

  -- quem indicou, se veio código
  if p_indicacao is not null and length(trim(p_indicacao)) > 0 then
    select e.id into v_origem
      from public.empresas e
     where e.codigo_indicacao = upper(trim(p_indicacao));
  end if;

  insert into public.empresas (nome, documento, telefone, cidade, codigo_indicacao, indicada_por)
  values (p_empresa, p_documento, p_telefone, p_cidade, app.novo_codigo_de_indicacao(), v_origem)
  returning id into v_empresa;

  insert into public.perfis (id, nome, telefone, papel, empresa_id)
  values (v_usuario, p_seu_nome, p_telefone, 'dono', v_empresa);

  insert into public.assinaturas (empresa_id, status) values (v_empresa, 'teste');

  if v_origem is not null then
    v_premio := coalesce((select (c.valor)::text::int from public.configuracoes c
                           where c.chave = 'meses_de_premio_por_indicacao'), 1);
    insert into public.indicacoes (empresa_origem, empresa_indicada, meses_premio)
    values (v_origem, v_empresa, v_premio);
  end if;

  return v_empresa;
end;
$$;

grant execute on function public.criar_empresa(text, text, text, text, text, text) to authenticated;

/** Confere se um código de indicação existe, para a tela de cadastro avisar na hora. */
create or replace function public.conferir_indicacao(p_codigo text)
returns text
language sql stable security definer set search_path = '' as $$
  select e.nome from public.empresas e where e.codigo_indicacao = upper(trim(p_codigo))
$$;

grant execute on function public.conferir_indicacao(text) to anon, authenticated;

-- ------------------------- a indicação vira prêmio quando o indicado paga

create or replace function app.premiar_indicacao()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_indicacao public.indicacoes;
begin
  if new.status <> 'pago' then
    return new;
  end if;

  select * into v_indicacao from public.indicacoes i
   where i.empresa_indicada = new.empresa_id and i.status = 'pendente';

  if not found then
    return new;
  end if;

  update public.indicacoes set status = 'confirmada', confirmada_em = now()
   where id = v_indicacao.id;

  -- os dois lados ganham: quem indicou e quem foi indicado
  update public.empresas
     set meses_de_credito = meses_de_credito + v_indicacao.meses_premio
   where id in (v_indicacao.empresa_origem, v_indicacao.empresa_indicada);

  return new;
end;
$$;

drop trigger if exists premiar_indicacao on public.pagamentos;
create trigger premiar_indicacao after insert or update of status on public.pagamentos
  for each row execute function app.premiar_indicacao();

-- ------------------------------------------------- a assinatura vista pela empresa

drop view if exists public.minha_assinatura;
create view public.minha_assinatura
with (security_invoker = true) as
select
  a.empresa_id,
  e.nome as empresa,
  a.status,
  a.ciclo,
  a.plano_id,
  p.nome as plano,
  case when a.ciclo = 'anual' then p.preco_anual_centavos else p.preco_centavos end as preco_centavos,
  a.proxima_cobranca,
  e.teste_termina_em,
  e.codigo_indicacao,
  e.meses_de_credito,
  greatest(0, ceil(extract(epoch from (e.teste_termina_em - now())) / 86400))::int as dias_de_teste,
  (select count(*) from public.indicacoes i where i.empresa_origem = e.id) as indicacoes_feitas,
  (select count(*) from public.indicacoes i where i.empresa_origem = e.id and i.status = 'confirmada')
    as indicacoes_confirmadas,
  (a.status = 'ativa' or (a.status in ('teste', 'atrasada') and e.teste_termina_em > now())) as pode_usar
from public.assinaturas a
join public.empresas e on e.id = a.empresa_id
left join public.planos p on p.id = a.plano_id;

grant select on public.minha_assinatura to authenticated;
