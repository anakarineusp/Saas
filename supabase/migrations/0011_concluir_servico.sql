-- Fechar o serviço depois de rodado. É o que separa "o que está marcado" de
-- "o que já aconteceu" na hora de acertar o mês.

create or replace function public.concluir_servico(p_servico_id uuid, p_concluido boolean default true)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_empresa uuid := app.empresa_id();
begin
  if v_empresa is null or app.papel() <> 'dono' then
    raise exception 'Só o dono da empresa pode concluir serviços.';
  end if;

  update public.servicos s
     set status = case
                    when p_concluido then 'concluido'
                    when s.motorista_id is null then 'sem_motorista'
                    else 'atribuido'
                  end
   where s.id = p_servico_id and s.empresa_id = v_empresa;

  if not found then
    raise exception 'Serviço não encontrado nesta empresa.';
  end if;
end;
$$;

grant execute on function public.concluir_servico(uuid, boolean) to authenticated;
