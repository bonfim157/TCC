-- Página pública de ciência: de qual rede é um token?
--
-- A função rede_da_ciencia (002) dependia de o dono da função enxergar todas
-- as linhas de comunicacoes. Com FORCE ROW LEVEL SECURITY isso só vale para
-- superusuário; na Neon o dono não é superusuário e a função não devolveria
-- nada. Em vez disso, uma tabela sem RLS guarda só o par (hash do token, rede):
-- não revela nada do caso, e o hash não permite reconstruir o link.
drop function rede_da_ciencia(text);

create table tokens_ciencia (
  token_hash  text primary key,
  rede_id     text not null references redes(id)
);
grant select, insert on tokens_ciencia to app_tcc;

insert into tokens_ciencia (token_hash, rede_id)
select token_hash, rede_id from comunicacoes where token_hash is not null;
