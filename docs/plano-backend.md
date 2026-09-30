# Plano do back-end, banco de dados e hospedagem

Criado em 29/09/2026, depois de o front ficar completo. Cobre tudo o que falta para o sistema funcionar de verdade: servidor, banco de dados, login, arquivos, envio de comunicações, hospedagem na Vercel, segurança, LGPD e o piloto na IMSIL.

Documentos relacionados:

- [Contrato para o backend](contrato-para-o-backend.md): rotas, erros e regras de acesso que o servidor precisa seguir. É a especificação deste plano
- [Plano de escopo do front](plano-de-escopo.md) e [Pendências](pendencias.md)
- A API simulada em `front/src/mocks/` é a referência executável: o servidor real deve se comportar igual a ela

## Situação atual e próximos passos (30/09/2026)

**Feito**

- B0, parte local: workspaces (`front`, `servidor`, `compartilhado`), modo real no front (`VITE_API=real`), faixa de demonstração, GitHub Actions rodando e passando a cada push
- B1: banco completo, papel da aplicação, Row-Level Security, auditoria só de inserção com cadeia de hashes, seed fictício, ponto de entrada da Vercel
- B3: registro e acompanhamento (pessoas, ocorrências, semelhantes, adendos, prazos)
- B4: Central de Gestão inteira e a página pública de ciência, com token guardado só como hash
- B5: busca, relatórios com supressão, exportação com motivo, auditoria e administração gravada no banco
- **Todas as rotas do contrato respondem pelo servidor real.** Os 7 roteiros do front passam em modo real, com o banco restaurado ao seed antes de cada um; 80 testes do servidor

**Falta, em ordem**

1. **B0, publicação**: fazer `vercel login` (digite `! npx vercel login` no Claude Code), criar o projeto na Vercel ligado ao repositório e decidir como publicar a demonstração (ver Decisões pendentes)
2. **B1, banco na nuvem**: criar o banco Neon em São Paulo pela Vercel Marketplace, definir `DATABASE_URL`, rodar migrações e seed num preview e repetir os testes contra a Neon. O banco local já usa um dono sem superusuário, como a Neon, o que reduz as surpresas
3. **B2, login e acesso** (3 semanas): senha com Argon2id, segundo fator (TOTP), sessão em cookie `HttpOnly`, telas de login no front, matriz de permissões vinda do banco e editável (pendência 25), tabela de testes perfil × rota. Hoje o servidor só tem o login de demonstração, que não existe em produção: **sem a B2 ninguém entra no ambiente de produção**
4. **O que ficou das fases B3 a B5**, tudo dependente de contas ou decisões:
   - envio real de anexos (Vercel Blob privado) e a tela de envio no front
   - cadastro de responsáveis e envio de e-mail às famílias (escolher o serviço de e-mail)
   - consulta leve de mudanças para a Central (hoje são 3 chamadas a cada 30 s por aba)
   - supressão complementar nos relatórios (pendência 31, decisão do encarregado de dados)
5. **B6 e B7**: tarefa diária, limites de requisição, cabeçalhos de segurança, revisão ASVS, homologação e piloto (ver Fases)

**Como retomar em outra máquina**

```bash
git clone https://github.com/bonfim157/TCC.git
cd TCC
npm install
npm test                       # testes do servidor (banco local, sem Docker)
npm run dev:servidor           # terminal 1: API em http://localhost:3000/api
VITE_API=real npm run dev      # terminal 2: front usando o servidor
npm run dev                    # ou: só a demonstração, com API simulada
```

Para os roteiros do navegador: `npx playwright install chromium` uma vez, e `npm run verificar` com o front rodando. Os roteiros funcionam nos dois modos: na simulação e contra o servidor real (eles restauram o banco ao seed antes de começar).

Cuidados anotados nesta etapa:

- O banco local (PGlite) atende uma conexão por vez; o servidor de desenvolvimento e os testes usam pool com uma conexão
- O banco local entra como o papel `dono_tcc`, sem superusuário, para a Row-Level Security valer também para o dono, como na Neon. Código que roda como dono (seed, migrações) precisa informar a rede (`set_config('app.rede_id', ...)`) antes de gravar em tabelas por rede
- Funções `security definer` não enxergam tabelas com `FORCE ROW LEVEL SECURITY` sem a rede informada; para achar a rede de um token de ciência existe a tabela `tokens_ciencia`
- No Windows, parar o `npm run dev` pelo Claude Code pode deixar o Vite rodando na porta 5173; rodar o Vite direto (`node ../node_modules/vite/bin/vite.js` dentro de `front/`) evita isso
- Novas migrações: arquivo `003_...sql` em `servidor/src/banco/migracoes/`; toda tabela nova com `rede_id` precisa entrar na lista de Row-Level Security de `002_seguranca.sql` (ou numa migração nova com as mesmas regras)

## Ponto de partida

O front está pronto e fala com uma API simulada no navegador. O servidor real precisa responder às mesmas rotas, com os mesmos formatos e as mesmas regras. Isso dá duas vantagens:

1. **A especificação já existe e já foi testada.** Cada rota, erro e regra de acesso está no contrato e foi verificada no navegador.
2. **Os testes já existem.** Os 7 roteiros de `npm run verificar` passam a rodar contra o servidor real. Se passarem, o servidor faz o que a demonstração fazia.

O trabalho do back-end é, portanto, **trocar a simulação por um servidor de verdade sem mudar a tela**.

## Arquitetura recomendada

| Camada | Escolha | Por quê |
| --- | --- | --- |
| Hospedagem | Vercel: front como site estático e API como Vercel Functions, no mesmo projeto e no mesmo domínio | Definição do usuário. Mesmo domínio dispensa CORS e permite cookie de sessão seguro |
| Região | São Paulo (`gru1`) para as funções; banco e arquivos também em São Paulo | Menor latência e dados de estudantes armazenados no Brasil. O plano Hobby permite escolher uma região |
| Linguagem do servidor | TypeScript, com Node | A mesma do front: os tipos do contrato passam a ser compartilhados, sem cópia |
| Framework da API | Hono | Leve, feito para funções serverless, roda na Vercel sem adaptação e é fácil de testar |
| Validação | Zod, com os esquemas em um pacote compartilhado (`compartilhado/`) usado pelo front e pelo servidor | Uma só definição de cada formato; o que o front envia é validado do mesmo jeito no servidor |
| Banco | PostgreSQL gerenciado pela Neon, na região AWS `sa-east-1` (São Paulo), contratado pela Vercel Marketplace | Postgres padrão, plano gratuito para o TCC, cria uma cópia do banco para cada versão de teste (preview) |
| Acesso ao banco | SQL direto com o driver `pg`, migrações em SQL versionadas no Git (`servidor/src/banco/migracoes/`) | Papéis, permissões e Row-Level Security são SQL de qualquer forma; menos uma dependência. Trocado pelo Drizzle em 29/09/2026, na B1 |
| Isolamento entre redes | Toda tabela tem `rede_id`; filtro obrigatório na aplicação e, por baixo, Row-Level Security do Postgres | Duas barreiras: um erro no código não expõe dados de outra rede |
| Arquivos (anexos) | Vercel Blob **privado**, região São Paulo, entregue só por função com checagem de acesso | Anexo nunca fica em link público; o servidor decide quem baixa |
| E-mail às famílias | Serviço transacional (Resend ou similar) com domínio próprio | Envio confiável e rastreável. O e-mail só leva o link, nunca o conteúdo do caso |
| Tarefas agendadas | Vercel Cron Jobs | Alertas de prazo e expiração de links. No Hobby, uma vez por dia |
| Banco local | PGlite (Postgres em WebAssembly) servido no protocolo padrão, sem Docker | O mesmo driver e o mesmo SQL da Neon; testes e desenvolvimento sem instalar nada. Atende uma conexão por vez |
| Testes | Vitest para regras e rotas; roteiros Playwright do front contra o servidor real; testes da matriz de acesso | O que já foi verificado na demonstração vira garantia do servidor |
| Integração contínua | GitHub Actions: build, testes e migrações a cada push; preview na Vercel a cada pull request | Nada entra no ar sem passar nos testes |

### Estrutura do repositório

```
tcc/
  front/          aplicação React
  api/            ponto de entrada das Vercel Functions ([[...rota]].ts)
  servidor/
    src/          API (app.ts), contexto da requisição, erros
      banco/      conexão, migrações SQL, seed, banco local
    testes/
  compartilhado/  contrato, esquemas Zod, protocolo e dados fictícios, usados pelo front e pelo servidor
  docs/
  vercel.json     build do front, região gru1, rotas
```

Um só projeto na Vercel, com a pasta raiz do repositório: o build gera o front estático e as funções em `api/`. Os pacotes são ligados por npm workspaces.

### Como o front muda

As telas de trabalho não mudam. O que muda é a entrada, a sessão e os anexos:

| Mudança no front | Onde | Fase |
| --- | --- | --- |
| Simulação ligada por variável: `VITE_API=simulada` (demonstração atual) ou `VITE_API=real` (chama `/api` do mesmo domínio) | `main.tsx` | B0 |
| Telas de login, cadastro e verificação do segundo fator, recuperação de senha | nova página `Entrar` no modo real | B2 |
| Sessão sai do `sessionStorage` e passa a ser cookie `HttpOnly`; o front não vê mais o token | `state/sessao.tsx`, `api/client.ts` | B2 |
| Sessão expirada (401) leva ao login sem perder o que estava sendo digitado | `api/client.ts`, rascunhos | B2 |
| Envio real de anexos, com barra de progresso e erro por arquivo | passo 1 do registro, caso | B3 |
| Escolha do contato da família (e-mail cadastrado) na comunicação à família | diálogo da Central | B4 |

A lista de pessoas de demonstração continua só no modo simulado.

## Banco de dados

### Tabelas principais

Toda tabela de dados de escola tem `rede_id`. Identificadores são texto (UUID gerado pelo banco quando não informado), para o seed usar os mesmos ids da demonstração (`oc-sp-482`, `esc-imsil`), dos quais os roteiros do front dependem. Itens de um caso (eventos, providências, ações) têm chave (caso, id). O protocolo legível (`2026-000482`) é único por rede.

| Grupo | Tabelas | Observações |
| --- | --- | --- |
| Organização | `redes`, `regionais`, `escolas` | Cadastro feito pela administração técnica |
| Pessoas e acesso | `usuarios`, `vinculos` (usuário, rede, perfil, regional), `vinculo_escolas`, `permissoes` (perfil × ação, por rede) | `permissoes` torna a matriz editável (pendência 25) |
| Sessão | `sessoes` (hash do token, validade, aparelho), `fatores_mfa` | O token nunca é guardado em texto puro |
| Cadastros da escola | `pessoas` (estudantes e profissionais), `responsaveis` (nome, parentesco, e-mail, telefone, consentimento para contato, estudante), `contatos_locais` | Estudantes com nome e inicial do sobrenome, como na demonstração. Responsáveis são cadastrados pela secretaria da escola até virem da Secretaria Escolar Digital (pendência 21) |
| Protocolo da rede | `categorias`, `regras_protocolo`, `modelos_comunicacao` | Configurados pela secretaria; valem para todas as escolas da rede |
| Caso | `ocorrencias`, `envolvimentos`, `anexos`, `eventos` | `eventos` é a linha do tempo: só recebe inserções |
| Gestão do caso | `providencias`, `encaminhamentos`, `acoes_plano`, `comunicacoes`, `ciencias`, `encerramentos` | `ciencias` guarda o hash do token do link, a validade e quem confirmou |
| Controle | `contadores_protocolo` (rede, ano, último número), `exportacoes`, `auditoria` | Número de protocolo gerado com trava de linha, sem repetição nem buraco por concorrência |

### Regras garantidas pelo banco

- **Row-Level Security** em todas as tabelas com `rede_id`. Cada requisição abre uma transação e informa a rede ativa. Uma consulta sem esse valor não enxerga nada. Três detalhes que, se errados, desligam a proteção sem aviso, e por isso são verificados em teste na B1:
  - a aplicação conecta com um usuário do banco que **não é dono** das tabelas, e as tabelas usam `FORCE ROW LEVEL SECURITY`;
  - a rede é informada com `set_config('app.rede_id', …, true)`, que vale só para a transação, por causa do reaproveitamento de conexões;
  - o driver escolhido precisa aceitar transações interativas. O driver HTTP da Neon não aceita; o de WebSocket (Pool) ou o `pg` aceitam. Confirmar na B1.
- **Auditoria e linha do tempo só aceitam inserção.** O usuário do banco que a aplicação usa não tem permissão de `UPDATE` nem `DELETE` nessas tabelas. Cada registro de auditoria guarda o hash do anterior, o que torna qualquer adulteração detectável. As inserções na auditoria são feitas em fila (uma trava por rede), senão a cadeia se divide.
- **Chaves e restrições**: protocolo único por rede; envolvimento, anexo e evento sempre da mesma rede do caso; encerramento só com as regras do contrato (a aplicação checa; o banco impede estados impossíveis).
- **Dados sensíveis**: relato e textos de comunicação ficam em colunas próprias, com acesso só pelas rotas que já filtram por perfil. A criptografia em repouso é a do provedor. Criptografia por coluna fica como decisão com o encarregado de dados.

### Migrações, cópias e dados de teste

- Migrações em SQL no Git, aplicadas pela integração contínua antes de cada publicação.
- Cada pull request ganha uma cópia (branch) do banco pela integração Neon + Vercel, com os mesmos dados fictícios da demonstração (`front/src/mocks/seed.ts` vira o seed do banco).
- Produção nunca recebe dados fictícios, e ambientes de teste nunca recebem dados reais.
- **Testes repetíveis.** Os roteiros do front partem sempre dos mesmos dados (hoje, cada navegador de teste começa com a simulação zerada). Com banco real, a segunda rodada falharia: o 484 já estaria triado e o protocolo 485 já existiria. Por isso, só em preview e homologação:
  - uma rota de restauração que volta o banco ao seed antes de cada rodada (ou uma nova branch da Neon por rodada), que não existe no build de produção;
  - usuários fictícios com segredo de segundo fator fixo e conhecido, para os roteiros entrarem pelo login real.
- Backup: restauração a um ponto no tempo oferecida pela Neon. A janela depende do plano; confirmar antes do piloto.

## Autenticação e acesso

| Etapa | Como | Quando |
| --- | --- | --- |
| TCC e homologação | E-mail e senha (hash Argon2id) com segundo fator por aplicativo (TOTP) obrigatório para coordenação, direção, referente, regional, secretaria e administração técnica | B2 |
| Produção na rede SP | Login com a conta institucional da Seduc-SP (OpenID Connect com o provedor de identidade da secretaria), com o segundo fator exigido pela própria secretaria | Depende de autorização da Seduc-SP (pendência 16) |

- Sessão em cookie `HttpOnly`, `Secure`, `SameSite=Lax`, com validade curta e renovação. O front deixa de guardar token no navegador.
- Os cabeçalhos `X-Rede-Id` e `X-Escola-Id` continuam: dizem o contexto, e o servidor confere se o vínculo permite. Por serem cabeçalhos próprios, um formulário de outro site não consegue enviá-los, o que protege contra requisições forjadas.
- As regras de acesso de `front/src/mocks/base.ts` e `gestao.ts` viram um módulo de autorização no servidor, testado perfil por perfil e rota por rota (uma tabela de testes com todos os perfis contra todas as rotas).
- Limite de tentativas de login e bloqueio temporário; recuperação de senha por e-mail com link de uso único.

## Anexos

- Upload direto do navegador para o Blob privado com autorização emitida pelo servidor: tipo de arquivo (imagem, PDF), tamanho máximo e caminho definidos pelo servidor.
- O arquivo só é associado ao caso depois de conferido: tamanho, tipo real pelo conteúdo e não apenas pela extensão.
- Download sempre por uma função que checa se a pessoa pode abrir o caso e registra o acesso na auditoria.
- Verificação de vírus não existe pronta na Vercel. Fica como decisão: serviço externo de verificação ou limitar os tipos aceitos (pendência 18).

## Comunicação com as famílias

- O e-mail diz apenas que a escola enviou uma comunicação e traz o link. O texto só aparece na página de ciência.
- O token do link tem 128 bits aleatórios, é guardado só como hash, expira (sugestão: 30 dias) e deixa de valer depois da ciência.
- A página pública tem limite de tentativas por endereço de rede, para ninguém adivinhar links.
- SMS ou WhatsApp ficam para depois: têm custo e exigem cadastro do telefone com consentimento (pendência 20).

## Tarefas agendadas

Uma tarefa diária (limite do plano Hobby), com horário aproximado:

- Marcar devolutivas e ações do plano atrasadas e avisar o responsável por e-mail
- Expirar links de ciência vencidos
- Aplicar a política de retenção, quando for definida (ver LGPD)

Tarefas mais frequentes exigem o plano Pro.

## Segurança

Referência: OWASP ASVS nível 2, adequado a dados sensíveis de crianças e adolescentes.

- Cabeçalhos de segurança no domínio: CSP restrita (o front já não carrega nada de fora), HSTS, `frame-ancestors 'none'`
- Validação de toda entrada com Zod; mensagens de erro sem detalhe interno
- Segredos só nas variáveis de ambiente da Vercel; nada no Git
- Limite de requisições nas rotas públicas e de login
- Dependências verificadas na integração contínua
- Revisão de segurança antes do piloto, com lista de verificação do ASVS e teste das regras de isolamento entre redes

## Observabilidade

- Logs estruturados sem dados pessoais (só ids e protocolo)
- No plano Hobby, os logs da Vercel ficam guardados por 1 hora. Por isso, erros do servidor também são gravados numa tabela própria de ocorrências técnicas, consultável pela administração técnica
- Rota de saúde (`/api/saude`) verificando o banco

## LGPD e governança

O sistema trata dados de crianças e adolescentes, alguns sensíveis (saúde, violência). Antes de qualquer dado real:

| Item | Responsável | Observação |
| --- | --- | --- |
| Relatório de Impacto à Proteção de Dados (RIPD) | Encarregado de dados da Seduc-SP, com a equipe do TCC | Exigido para tratamento de alto risco |
| Base legal e finalidade de cada dado | Encarregado de dados | Proteção da criança (ECA) e obrigações legais da escola |
| Política de retenção e descarte | Direção e encarregado | Quanto tempo o caso encerrado e a auditoria ficam guardados |
| Contratos com provedores (Vercel, Neon, e-mail) e transferência internacional | Seduc-SP | As empresas são estrangeiras, mesmo com os dados armazenados em São Paulo |
| Direitos do titular (acesso e correção pelos responsáveis) | Direção | Fluxo ainda a desenhar |

**Regra do plano: nenhum dado real de estudante entra no sistema antes do RIPD aprovado e da autorização formal da rede.** Até lá, todos os ambientes usam dados fictícios.

## Custos

| Fase | Vercel | Banco (Neon) | Arquivos e e-mail | Observação |
| --- | --- | --- | --- | --- |
| TCC e demonstração | Hobby, gratuito | Plano gratuito | Cotas gratuitas | O Hobby é só para uso pessoal e não comercial, o que vale para um projeto acadêmico |
| Piloto com dados reais | Pro, cobrado por pessoa da equipe, mais uso | Plano pago, pela janela de backup maior | Pago conforme o volume | Precisa de contrato em nome de quem responde pelos dados, não de uma pessoa física |
| Rede inteira | A decidir com a Seduc-SP | | | A secretaria pode exigir a infraestrutura própria do governo do estado. A arquitetura usa Postgres e Node padrão para poder migrar |

Valores exatos dependem do plano vigente na contratação e ficam para a decisão da gestão.

**Estimativa de uso na IMSIL.** O que mais gera chamadas é a Central, que recarrega fila, agenda e caso aberto a cada 30 s. Com 5 pessoas da gestão com a Central aberta 8 horas por dia útil: 5 × 960 recargas × 3 chamadas × 22 dias ≈ 317 mil chamadas por mês. O plano Hobby inclui 1 milhão de chamadas e 4 horas de CPU ativa por mês; a 20 ms de CPU por chamada, isso dá cerca de 1,8 hora. Cabe, mas sem folga para mais escolas. Por isso a B4 troca as três chamadas por uma consulta leve ("mudou algo desde a versão X?") e só busca as listas quando houver mudança, o que reduz o volume a cerca de um terço.

## Fases

Estimativas para uma pessoa de back-end. Cada fase termina com os testes passando e o registro em [Registro de execução](registro-de-execucao.md).

| Fase | Duração | Entregas | Pronto quando |
| --- | --- | --- | --- |
| B0 Demonstração publicada e base | 1 semana | Workspaces (`front`, `servidor`, `compartilhado`); demonstração atual publicada na Vercel com a API simulada, **depois da decisão sobre o endereço público** (ver Decisões); GitHub Actions rodando build, contraste e `npm run verificar` | A gestão abre a demonstração por um link; todo push roda os testes |
| B1 Fundação do servidor | 2 semanas | Hono em Vercel Functions (`gru1`); banco Neon em São Paulo; esquema e migrações; middleware de contexto (rede, escola, vínculo); formato de erro; seed fictício e restauração do seed em preview; rota de saúde; esquemas Zod compartilhados | Rotas de leitura (`redes`, `escolas`, `categorias`) respondem do banco; testes de isolamento entre redes passam, inclusive com a Row-Level Security sozinha |
| B2 Login e acesso | 3 semanas | Login, sessão por cookie, segundo fator, recuperação de senha, telas de login no front, módulo de autorização com a matriz vinda do banco, auditoria só de inserção; roteiros do front adaptados ao login real | Tabela de testes perfil × rota passa inteira; `f1-regressao.mjs` passa com login real; auditoria registra entradas e negações |
| B3 Registro e acompanhamento | 2 semanas | Ocorrências, protocolo por rede, semelhantes, pessoas, adendos, prazos, anexos privados com envio real no front | `f2-registro.mjs` passa contra o servidor real, duas vezes seguidas |
| B4 Central de Gestão | 3 semanas | Triagem, providências geradas pelo protocolo, encaminhamentos e devolutivas, plano de apoio, comunicações, ofício ao CT, cadastro de responsáveis, ciência com token seguro, e-mail às famílias, encerramento; consulta leve de mudanças para a atualização da fila | `f3-central.mjs` e `f3-atualizacao.mjs` passam contra o servidor real |
| B5 Gestão e administração | 2 semanas | Busca, relatórios em SQL com supressão (incluindo a complementar, pendência 31), exportação, auditoria, administração persistida (pendência 27), edição da matriz de permissões (pendência 25) | `f4-gestao.mjs` e `f4-regional.mjs` passam contra o servidor real |
| B6 Operação e segurança | 2 semanas | Tarefa diária, registro de erros, limites de requisição, cabeçalhos, revisão ASVS, teste de restauração do backup | Checklist de segurança sem item crítico; restauração testada |
| B7 Homologação e piloto | 2 semanas | Ambiente de homologação com dados fictícios, testes com pessoas da F5 (usabilidade, NVDA), RIPD, treinamento da equipe da IMSIL | Gestão e encarregado aprovam; só então o piloto com dados reais |

Total estimado: **17 semanas**. B0 pode começar assim que a conta da Vercel estiver ligada e a forma de publicar a demonstração for decidida.

## O que falta, item por item

Todas as pendências abertas em [Pendências](pendencias.md), com a fase que resolve cada uma. As que não são do back-end continuam com quem decide.

| Pendência | Assunto | Onde se resolve |
| --- | --- | --- |
| 1, 2, 5 | Teste de usabilidade, leitor de tela (NVDA), texto em 130% nos aparelhos da escola | B7, com a equipe da IMSIL |
| 3, 6, 9 | Aprovação do design system, confirmação da stack, nome do produto | Gestão, antes da B7 |
| 4 | Revisão das telas de comunicação pelo encarregado de dados | Junto com o RIPD, antes da B7 |
| 7, 8 | Quem registra a comunicação ao Conselho Tutelar; registrar ausência de ocorrências | Direção da IMSIL. Se decidido até a B4, entra na B4 |
| 10, 11, 12 | Tabela de providências, modelos de comunicação, critério de infrequência | Rede, jurídico e encarregado. Entram como dados de configuração, sem mudar código |
| 13 | Contatos reais da rede de proteção de Limeira | Direção da IMSIL, cadastrados na administração em B7 |
| 14 | Validação do contrato com o backend | B1 (este plano) |
| 15 | Controle de acesso no servidor | B2 |
| 16 | Login institucional com segundo fator | B2 (conta própria); institucional quando a Seduc-SP autorizar |
| 17 | Relação com o Conviva SP | Continua manual, com o código anotado no caso. Integração só com a Seduc-SP; fora deste plano |
| 18 | Anexos reais em armazenamento privado | B3 |
| 19 | Rascunhos em aparelho compartilhado | B3: rascunho expira no aparelho em 7 dias e é apagado ao sair da sessão; rascunho no servidor fica como alternativa se a direção preferir |
| 20 | Envio real às famílias e link seguro | B4 |
| 21 | Turmas, estudantes e responsáveis da Secretaria Escolar Digital | Cadastro manual pela escola no piloto; integração só com a Seduc-SP, fora deste plano |
| 23 | Regra de encerramento com ações abertas | Direção da IMSIL valida; já implementada |
| 25 | Edição da matriz de permissões | B5 |
| 27 | Configurações da administração persistidas | B5 |
| 31 | Supressão complementar nos relatórios | Decisão do encarregado; implementação na B5 |

## Decisões tomadas

| Data | Decisão | Motivo |
| --- | --- | --- |
| 29/09/2026 | Arquitetura deste plano aprovada para execução | Usuário: "vamos implementar o plano de back-end agora mesmo, pode começar" |
| 29/09/2026 | SQL direto com `pg` no lugar do Drizzle | Segurança do banco é toda em SQL; menos dependências |
| 29/09/2026 | PGlite para desenvolvimento e testes, no lugar de Docker | Máquina com pouca memória livre; teste prévio confirmou papéis, Row-Level Security, `set_config` local e permissões |
| 30/09/2026 | Banco local com dono sem superusuário | O superusuário ignora a Row-Level Security e escondia dois erros que só apareceriam na Neon (seed e busca do token de ciência) |
| 30/09/2026 | Caso de outra rede responde 404, e não 403 | O banco nem mostra a linha; responder 403 revelaria que o id existe |
| 30/09/2026 | Ciência da família só pode ser confirmada uma vez (409 na segunda) | O registro de quem confirmou não pode ser trocado depois |
| 30/09/2026 | Na triagem, o responsável precisa conduzir casos na escola do caso | A simulação aceitava qualquer pessoa; o servidor confere o vínculo |
| 30/09/2026 | B3 a B5 feitas antes da B2 | O login de demonstração permitiu validar todas as rotas com os roteiros do front; o login real entra por cima sem mudar as rotas |
| 29/09/2026 | Faixa "Demonstração: protótipo acadêmico, sem vínculo com a Secretaria da Educação" no topo de todas as telas do modo simulado | Recomendação para a publicação da demonstração; a forma de publicar continua em decisão |

## Decisões pendentes

| Decisão | Recomendação | Quem decide | Impacto se atrasar |
| --- | --- | --- | --- |
| Como publicar a demonstração (B0) | Endereço com aviso visível "protótipo acadêmico, sem vínculo com a Seduc-SP; dados fictícios" em todas as telas. Confirmar se o plano Hobby permite proteger o endereço de produção com login; se não permitir, usar o aviso ou só links de preview protegidos | Equipe do TCC e gestão | O link público mostra o nome real da IMSIL sob o timbre da secretaria |
| Confirmar a arquitetura (Hono, Neon, Drizzle, Vercel Blob) | Como neste plano | Equipe do TCC e gestão | Atrasa B1 |
| Login no piloto: conta própria com segundo fator ou conta institucional da Seduc-SP | Conta própria no TCC; institucional quando a Seduc autorizar | Seduc-SP | Atrasa o piloto real, não o TCC |
| Onde o sistema roda em produção: Vercel ou infraestrutura do governo | Vercel no TCC e no piloto, com arquitetura portável | Seduc-SP | Pode exigir migração antes da rede toda |
| Criptografia por coluna do relato | Avaliar com o encarregado após o RIPD | Encarregado de dados | Retrabalho no esquema se decidido tarde |
| Política de retenção | Definir no RIPD | Direção e encarregado | Sem ela, não há descarte automático |
| Verificação de vírus nos anexos | Limitar tipos no TCC; serviço de verificação no piloto | Equipe do TCC | Risco em anexos enviados por pessoas de fora |
| Canal de comunicação com as famílias além do e-mail | Só e-mail no piloto | Direção da IMSIL | Famílias sem e-mail não recebem o link (a escola entrega em papel) |

## Riscos

| Risco | Sinal | Mitigação |
| --- | --- | --- |
| Servidor divergir da demonstração | Tela quebra ao ligar o modo real | Os roteiros do front rodam contra o servidor em cada fase |
| Dado de uma rede aparecer em outra | Teste de isolamento falha | Filtro na aplicação e Row-Level Security no banco; teste em toda rota |
| Dados reais entrarem antes da aprovação | Pedido para "testar com um caso de verdade" | Regra do plano; ambientes de teste só com seed fictício |
| Limites do plano gratuito | Funções lentas, cotas estouradas, logs curtos | Monitorar o uso; tabela própria de erros; Pro no piloto |
| Links de ciência adivinhados ou reenviados | Muitas tentativas na página pública | Token longo com hash, validade, limite de tentativas |
| Adulteração da auditoria | Registro alterado | Tabela só de inserção, cadeia de hashes |
| Dependência de um fornecedor | Mudança de preço ou exigência da Seduc | Postgres e Node padrão; nada exclusivo além do Blob, que tem troca simples por S3 |

## Referências consultadas (29/09/2026)

- Vercel: [regiões](https://vercel.com/docs/regions), [limites](https://vercel.com/docs/limits), [uso justo e uso comercial no Hobby](https://vercel.com/docs/limits/fair-use-guidelines), [Cron Jobs](https://vercel.com/docs/cron-jobs/usage-and-pricing), [Blob e armazenamento privado](https://vercel.com/docs/vercel-blob)
- Neon: [regiões, incluindo AWS São Paulo](https://neon.com/docs/introduction/regions)
