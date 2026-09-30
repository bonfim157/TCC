-- Login real (B2): senha, segundo fator e limite de tentativas.

-- Sessão criada depois da senha, mas ainda sem o segundo fator: não dá acesso a nada.
alter table sessoes add column mfa_pendente boolean not null default false;
grant update (mfa_pendente) on sessoes to app_tcc;

-- Segredo do segundo fator (TOTP), cifrado pela aplicação com uma chave que
-- não fica no banco. Sem confirmado_em, o cadastro ainda não foi concluído.
create table fatores_mfa (
  usuario_id       text primary key references usuarios(id),
  segredo_cifrado  text not null,
  confirmado_em    timestamptz
);
grant select, insert, update on fatores_mfa to app_tcc;
-- Cada pessoa só alcança o próprio segredo.
alter table fatores_mfa enable row level security;
alter table fatores_mfa force row level security;
create policy proprio on fatores_mfa using (usuario_id = usuario_atual()) with check (usuario_id = usuario_atual());

-- Tentativas de login, para bloquear depois de várias senhas erradas.
create table tentativas_login (
  id       bigint generated always as identity primary key,
  email    text not null,
  em       timestamptz not null default clock_timestamp(),
  sucesso  boolean not null
);
create index tentativas_login_email on tentativas_login (email, em desc);
grant select, insert on tentativas_login to app_tcc;

-- A aplicação grava a senha (já como hash Argon2id) só por esta função:
-- não tem UPDATE na tabela de pessoas, nem SELECT na coluna do hash.
create function definir_senha(p_usuario_id text, p_senha_hash text) returns void
  language sql security definer set search_path = public as
  $$ update usuarios set senha_hash = p_senha_hash where id = p_usuario_id $$;
revoke all on function definir_senha(text, text) from public;
grant execute on function definir_senha(text, text) to app_tcc;
