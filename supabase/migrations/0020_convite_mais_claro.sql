-- O convite de motorista dava um erro cru ("chave duplicada") quando a pessoa
-- que abria o link já era outra coisa no sistema — a dona da empresa testando,
-- ou alguém já ligado a outro motorista.
--
-- Agora cada caso tem um recado que diz o que fazer.

create or replace function public.aceitar_convite(p_token text, p_seu_nome text default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_usuario  uuid := auth.uid();
  v_convite  public.convites;
  v_perfil   public.perfis;
  v_nome     text;
  v_ja_ligado uuid;
begin
  if v_usuario is null then
    raise exception 'Faça login antes de aceitar o convite.';
  end if;

  select * into v_convite from public.convites c
   where c.token = p_token and c.usado_em is null and c.expira_em > now();

  if not found then
    raise exception 'Este convite já foi usado ou venceu. Peça um novo para a empresa.';
  end if;

  select * into v_perfil from public.perfis p where p.id = v_usuario;

  -- Quem já é dono de empresa ou administração não pode virar motorista por
  -- engano: quase sempre é a própria empresa abrindo o link para conferir.
  if v_perfil.papel = 'dono' then
    raise exception 'Você está conectada como dona da empresa. Saia da sua conta e abra este link no celular do motorista.';
  end if;

  if v_perfil.papel = 'admin' then
    raise exception 'Você está conectada como administração do sistema. Saia da conta antes de usar um convite de motorista.';
  end if;

  -- Já ligado a outro motorista da mesma empresa?
  select m.id into v_ja_ligado
    from public.motoristas m
   where m.empresa_id = v_convite.empresa_id and m.perfil_id = v_usuario;

  if v_ja_ligado is not null then
    if v_ja_ligado = v_convite.motorista_id then
      -- é o mesmo cadastro: não é erro, só repetição do clique
      update public.convites set usado_em = now() where id = v_convite.id;
      return v_convite.motorista_id;
    end if;
    raise exception 'Esta conta já está ligada a outro motorista desta empresa. Use um e-mail diferente para este convite.';
  end if;

  -- E o cadastro de motorista do convite, já foi para outra pessoa?
  if exists (
    select 1 from public.motoristas m
     where m.id = v_convite.motorista_id and m.perfil_id is not null and m.perfil_id <> v_usuario
  ) then
    raise exception 'Este motorista já tem conta. Peça à empresa um convite novo.';
  end if;

  select coalesce(p_seu_nome, m.nome) into v_nome
    from public.motoristas m where m.id = v_convite.motorista_id;

  insert into public.perfis (id, nome, papel)
  values (v_usuario, v_nome, 'motorista')
  on conflict (id) do nothing;

  update public.motoristas set perfil_id = v_usuario where id = v_convite.motorista_id;
  update public.convites set usado_em = now() where id = v_convite.id;

  return v_convite.motorista_id;
end;
$$;

grant execute on function public.aceitar_convite(text, text) to authenticated;

create or replace function public.versao_do_banco() returns int
language sql stable security definer set search_path = '' as $$ select 20 $$;
