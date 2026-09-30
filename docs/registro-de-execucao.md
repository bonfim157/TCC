# Registro de execução

O que foi construído em cada fase e como foi verificado. As verificações foram feitas num navegador real (Chromium via Playwright), com os scripts em `front/scripts/verificacao/`.

## F1 · Fundação e multi-rede (28/09/2026)

**Construído**

- Projeto `front/` com React, TypeScript, Vite e API simulada (MSW)
- Contrato de dados em `front/src/api/contract.ts`; cabeçalhos `X-Rede-Id` e `X-Escola-Id` em toda chamada
- Design system: 20 componentes, tokens de cor por rede, tipografia Source Serif 4 e Source Sans 3 servida localmente
- Cabeçalho em forma de timbre de ofício, com brasão e nome da secretaria da rede ativa
- Barra de contexto com rede, escola e perfil de demonstração; guarda de alterações não enviadas
- Telas: entrar, início provisório, guia da interface (`/guia`), sem permissão, erro, página não encontrada, faixa de sem conexão
- Menu recolhível no celular (a barra inferior não cabia com texto em 130%)

**Verificado**

- `npm run contrast`: todos os pares de cor atendem WCAG AA nas duas redes, nos modos claro e escuro
- Troca de perfil muda o menu; professor recebe "sem permissão" na Central
- Registro de outra rede devolve 403 do servidor simulado, mesmo com o identificador certo
- Diálogo de troca de rede com rascunho: foco no botão seguro, Esc cancela
- Sessão sobrevive a recarregar a página
- Sem rolagem lateral em 360px e 1280px, com texto em 100% e 130%

**Corrigido durante a verificação**: painel "Aparência" aberto por padrão; queda da sessão ao recarregar; Esc no menu perdia o foco; troca de rede na tela de entrada derrubava a página; timbre não seguia a rede escolhida no login.

## F2 · Registrar e acompanhar (28/09/2026)

**Construído**

- Dados de demonstração com a IMSIL (rede estadual SP, Unidade Regional de Limeira); pessoas e casos fictícios
- Início com ação principal, situação da escola, prazos próximos e registros recentes
- Registro em 3 passos (o fato, envolvidos, revisão), rascunho salvo no aparelho a cada alteração
- Orientações no próprio formulário: risco imediato (190, 192, 193) e casos de proteção (Conselho Tutelar)
- Envolvidos com papel e visibilidade; anexos com justificativa obrigatória
- Revisão com aviso de possível duplicata e confirmação de relato factual
- Meus registros e detalhe do caso com linha do tempo e adendos

**Verificado**

- Resumo de erros com links para cada campo, com foco levado ao resumo
- Rascunho mantido após recarregar a página; envio bloqueado sem conexão
- Revisão mostra exatamente o que foi preenchido; aviso de duplicata aparece para a mesma data e tipo
- Protocolo gerado; adendo aparece na linha do tempo
- Professora não abre caso de outra pessoa; coordenação vê "Pessoa com visibilidade restrita" onde a direção vê o nome

## F3 · Central de Gestão (28/09/2026)

**Construído**

- Central (`/central`): indicadores que filtram a fila, fila por prioridade e pendências, caso aberto, providências, agenda
- Providências geradas pelo protocolo da rede (`front/src/mocks/protocolo.ts`), com base legal em cada item
- Triagem com tipo, prioridade e responsável; escuta e reavaliação; encaminhamentos com devolutiva; plano de apoio
- Comunicação à família a partir de modelo, com bloqueio quando o texto cita outro estudante
- Ofício ao Conselho Tutelar a partir de modelo, que já cria o encaminhamento com prazo de devolutiva
- Página pública de ciência da família (`/ciencia/:token`)
- Encerramento só com providências obrigatórias resolvidas e justificativa

**Verificado**

- Indicadores e filtro "a comunicar ao Conselho Tutelar"
- Ofício ao Conselho Tutelar remove o alerta do caso na fila
- Envio à família bloqueado quando o texto cita outro estudante
- Devolutiva atrasada aparece e some ao registrar a devolutiva
- Dispensar providência exige justificativa
- Família confirma a ciência pelo link, sem login, num celular
- Professora recebe "sem permissão" na Central; sem rolagem lateral em 360px

**Corrigido durante a verificação**: agenda mostrava ações do plano de casos encerrados.

## F4 · Gestão e administração (28/09/2026)

**Construído**

- Busca (`/buscar`) com filtros por período, tipo, situação, prioridade e texto; a regional vê o resumo sem abrir casos
- Relatórios (`/relatorios`) por tipo, mês e situação, com grupos de menos de 3 casos suprimidos; atalho para o relatório bimestral de bullying (Lei 13.185); exportação de planilha só com motivo
- Administração (`/administracao`) em abas: protocolo da rede, tipos de ocorrência e modelos (secretaria); contatos locais e pessoas (direção); usuários; matriz de permissões (consulta); auditoria
- Auditoria no servidor simulado: entradas, consultas, criações, alterações, buscas, exportações e acessos negados
- Contatos da escola usados automaticamente nos encaminhamentos e ofícios da Central
- Histórico fictício de 64 casos encerrados (fevereiro a agosto de 2026) para dar volume aos relatórios
- Dados da demonstração guardados no navegador e compartilhados entre abas (o link da família aberto em outra aba funciona); botão "Restaurar dados de demonstração" no Guia
- Abas passam a carregar só quando abertas

**Verificado** (`scripts/verificacao/f4-gestao.mjs`)

- Coordenação encontra 68 casos; filtro por bullying traz 10
- Regional vê 68 resultados sem nenhum link para abrir caso; relatório da Unidade Regional com 5 grupos suprimidos
- Exportação sem motivo é recusada; com motivo, gera o CSV e aparece na auditoria da secretaria
- Secretaria altera uma providência do protocolo; direção vê o protocolo só para leitura, salva contatos e cadastra pessoa
- Encaminhamento na Central usa o contato salvo pela direção
- Professora recebe "sem permissão" na busca; sem rolagem lateral em 360px nas três telas

**Corrigido durante a verificação**: legenda oculta de tabelas escapava do quadro de rolagem e criava rolagem lateral no celular; contorno de foco aparecia em volta do conteúdo principal; rascunho não era restaurado ao recarregar quando a lista de escolas demorava (o formulário agora espera a escola).

## F5 · Validação e entrega (parte técnica) e fechamento do front, 29/09/2026

**Construído**

- Auditoria automática de acessibilidade (`scripts/verificacao/f5-acessibilidade.mjs`, axe-core, regras WCAG 2.0 e 2.1 A e AA): professora, coordenação, direção, secretaria e família; todas as abas da administração e do caso; diálogo de encerramento com ações do plano em aberto; formulário com erros; relatório da regional com duas escolas na rede de testes; temas claro e escuro; 360 e 1440px
- Central se atualiza sozinha (pendência 22): consulta a cada 30 s com a aba visível, ao voltar à aba e, na demonstração, quando outra aba grava dados. Diálogos abertos não fecham. Consultas repetidas ao mesmo caso contam uma vez a cada 15 minutos na auditoria
- Encerramento com ações do plano em aberto (pendência 23): o diálogo lista as ações e exige marcar o cancelamento; sem isso, 409. As ações ficam "Canceladas no encerramento" e o cancelamento entra na linha do tempo
- Regional com várias escolas (pendência 26): segunda escola fictícia e diretora regional na rede de testes, com histórico nas duas; o relatório ganhou "Casos por escola" (também no CSV). A chave do banco da demonstração passou a `demo.banco.v7`
- Comunicação à família: a API simulada também recusa texto que cite outro estudante do caso, inclusive nomes restritos que a tela não conhece, e audita a recusa
- Contrato para o backend (`docs/contrato-para-o-backend.md`), tirado do código
- Limpeza: `EmConstrucao` e o campo `fase` removidos; a nota do Início sobre "relatórios na F4" virou link

**Verificado** (`npm run build`, `npm run contrast` e `npm run verificar`, todos passando)

- Acessibilidade: 45 verificações em cada uma das 4 combinações de tema e largura (180 no total; a tela de entrada e a primeira aba de cada tela com abas se repetem), nenhuma violação. O único item inconclusivo é contraste de texto sobre elementos sobrepostos, coberto pelo `npm run contrast`. Antes de confiar no resultado, conferimos que o axe acusa um campo sem rótulo e um texto sem contraste inseridos de propósito
- Atualização: Beatriz conclui a triagem do 484; na aba de Carlos, sem recarregar e pelo aviso imediato entre abas, a fila passa de "Recebido, sem responsável" para "Em acompanhamento, com Carlos Mendes", o caso aberto muda e o diálogo que ele tinha aberto continua aberto; a auditoria tem uma só consulta dele ao caso. Numa terceira aba em que o aviso entre abas foi desligado de propósito, a mudança não aparece em 1,5 s e aparece pela consulta periódica, como será com o backend real
- O servidor recusa (422) a comunicação à família de Gabriel que cita Lara e aceita (201) o texto só sobre Gabriel
- Encerrar o 482 sem confirmar: "Há 2 ações do plano de apoio em aberto…"; confirmando, o caso é encerrado e as duas ações aparecem como canceladas
- Regional fictícia: 23 casos das duas escolas, nenhum da IMSIL, nenhum link para abrir caso, barras por escola com 14 e 9; a regional de SP continua só com a IMSIL e sem quebra por escola
- F1 a F4 sem regressão

**Registrado para depois**: supressão complementar nos relatórios (pendência 31); consulta à auditoria contada uma vez a cada 15 minutos, a validar com o encarregado de dados

## Back-end B0 (parte local) e B1 · Fundação do servidor, 29/09/2026

**Construído**

- Repositório em workspaces: `front/`, `servidor/`, `compartilhado/`. Contrato, dados fictícios e protocolo passaram para `compartilhado/`; a API simulada e o seed do banco usam os mesmos arquivos
- `VITE_API=real` liga o front ao servidor (`/api` do mesmo domínio; em desenvolvimento, proxy para a porta 3000). No modo real a simulação não entra no pacote gerado (conferido no build)
- Faixa de demonstração no topo de todas as telas do modo simulado
- GitHub Actions (`.github/workflows/verificacao.yml`): build, contraste, testes do servidor e roteiros no navegador
- Banco: migrações `001_esquema.sql` (todas as tabelas do plano) e `002_seguranca.sql` (papel `app_tcc`, Row-Level Security forçada em toda tabela por rede, auditoria e linha do tempo só com inserção, cadeia de hashes na auditoria com trava por rede, funções para ciência e login que não expõem dados)
- Seed com os mesmos dados da demonstração; contador de protocolo parte do maior número de cada rede
- API (Hono): saúde, redes, login de demonstração (só com `TCC_LOGIN_DEMO=1` e fora de produção), escolas e categorias; contexto da requisição igual ao da simulação; recusas marcadas gravadas na auditoria mesmo quando a transação é desfeita
- Ponto de entrada da Vercel (`api/[[...rota]].ts`) e `vercel.json` (região `gru1`). Nada publicado ainda

**Verificado**

- Teste prévio do PGlite: papel sem dono, `FORCE ROW LEVEL SECURITY`, `set_config` local à transação e permissões funcionam como no Postgres
- `npm test`: 19 testes. Destaques: com a rede SP ativa, nenhuma linha da rede de testes aparece mesmo sem filtro na consulta (o protocolo 2026-000482 existe nas duas redes e só o da rede ativa volta); sem rede, nenhuma tabela mostra nada; a rede não vaza para a transação seguinte; gravar em outra rede é recusado pelo banco; auditoria e linha do tempo recusam alteração e exclusão; a aplicação não consegue ler o hash de senha; a auditoria encadeia os hashes; 401 sem sessão e com sessão vencida; 403 sem vínculo com a rede; 403 `rede_divergente` com escola de outra rede; regional fictícia alcança as duas escolas; login de demonstração some sem a variável e em produção
- Front em modo real contra o servidor local: `f1-regressao.mjs` passa (login real, troca de rede, tema, 130% sem rolagem lateral); o Início mostra a pessoa logada e as áreas ainda não construídas aparecem com o aviso de erro e "Tentar de novo"
- Modo simulado sem regressão: build, F1, F2 e acessibilidade (180 verificações, nenhuma violação) com a faixa de demonstração

**Ainda não feito**: publicar na Vercel (depende do login na conta e da decisão sobre o endereço público); rodar contra a Neon.

## Back-end B3, B4 e B5 · Todas as rotas no servidor real, 30/09/2026

**Construído**

- `servidor/src/casos.ts`: caso completo montado das tabelas e as regras de acesso (quem conduz, só os próprios, nomes com visibilidade restrita), iguais às da simulação
- B3 (`rotas/registro.ts`): pessoas, ocorrências (lista, criar, abrir), semelhantes, adendos, prazos. Protocolo por rede e ano com trava de linha; providências geradas das regras gravadas no banco
- B4 (`rotas/central.ts`): fila, agenda, equipe, modelos e todas as ações do caso; página pública de ciência
- B5 (`rotas/gestao.ts`): busca, relatórios, exportação, auditoria, administração da rede e da escola
- Migrações 003 (horário real em eventos e auditoria, link de ciência para demonstração, tipos sensíveis) e 004 (`tokens_ciencia`)
- `POST /api/diagnostico/restaurar` (fora de produção): os roteiros do front chamam antes de cada rodada
- Esquemas Zod de todos os pedidos em `compartilhado/src/esquemas.ts`; nomes das situações em um só lugar (`nomeStatus`)

**Encontrado e corrigido**

- O banco local usava superusuário, que ignora a Row-Level Security. Com um dono comum, como o da Neon, apareceram dois erros que só surgiriam em produção: o seed gravava sem informar a rede, e a função que achava a rede pelo token de ciência não devolvia nada. Corrigidos; o banco local passou a usar sempre o dono comum
- Horário dos eventos: `now()` é o início da transação, e dois eventos da mesma requisição empatavam. Passou a `clock_timestamp()`

**Verificado**

- `npm test`: 83 testes em 4 arquivos (isolamento, registro, Central, gestão)
- Roteiros do front em modo real (`VITE_API=real`), com saída igual à da simulação: `f2-registro` duas vezes seguidas com resultado idêntico (protocolo 2026-000485, rascunho, duplicata, adendo, nomes restritos); `f3-central` (ofício ao CT, vazamento bloqueado, encerramento com ações canceladas, devolutiva, ciência); `f4-gestao` (68 casos, 10 de bullying, 5 grupos suprimidos, exportação auditada, protocolo editado pela secretaria, contato da direção usado no encaminhamento); `f4-regional` (23 casos, 14 e 9 por escola, nada da rede SP)
- `f3-atualizacao` em modo real: sem o aviso entre abas (que só existe na demonstração), a fila se atualiza pela consulta de 30 s

**Correção sobre a B1**: o registro da B1 dizia que a aplicação conectava com um usuário que não é dono das tabelas. Não era exato: a conexão era a do dono, e a troca para o papel restrito só acontecia dentro de cada transação. Em 30/09/2026 isso foi corrigido: a API conecta como o papel restrito, e só migrações e seed usam o dono. Novos testes consultam direto na conexão da aplicação, fora de qualquer transação com rede, e confirmam: nenhuma linha por rede aparece; excluir ou alterar a auditoria, ler hash de senha, `truncate`, `alter table` e `drop table` são recusados; o papel da conexão é `app_tcc`. Total: 83 testes.

**Diferenças do servidor em relação à simulação** (registradas no contrato): caso de outra rede responde 404; ciência só é confirmada uma vez; responsável da triagem precisa conduzir casos na escola.

**Não feito nestas fases**: envio real de anexos, e-mail às famílias e cadastro de responsáveis, consulta leve de mudanças, supressão complementar, login real (B2).

## Back-end B2 · Login e acesso, 30/09/2026

**Construído**

- Migrações 005 (segundo fator, tentativas de login, sessão pendente) e 006 (senha temporária)
- `servidor/src/senha.ts` (Argon2id), `totp.ts` (RFC 6238), `cifra.ts` (AES-256-GCM para o segredo do segundo fator), `rotas/acesso.ts` (entrar, segundo fator, sessão, trocar senha, sair)
- `servidor/src/administrar.ts` e `cli.ts`: migrar, carga inicial de uma rede real sem dados fictícios, criar conta com senha temporária
- Front: tela de login por senha em três etapas (credenciais, código ou cadastro do segundo fator, troca da senha temporária), sessão recuperada pelo cookie ao abrir outra aba, aviso de sessão expirada, seletor "ver como" só em ambiente de demonstração
- Pedidos com corpo precisam declarar JSON, o que impede envio por formulário de outro site

**Verificado**

- `npm test`: 118 testes em 6 arquivos. Dos novos: senha errada e e-mail inexistente dão a mesma resposta; bloqueio após 5 erros e liberação depois de 15 minutos; só a senha não dá acesso a nada para perfis de gestão; código errado recusado e auditado; primeiro acesso cadastra o segundo fator; segredo cifrado e alcançável só pela própria pessoa; sair apaga a sessão; trocar a senha encerra as outras sessões; **tabela de 8 perfis contra 13 rotas de leitura e 4 ações de escrita**, e nenhuma rota de dados responde sem sessão
- Caminho de produção: com o banco só com migrações, a carga inicial cria a rede SP e a IMSIL sem pessoas nem casos; a conta da direção criada por comando entra com senha temporária, cadastra o segundo fator, troca a senha e registra o caso 000001
- O vetor de teste oficial do TOTP (RFC 6238) confere
- `f6-login.mjs` no navegador: erros do formulário, senha errada, professora entra, **nenhum token guardado no navegador**, cookie `HttpOnly` que a página não lê, outra aba recupera a sessão, sessão vencida leva ao login com aviso, coordenação só entra com o código, sair apaga o cookie, cadastro do segundo fator em 360px sem rolagem lateral, troca da senha temporária; acessibilidade das telas de login sem violações
- Roteiros F1 a F5 em modo real continuam passando (180 verificações de acessibilidade sem violação)

**Limitações conhecidas**: sem recuperação de senha por e-mail; sem QR code; a obrigação de trocar a senha temporária é da tela, não do servidor; o mesmo código do segundo fator pode ser reutilizado dentro dos seus 30 segundos.

## Publicação na Vercel, 30/09/2026

- Projeto `cuidar-registrar` criado e ligado à pasta do repositório; região das funções `gru1`
- A construção local com `vercel build` mostrou que a Vercel compila a API arquivo por arquivo e que os imports entre módulos falhariam. A API passou a ser empacotada num só arquivo durante o build, com uma função única e reescrita de `/api/*`
- Produção publicada em https://cuidar-registrar.vercel.app, com a API simulada. Conferido no navegador: a faixa de demonstração aparece, o login de demonstração entra, a Central abre por endereço direto com 4 casos na fila, e a função responde em `/api/ambiente` com `loginDemo: false` (produção não tem login de demonstração)
- Banco Neon: pedido feito pela integração da Vercel (região São Paulo, plano gratuito, só para preview); aguardando o aceite dos termos no navegador

## Situação da última rodada de verificação

29/09/2026: `npm run build`, `npm run contrast` e `npm run verificar` completo (F1, F2, F3, atualização, F4, regional e acessibilidade) passaram. O front está completo; o que falta é validação com pessoas, decisões da gestão e backend (ver Pendências).
