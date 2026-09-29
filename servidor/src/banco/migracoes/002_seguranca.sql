-- Isolamento entre redes e proteção da auditoria.
--
-- A aplicação trabalha sempre como o papel app_tcc, que não é dono das
-- tabelas. Toda transação faz "set local role app_tcc" e informa a rede com
-- set_config('app.rede_id', ..., true). Sem rede informada, as tabelas com
-- rede_id não mostram nada. FORCE ROW LEVEL SECURITY vale até para o dono.

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'app_tcc') then
    create role app_tcc nologin;
  end if;
end $$;
-- Quem roda as migrações (o dono) precisa poder assumir o papel da aplicação.
grant app_tcc to current_user;

create function rede_atual() returns text language sql stable as
  $$ select nullif(current_setting('app.rede_id', true), '') $$;
create function usuario_atual() returns text language sql stable as
  $$ select nullif(current_setting('app.usuario_id', true), '') $$;

-- Tabelas sem rede: dados públicos da rede, pessoas e sessões.
grant select on redes to app_tcc;
grant select (id, nome, email) on usuarios to app_tcc;   -- nunca senha_hash
grant select, insert, delete on sessoes to app_tcc;

-- Tabelas por rede: leitura e escrita normais, filtradas por rede.
do $$
declare t text;
begin
  foreach t in array array[
    'regionais', 'escolas', 'vinculos', 'vinculo_escolas', 'categorias', 'regras_protocolo',
    'modelos_comunicacao', 'contatos_locais', 'pessoas', 'responsaveis', 'ocorrencias',
    'envolvimentos', 'anexos', 'providencias', 'encaminhamentos', 'acoes_plano',
    'comunicacoes', 'contadores_protocolo', 'eventos', 'auditoria'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    if t not in ('vinculos', 'vinculo_escolas') then
      execute format(
        'create policy por_rede on %I using (rede_id = rede_atual()) with check (rede_id = rede_atual())', t);
    end if;
    if t in ('eventos', 'auditoria') then
      execute format('grant select, insert on %I to app_tcc', t);
    else
      execute format('grant select, insert, update, delete on %I to app_tcc', t);
    end if;
  end loop;
end $$;

-- A pessoa vê os próprios vínculos em qualquer rede (para escolher a rede ao entrar);
-- os vínculos dos outros, só na rede ativa.
create policy por_rede_ou_proprio on vinculos
  using (rede_id = rede_atual() or usuario_id = usuario_atual())
  with check (rede_id = rede_atual());
create policy por_rede_ou_proprio on vinculo_escolas
  using (rede_id = rede_atual() or exists (select 1 from vinculos v where v.id = vinculo_id and v.usuario_id = usuario_atual()))
  with check (rede_id = rede_atual());

-- Página pública de ciência: descobre a rede pelo hash do token, sem ver mais nada.
create function rede_da_ciencia(p_token_hash text) returns text
  language sql stable security definer set search_path = public as
  $$ select rede_id from comunicacoes where token_hash = p_token_hash $$;
revoke all on function rede_da_ciencia(text) from public;
grant execute on function rede_da_ciencia(text) to app_tcc;

-- Login (B2): a senha só é conferida aqui dentro; a aplicação nunca lê o hash.
create function hash_da_senha(p_email text) returns table (usuario_id text, senha_hash text)
  language sql stable security definer set search_path = public as
  $$ select id, senha_hash from usuarios where lower(email) = lower(p_email) $$;
revoke all on function hash_da_senha(text) from public;
grant execute on function hash_da_senha(text) to app_tcc;

-- Cadeia de hashes da auditoria: cada linha leva o hash da anterior da mesma rede.
-- A trava por rede serializa as inserções; sem ela, duas inserções simultâneas
-- apontariam para a mesma anterior e a cadeia se dividiria.
create function encadear_auditoria() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(hashtext('auditoria:' || new.rede_id));
  select hash into new.hash_anterior from auditoria where rede_id = new.rede_id order by id desc limit 1;
  new.hash := encode(sha256(convert_to(concat_ws('|',
    new.hash_anterior, new.rede_id, new.em, new.ator, new.perfil, new.acao, new.recurso, new.resultado, new.detalhe
  ), 'UTF8')), 'hex');
  return new;
end $$;
create trigger encadear before insert on auditoria for each row execute function encadear_auditoria();
