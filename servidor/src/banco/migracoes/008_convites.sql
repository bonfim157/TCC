-- Convites da direção para a equipe da escola.
--
-- O link leva um token que nunca é guardado: só o hash. O convite vale para um
-- e-mail, uma escola e um perfil, vence em 7 dias e só pode ser aceito uma vez.
create table convites (
  id           text primary key default gen_random_uuid()::text,
  rede_id      text not null references redes(id),
  escola_id    text not null references escolas(id),
  email        text not null,
  perfil       text not null check (perfil in ('professor', 'apoio', 'coordenacao', 'direcao', 'referente_protecao')),
  token_hash   text not null unique,
  criado_por   text not null,
  criado_em    timestamptz not null default now(),
  expira_em    timestamptz not null,
  aceito_em    timestamptz,
  cancelado_em timestamptz
);
alter table convites enable row level security;
alter table convites force row level security;
create policy por_rede on convites using (rede_id = rede_atual()) with check (rede_id = rede_atual());
grant select, insert, update on convites to app_tcc;

-- A página do convite descobre a rede pelo hash do token, como a de ciência (004).
create table tokens_convite (
  token_hash  text primary key,
  rede_id     text not null references redes(id)
);
grant select, insert, delete on tokens_convite to app_tcc;

-- A aplicação não tem INSERT em usuarios: a conta de quem aceita um convite nasce aqui.
create function criar_conta_convidada(p_nome text, p_email text, p_senha_hash text) returns text
  language sql security definer set search_path = public as
  $$ insert into usuarios (nome, email, senha_hash) values (p_nome, lower(p_email), p_senha_hash) returning id $$;
revoke all on function criar_conta_convidada(text, text, text) from public;
grant execute on function criar_conta_convidada(text, text, text) to app_tcc;
