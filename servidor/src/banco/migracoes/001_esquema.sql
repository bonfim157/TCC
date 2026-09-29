-- Esquema do banco. Ids são texto: o seed usa os mesmos ids da demonstração
-- (oc-sp-482, esc-imsil...), e os roteiros do front dependem deles.
-- Itens de um caso (eventos, providências, ações...) têm chave (caso, id): o id
-- da providência é o da regra do protocolo e se repete entre casos.
-- Toda tabela com dados de escola tem rede_id; o isolamento está em 002_seguranca.sql.

create table redes (
  id          text primary key,
  nome        text not null,
  secretaria  text not null,
  municipio   text not null,
  uf          text not null,
  esfera      text not null check (esfera in ('municipal', 'estadual')),
  sigla       text not null,
  subdominio  text not null unique
);

create table regionais (
  id       text primary key,
  rede_id  text not null references redes(id),
  nome     text not null
);

create table escolas (
  id           text primary key,
  rede_id      text not null references redes(id),
  regional_id  text not null references regionais(id),
  nome         text not null,
  sigla        text,
  municipio    text not null,
  bairro       text not null
);

-- Pessoa que usa o sistema. Uma pessoa pode ter vínculo com mais de uma rede.
create table usuarios (
  id          text primary key default gen_random_uuid()::text,
  nome        text not null,
  email       text unique,
  senha_hash  text
);

create table vinculos (
  id           text primary key default gen_random_uuid()::text,
  usuario_id   text not null references usuarios(id),
  rede_id      text not null references redes(id),
  perfil       text not null check (perfil in ('professor', 'apoio', 'coordenacao', 'direcao', 'referente_protecao', 'diretoria_regional', 'secretaria', 'admin_tecnico')),
  regional_id  text references regionais(id),
  unique (usuario_id, rede_id)
);

create table vinculo_escolas (
  vinculo_id  text not null references vinculos(id) on delete cascade,
  rede_id     text not null references redes(id),
  escola_id   text not null references escolas(id),
  primary key (vinculo_id, escola_id)
);

-- O token nunca é guardado: só o hash SHA-256.
create table sessoes (
  token_hash  text primary key,
  usuario_id  text not null references usuarios(id),
  criada_em   timestamptz not null default now(),
  expira_em   timestamptz not null
);

create table categorias (
  id       text primary key,
  rede_id  text not null references redes(id),
  nome     text not null,
  ativa    boolean not null default true,
  ordem    int not null default 0
);

create table regras_protocolo (
  id                text primary key,
  rede_id           text not null references redes(id),
  categoria_ids     text[],               -- null = todas as categorias
  somente_com_risco boolean not null default false,
  descricao         text not null,
  base              text not null,
  obrigatoria       boolean not null,
  ordem             int not null default 0
);

create table modelos_comunicacao (
  id       text primary key,
  rede_id  text not null references redes(id),
  tipo     text not null check (tipo in ('familia', 'conselho_tutelar')),
  nome     text not null,
  texto    text not null
);

create table contatos_locais (
  escola_id         text primary key references escolas(id),
  rede_id           text not null references redes(id),
  conselho_tutelar  text not null default '',
  cras              text not null default '',
  creas             text not null default '',
  delegacia         text not null default '',
  saude             text not null default ''
);

create table pessoas (
  id         text primary key default gen_random_uuid()::text,
  rede_id    text not null references redes(id),
  escola_id  text not null references escolas(id),
  nome       text not null,
  tipo       text not null check (tipo in ('estudante', 'profissional', 'familiar', 'outro')),
  turma      text
);

-- Responsável por um estudante, para a comunicação à família (B4).
create table responsaveis (
  id                    text primary key default gen_random_uuid()::text,
  rede_id               text not null references redes(id),
  estudante_id          text not null references pessoas(id),
  nome                  text not null,
  parentesco            text not null default '',
  email                 text,
  telefone              text,
  consentiu_contato_em  timestamptz
);

create table ocorrencias (
  id                     text primary key default gen_random_uuid()::text,
  rede_id                text not null references redes(id),
  escola_id              text not null references escolas(id),
  protocolo              text not null,
  categoria_id           text not null references categorias(id),
  status                 text not null check (status in ('rascunho', 'recebido', 'em_triagem', 'em_acompanhamento', 'encerrado', 'duplicado', 'cancelado', 'encaminhado_rede')),
  prioridade             text not null check (prioridade in ('urgente', 'alta', 'media', 'baixa')),
  aberta_em              timestamptz not null default now(),
  local                  text not null,
  criado_por_id          text not null,
  criado_por_nome        text not null,
  registro_na_rede       text,
  responsavel_id         text,
  responsavel_nome       text,
  fato_data              date not null,
  fato_hora              text not null,
  relato                 text not null,
  risco_imediato         boolean not null,
  providencia_imediata   text not null default '',
  encerrado_em           timestamptz,
  encerrado_por          text,
  justificativa_encerramento text,
  reavaliar_em           date,
  unique (rede_id, protocolo)
);
create index ocorrencias_escola on ocorrencias (rede_id, escola_id, aberta_em desc);

create table envolvimentos (
  ocorrencia_id  text not null references ocorrencias(id),
  rede_id        text not null references redes(id),
  pessoa_id      text not null,
  nome           text not null,
  tipo           text not null,
  turma          text,
  papel          text not null check (papel in ('envolvido_direto', 'afetado', 'testemunha')),
  visibilidade   text not null check (visibilidade in ('equipe_do_caso', 'coordenacao_direcao', 'somente_direcao')),
  ordem          int not null default 0,
  primary key (ocorrencia_id, pessoa_id)
);

create table anexos (
  id             text not null default gen_random_uuid()::text,
  rede_id        text not null references redes(id),
  ocorrencia_id  text not null references ocorrencias(id),
  nome           text not null,
  tamanho_kb     int not null,
  justificativa  text not null default '',
  caminho_blob   text,                 -- preenchido quando o arquivo real existir (B3)
  primary key (ocorrencia_id, id)
);

-- Linha do tempo: só recebe inserções (ver 002_seguranca.sql).
create table eventos (
  id             text not null default gen_random_uuid()::text,
  rede_id        text not null references redes(id),
  ocorrencia_id  text not null references ocorrencias(id),
  tipo           text not null,
  autor_nome     text not null,
  autor_perfil   text not null,
  em             timestamptz not null default now(),
  texto          text not null,
  primary key (ocorrencia_id, id)
);
create index eventos_caso on eventos (ocorrencia_id, em);

create table providencias (
  id              text not null default gen_random_uuid()::text,
  rede_id         text not null references redes(id),
  ocorrencia_id   text not null references ocorrencias(id),
  descricao       text not null,
  base            text not null,
  obrigatoria     boolean not null,
  situacao        text not null check (situacao in ('pendente', 'feita', 'dispensada')),
  registrada_por  text,
  registrada_em   timestamptz,
  observacao      text,
  ordem           int not null default 0,
  primary key (ocorrencia_id, id)
);

create table encaminhamentos (
  id                 text not null default gen_random_uuid()::text,
  rede_id            text not null references redes(id),
  ocorrencia_id      text not null references ocorrencias(id),
  orgao              text not null,
  orgao_nome         text not null,
  canal              text not null,
  em                 timestamptz not null default now(),
  protocolo_externo  text not null default '',
  devolutiva_ate     date not null,
  devolutiva_em      timestamptz,
  devolutiva_texto   text,
  registrado_por     text not null,
  primary key (ocorrencia_id, id)
);

create table acoes_plano (
  id             text not null default gen_random_uuid()::text,
  rede_id        text not null references redes(id),
  ocorrencia_id  text not null references ocorrencias(id),
  descricao      text not null,
  responsavel    text not null,
  prazo          date not null,
  situacao       text not null check (situacao in ('no_prazo', 'atrasada', 'concluida', 'cancelada')),
  ordem          int not null default 0,
  primary key (ocorrencia_id, id)
);

-- Comunicação: o token do link de ciência só existe como hash.
create table comunicacoes (
  id                text not null default gen_random_uuid()::text,
  rede_id           text not null references redes(id),
  ocorrencia_id     text not null references ocorrencias(id),
  tipo              text not null check (tipo in ('familia', 'conselho_tutelar')),
  destinatario      text not null,
  texto             text not null,
  em                timestamptz not null default now(),
  registrada_por    text not null,
  token_hash        text unique,
  token_expira_em   timestamptz,
  ciencia_em        timestamptz,
  ciencia_nome      text,
  primary key (ocorrencia_id, id)
);

-- Numeração do protocolo por rede e ano, com trava de linha.
create table contadores_protocolo (
  rede_id  text not null references redes(id),
  ano      int not null,
  ultimo   int not null,
  primary key (rede_id, ano)
);

-- Auditoria: só recebe inserções. Cada linha guarda o hash da anterior da mesma rede.
create table auditoria (
  id              bigint generated always as identity primary key,
  rede_id         text not null,
  em              timestamptz not null default now(),
  ator            text not null,
  perfil          text,
  acao            text not null,
  recurso         text not null,
  resultado       text not null check (resultado in ('permitido', 'negado')),
  detalhe         text,
  hash_anterior   text,
  hash            text not null
);
create index auditoria_rede on auditoria (rede_id, id desc);
