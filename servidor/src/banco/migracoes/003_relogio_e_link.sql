-- Horário real de cada inserção. now() é o início da transação: dois eventos
-- da mesma requisição empatariam e a linha do tempo perderia a ordem.
alter table eventos alter column em set default clock_timestamp();
alter table comunicacoes alter column em set default clock_timestamp();
alter table encaminhamentos alter column em set default clock_timestamp();
alter table auditoria alter column em set default clock_timestamp();

-- Link de ciência em texto, só para ambientes de demonstração, onde a tela
-- mostra o link em vez de enviá-lo à família. Em produção fica nulo: o link
-- segue por e-mail e o banco guarda só o hash do token.
alter table comunicacoes add column link_ciencia text;

-- Tipos de ocorrência sensíveis (proteção, discriminação): o caso já nasce com prioridade alta.
alter table categorias add column sensivel boolean not null default false;
