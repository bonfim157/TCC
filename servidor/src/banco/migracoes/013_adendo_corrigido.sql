-- Adendo corrigido pelo próprio autor, com histórico.
--
-- O texto original de eventos.texto nunca muda: a tabela não recebe UPDATE nem
-- DELETE do app. Cada correção vira uma linha nova em versoes_eventos, e a última
-- é o texto atual. Os adendos novos guardam o autor pelo id; os antigos não têm
-- autor_id e, por isso, não podem ser corrigidos.
alter table eventos add column autor_id text references usuarios(id);

create table versoes_eventos (
  id            text primary key default gen_random_uuid()::text,
  rede_id       text not null references redes(id),
  ocorrencia_id text not null,
  evento_id     text not null,
  texto         text not null check (length(btrim(texto)) between 1 and 5000),
  autor_nome    text not null,
  em            timestamptz not null default clock_timestamp(),
  foreign key (ocorrencia_id, evento_id) references eventos (ocorrencia_id, id)
);

alter table versoes_eventos enable row level security;
alter table versoes_eventos force row level security;
create policy por_rede on versoes_eventos using (rede_id = rede_atual()) with check (rede_id = rede_atual());
grant select, insert on versoes_eventos to app_tcc;
