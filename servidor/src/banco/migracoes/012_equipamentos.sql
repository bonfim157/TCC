-- Pedidos de equipamento e espaço (controle remoto, HDMI, fechadura).
--
-- Não são registros de pessoas: não têm envolvidos, protocolo nem prazo. Quem
-- pede é o professor (ou a portaria); a coordenação ou a direção responde com
-- anotações. Nada é editado nem apagado: a resposta entra como nova anotação.
create table pedidos_equipamento (
  id              text primary key default gen_random_uuid()::text,
  rede_id         text not null references redes(id),
  escola_id       text not null references escolas(id),
  criado_por_id   text not null references usuarios(id),
  criado_por_nome text not null,
  criado_em       timestamptz not null default clock_timestamp(),
  item            text not null check (length(btrim(item)) between 1 and 80),
  local           text not null check (length(btrim(local)) between 1 and 120),
  descricao       text not null check (length(btrim(descricao)) between 1 and 1000)
);

create table anotacoes_equipamento (
  id         text primary key default gen_random_uuid()::text,
  rede_id    text not null references redes(id),
  pedido_id  text not null references pedidos_equipamento(id),
  autor_id   text not null references usuarios(id),
  autor_nome text not null,
  em         timestamptz not null default clock_timestamp(),
  texto      text not null check (length(btrim(texto)) between 1 and 1000)
);

alter table pedidos_equipamento enable row level security;
alter table pedidos_equipamento force row level security;
create policy por_rede on pedidos_equipamento using (rede_id = rede_atual()) with check (rede_id = rede_atual());
grant select, insert on pedidos_equipamento to app_tcc;

alter table anotacoes_equipamento enable row level security;
alter table anotacoes_equipamento force row level security;
create policy por_rede on anotacoes_equipamento using (rede_id = rede_atual()) with check (rede_id = rede_atual());
grant select, insert on anotacoes_equipamento to app_tcc;
