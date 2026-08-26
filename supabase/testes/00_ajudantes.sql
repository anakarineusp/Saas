-- Ferramentas usadas pelos testes: uma confere se algo é verdade, a outra
-- confere se o banco barrou uma coisa que tinha de barrar.

create schema if not exists testes;

create or replace function testes.confere(p_ok boolean, p_texto text) returns void
language plpgsql as $$
begin
  if p_ok then raise notice '  ok    %', p_texto;
  else raise exception 'FALHOU: %', p_texto;
  end if;
end $$;


create or replace function testes.confere_erro(p_sql text, p_texto text) returns void
language plpgsql as $$
begin
  execute p_sql;
  raise exception 'NAO_BARROU';
exception
  when others then
    if sqlerrm = 'NAO_BARROU' then
      raise exception 'FALHOU: % (era para o banco barrar, e ele deixou passar)', p_texto;
    end if;
    raise notice '  ok    %', p_texto;
end $$;

grant execute on function testes.confere_erro(text, text) to anon, authenticated;

grant usage on schema testes to anon, authenticated;
grant execute on function testes.confere(boolean, text) to anon, authenticated;
