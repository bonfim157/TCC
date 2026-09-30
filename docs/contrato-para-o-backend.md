# Contrato do front para a equipe de backend

Documento de entrega da fase F5. Descreve o que o front espera do servidor: rotas, cabeçalhos, formatos, erros e regras de acesso. A API simulada (MSW, em `front/src/mocks/`) implementa tudo isto e serve de referência executável: o backend pode rodar o front apontando para ele e comparar o comportamento com a demonstração.

Fonte da verdade dos tipos: [`compartilhado/src/contrato.ts`](../compartilhado/src/contrato.ts) (o front reexporta em `front/src/api/contract.ts`). Este documento cita os tipos pelo nome em vez de copiá-los, para não haver duas versões. Tudo o que está aqui vem do código em 29/09/2026; ao mudar o contrato, mude o arquivo de tipos e a API simulada juntos.

Situação: **implementado no servidor** (`servidor/src/`) em 30/09/2026, com os roteiros do front passando contra ele. As diferenças em relação à simulação estão marcadas nas tabelas.

## Convenções

- JSON em UTF-8 nos dois sentidos; datas em ISO 8601 (`2026-09-28T10:15:00-03:00`); dias sem hora como `AAAA-MM-DD`.
- Identificadores são texto. O protocolo do caso (`2026-000482`) é único dentro da rede, não entre redes: duas redes podem ter o mesmo número.
- Criação responde 201 com o recurso criado; ações sobre o caso respondem 200 com o caso inteiro atualizado (`Ocorrencia`), já filtrado para quem pediu.
- Nenhuma rota devolve dado que o perfil não pode ver. O front esconde menus por perfil, mas isso é só apresentação; a decisão é do servidor.

## Cabeçalhos em toda chamada autenticada

| Cabeçalho | Conteúdo | Se faltar ou não servir |
| --- | --- | --- |
| `Authorization` | `Bearer <token>` da sessão | 401 `nao_autenticado` |
| `X-Rede-Id` | Rede ativa (o tenant) | 403 `sem_permissao` se a pessoa não tem vínculo com a rede |
| `X-Escola-Id` | Escola ativa, quando o perfil é de escola | 403 `rede_divergente` se a escola é de outra rede; 403 `sem_permissao` se o vínculo não inclui a escola |

O servidor resolve o contexto (pessoa, vínculo com a rede, escola) a partir desses três valores antes de qualquer regra. Na simulação isso é a função `contexto()` em `mocks/base.ts`.

## Erros

Todo erro responde com `ApiErro`: `{ codigo, mensagem }`. A `mensagem` é mostrada à pessoa como está, então precisa ser em português claro e dizer o que fazer.

| Status | `codigo` | Quando |
| --- | --- | --- |
| 401 | `nao_autenticado` | Token ausente, inválido ou expirado. O front volta para a tela de entrada |
| 403 | `sem_permissao` | Perfil sem acesso à rota ou ao recurso |
| 403 | `rede_divergente` | Recurso ou escola de outra rede |
| 404 | `nao_encontrado` | Recurso inexistente **ou de outra rede**. O servidor real responde 404 a um caso de outra rede, porque o banco nem mostra a linha (a simulação respondia 403 `rede_divergente`) |
| 409 | `conflito` | Ação impossível no estado atual: caso encerrado, providências obrigatórias pendentes no encerramento |
| 422 | `validacao` | Dado inválido; a mensagem diz qual campo corrigir |
| 500 | `erro_interno` | Falha do servidor. O front oferece tentar de novo e não perde o que foi digitado |

Falha de rede (sem resposta) é tratada pelo front como "sem conexão" e não precisa de formato.

## Rotas

Caminhos em `rotas` no arquivo de contrato. "Conduz" = coordenação, direção ou referente de proteção. "Alcance" = escolas do vínculo (lista de escolas, a regional inteira ou a rede toda).

### Sessão, rede e cadastros

| Método e caminho | Quem | Envia | Recebe | Observações |
| --- | --- | --- | --- | --- |
| `GET /api/redes` | Público | | `Rede[]` | Nome, secretaria e sigla para o timbre. A cor não vem do servidor: o front associa cada rede ao seu tema em `front/src/design/themes.ts` |
| `GET /api/redes/:redeId/usuarios-demo` | Público | | `Usuario[]` | **Só da demonstração.** Some com o login institucional (pendência 16) |
| `POST /api/sessoes` | Público | `NovaSessao` | `Sessao` | Na produção, troca pelo login da rede com MFA para gestão. Audita `login` |
| `GET /api/escolas` | Todos | | `Escola[]` | Só as escolas do alcance |
| `GET /api/categorias` | Todos | | `Categoria[]` | Tipos de ocorrência da rede |
| `GET /api/pessoas?busca=` | Quem tem vínculo com a escola ativa* | | `Pessoa[]` | Estudantes e profissionais da escola ativa, para escolher envolvidos; até 8 resultados |
| `GET /api/equipe` | Todos da rede* | | `PessoaDaEquipe[]` | Quem conduz casos na escola ativa, para escolher o responsável na triagem |
| `GET /api/modelos` | Todos da rede* | | `ModeloDeComunicacao[]` | Modelos de comunicação da rede |

\* A simulação não restringe estas três rotas por perfil. Recomendação para o servidor real: `/api/pessoas` só para quem registra ou conduz; `/api/equipe` e `/api/modelos` só para quem conduz.

### Registro e acompanhamento

| Método e caminho | Quem | Envia | Recebe | Observações |
| --- | --- | --- | --- | --- |
| `GET /api/ocorrencias` | Todos de escola | | `OcorrenciaResumo[]` | Professor e apoio recebem só os próprios; quem conduz, os da escola; administração técnica, lista vazia |
| `GET /api/ocorrencias-semelhantes?data=&categoriaId=` | Quem registra | | `OcorrenciaSemelhante[]` | Aviso de possível duplicata antes de enviar |
| `POST /api/ocorrencias` | Quem registra | `NovaOcorrencia` | `Ocorrencia` (201) | Escola do corpo = `X-Escola-Id`; relato ≥ 20 caracteres; gera protocolo e providências pelo protocolo da rede. Audita `criacao` |
| `GET /api/ocorrencias/:id` | Autor ou quem conduz | | `Ocorrencia` | Filtrado: nomes com visibilidade restrita chegam como "Pessoa com visibilidade restrita"; quem só registrou não recebe providências, encaminhamentos nem comunicações. Audita `consulta` e cada negação. A consulta da mesma pessoa ao mesmo caso conta uma vez a cada 15 min, porque a tela recarrega o caso sozinha (decisão a validar com o encarregado de dados) |
| `POST /api/ocorrencias/:id/adendos` | Autor ou quem conduz | `NovoAdendo` | `Ocorrencia` (201) | Correção nunca edita o relato; vira adendo. Texto ≥ 10 |
| `GET /api/prazos` | Todos de escola | | `PrazoProximo[]` | Ações do plano com prazo próximo, para o Início |

### Central de Gestão (quem conduz)

Todas as ações abaixo exigem que a pessoa conduza casos na escola do caso e respondem 409 se o caso estiver encerrado. Cada uma acrescenta um evento à linha do tempo e é auditada como `alteracao`.

| Método e caminho | Envia | Observações |
| --- | --- | --- |
| `GET /api/central/fila` | | `ItemDaFila[]` da escola ativa, com sinais: Conselho Tutelar pendente, devolutivas atrasadas, obrigatórias pendentes |
| `GET /api/central/agenda` | | `ItemDaAgenda[]`: prazos do plano, devolutivas esperadas e reavaliações. Caso encerrado só aparece pela data de reavaliação |
| `POST .../:id/triagem` | `PedidoTriagem` | Define prioridade, responsável e tipo; o caso passa a "Em acompanhamento". O responsável precisa conduzir casos na escola do caso. Mudar o tipo troca as providências pendentes e mantém as já feitas |
| `POST .../:id/providencias/:pid` | `PedidoProvidencia` | Dispensar exige observação ≥ 15 caracteres |
| `POST .../:id/encaminhamentos` | `PedidoEncaminhamento` | Exige a data de devolutiva esperada. Encaminhar ao Conselho Tutelar cumpre a providência correspondente |
| `POST .../:id/encaminhamentos/:eid/devolutiva` | `PedidoDevolutiva` | Texto ≥ 10 |
| `POST .../:id/registros` | `PedidoRegistroEscola` | Escuta ou reavaliação; texto ≥ 15 |
| `POST .../:id/plano` | `PedidoAcaoPlano` | Ação, responsável e prazo obrigatórios |
| `POST .../:id/plano/:aid/concluir` | | |
| `POST .../:id/comunicacoes` | `PedidoComunicacao` | À família: gera link de ciência. Ao Conselho Tutelar: cria também o encaminhamento, com devolutiva esperada em 10 dias. Texto ≥ 30. À família, envie `estudanteId`: o servidor recusa (422) texto que cite outro estudante do caso, inclusive os de visibilidade restrita que a tela não conhece, e audita a recusa |
| `POST .../:id/registro-rede` | `PedidoRegistroRede` | Código do caso no sistema da rede (Conviva SP); ≥ 3 caracteres |
| `POST .../:id/encerrar` | `PedidoEncerramento` | Só coordenação ou direção. 409 se houver providência obrigatória pendente; justificativa ≥ 20 |

### Página pública de ciência (família)

| Método e caminho | Envia | Recebe | Observações |
| --- | --- | --- | --- |
| `GET /api/ciencia/:token` | | `CienciaPublica` | Sem login. Só o texto enviado à família, sem nomes de terceiros. 404 com orientação se o link não vale |
| `POST /api/ciencia/:token` | `{ nome }` | `{ ok: true }` | Registra quem confirmou e quando; a segunda confirmação responde 409. No servidor real o token tem 256 bits aleatórios, só o hash fica no banco e o link vale 30 dias. `linkCiencia` só vem preenchido em ambientes de demonstração; em produção o link segue por e-mail (pendência 20) |

### Busca, relatórios e auditoria

| Método e caminho | Quem | Envia | Recebe | Observações |
| --- | --- | --- | --- | --- |
| `GET /api/busca?…` | Conduz, regional | `FiltrosDeBusca` na query | `ResultadoDeBusca[]` | Até 200 resultados no alcance. `podeAbrir` diz se a pessoa pode abrir o caso; a regional recebe falso em todos. Audita `busca` |
| `GET /api/relatorios?de=&ate=&escolaId=&categoriaId=` | Direção, regional, secretaria | | `Relatorio` | Grupos com menos de 3 casos chegam com `total: null` (suprimidos). `porEscola` só vem preenchido quando o escopo tem mais de uma escola |
| `POST /api/exportacoes` | Direção, regional, secretaria | `PedidoExportacao` | `Exportacao` (201) | Motivo ≥ 20 caracteres, gravado na auditoria. O CSV repete a supressão |
| `GET /api/auditoria` | Direção, secretaria, adm. técnica | | `RegistroDeAuditoria[]` | Direção: pessoas da própria escola e acessos da família. Secretaria: a rede toda |

### Administração

| Método e caminho | Quem escreve | Envia | Observações |
| --- | --- | --- | --- |
| `GET /api/admin/regras` | (leitura: direção, secretaria, adm. técnica) | | `RegraDoProtocolo[]` da rede |
| `PUT /api/admin/regras/:id` | Secretaria, adm. técnica | parte de `RegraDoProtocolo` | Vale para todas as escolas da rede |
| `PUT /api/admin/categorias/:id` | Secretaria, adm. técnica | `{ ativa, nome? }` | Desativar não apaga casos antigos |
| `PUT /api/admin/modelos/:id` | Secretaria, adm. técnica | `{ texto }` | O texto precisa conter `{estudante}` |
| `GET` / `PUT /api/admin/contatos` | Direção | `ContatosLocais` | Contatos da rede de proteção da escola ativa; usados nos encaminhamentos |
| `GET` / `POST /api/admin/pessoas` | Direção | `PedidoNovaPessoa` | Estudante exige turma. Deve passar a vir da Secretaria Escolar Digital (pendência 21) |
| `GET /api/admin/usuarios` | (leitura) | | `UsuarioDaRede[]` |

Toda escrita na administração é auditada como `administracao`; toda recusa, como `negado`.

## Regras de acesso de referência

Implementadas em `front/src/mocks/base.ts` e `gestao.ts`. O servidor real deve aplicar as mesmas (pendência 15).

| Regra | Onde na simulação |
| --- | --- |
| Toda consulta filtra pela rede do vínculo; um recurso de outra rede nunca é devolvido | `contexto`, `podeAbrir` |
| Alcance: escolas listadas no vínculo; sem lista, a regional; sem regional, a rede inteira | `escolasDoVinculo` |
| Professor e apoio só abrem o que registraram | `soProprios`, `podeAbrir` |
| Coordenação, direção e referente de proteção abrem e conduzem os casos da escola | `conduzCasos`, `conduz` |
| Regional vê a lista da busca e os números; secretaria vê só os números; nenhuma das duas abre o caso | `podeAbrir`, `podeBuscar`, `podeRelatorio` |
| Visibilidade por pessoa envolvida: equipe do caso, coordenação e direção, ou só direção | `filtrarEnvolvidos` |
| Quem só registrou não vê providências, encaminhamentos nem comunicações | `paraQuemConsulta` |
| Caso encerrado não aceita ações (409) | `casoParaAgir` |
| Grupos de relatório abaixo de 3 casos são suprimidos, inclusive na exportação | `LIMITE_MINIMO` |

A matriz de menus por perfil (`front/src/state/perfis.ts`) deve bater com estas regras. Tornar a matriz editável (pendência 25) depende de o servidor ler as permissões de um cadastro, e não de regras fixas no código.

## Auditoria

`RegistroDeAuditoria`: quando, quem (nome e perfil), rede, ação, recurso, resultado (`permitido` ou `negado`) e detalhe. Ações: `login`, `consulta`, `criacao`, `alteracao`, `busca`, `exportacao`, `administracao`, `negado`. A auditoria não pode ser alterada nem apagada pela interface.

## O que a simulação faz e o servidor real não deve copiar

- Token de demonstração com o id da pessoa dentro (`demo-u-ana-…`), para a sessão sobreviver ao recarregar.
- Dados guardados no navegador (`localStorage`, chave `demo.banco.v7`) e compartilhados entre abas.
- Anexos: só o nome e o tamanho são guardados (pendência 18).
- Link de ciência exibido na tela para a demonstração, em vez de enviado à família (pendência 20).
- Atraso artificial de 150 a 500 ms em cada resposta.
- `GET /api/diagnostico/falha`, que responde 500 de propósito para mostrar a tela de erro no Guia.

No servidor real, o login de demonstração (`/api/redes/:id/usuarios-demo`, `POST /api/sessoes` com `usuarioId`), `POST /api/diagnostico/restaurar` (volta o banco ao seed) e `/api/diagnostico/falha` só respondem com `TCC_LOGIN_DEMO=1` e fora de produção.

## Atualização da fila

A Central recarrega fila, agenda e caso aberto a cada 30 segundos com a aba visível e ao voltar para a aba (`front/src/state/useAtualizacao.ts`). O servidor não precisa de nada além das rotas acima. Se no futuro houver notificação em tempo real (SSE ou WebSocket), basta avançar o mesmo contador quando chegar um aviso.
