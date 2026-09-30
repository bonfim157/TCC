-- Senha temporária: criada por quem administra a conta, precisa ser trocada no primeiro acesso.
alter table usuarios add column senha_temporaria boolean not null default false;

drop function hash_da_senha(text);
create function hash_da_senha(p_email text) returns table (usuario_id text, senha_hash text, senha_temporaria boolean)
  language sql stable security definer set search_path = public as
  $$ select id, senha_hash, senha_temporaria from usuarios where lower(email) = lower(p_email) $$;
revoke all on function hash_da_senha(text) from public;
grant execute on function hash_da_senha(text) to app_tcc;

-- Ao trocar a senha, ela deixa de ser temporária.
create or replace function definir_senha(p_usuario_id text, p_senha_hash text) returns void
  language sql security definer set search_path = public as
  $$ update usuarios set senha_hash = p_senha_hash, senha_temporaria = false where id = p_usuario_id $$;

-- Trocar a senha encerra as outras sessões da pessoa.
grant delete on sessoes to app_tcc;
