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

- Auditoria automática de acessibilidade (`scripts/verificacao/f5-acessibilidade.mjs`, axe-core, regras WCAG 2.0 e 2.1 A e AA): professora, coordenação, direção, secretaria e família; todas as abas da administração e do caso; diálogo de encerramento; formulário com erros; temas claro e escuro; 360 e 1440px
- Central se atualiza sozinha (pendência 22): consulta a cada 30 s com a aba visível, ao voltar à aba e, na demonstração, quando outra aba grava dados. Diálogos abertos não fecham. Consultas repetidas ao mesmo caso contam uma vez a cada 15 minutos na auditoria
- Encerramento com ações do plano em aberto (pendência 23): o diálogo lista as ações e exige marcar o cancelamento; sem isso, 409. As ações ficam "Canceladas no encerramento" e o cancelamento entra na linha do tempo
- Regional com várias escolas (pendência 26): segunda escola fictícia e diretora regional na rede de testes, com histórico nas duas; o relatório ganhou "Casos por escola" (também no CSV). A chave do banco da demonstração passou a `demo.banco.v7`
- Comunicação à família: a API simulada também recusa texto que cite outro estudante do caso, inclusive nomes restritos que a tela não conhece, e audita a recusa
- Contrato para o backend (`docs/contrato-para-o-backend.md`), tirado do código
- Limpeza: `EmConstrucao` e o campo `fase` removidos; a nota do Início sobre "relatórios na F4" virou link

**Verificado** (`npm run build`, `npm run contrast` e `npm run verificar`, todos passando)

- Acessibilidade: 172 telas auditadas, nenhuma violação. O único item inconclusivo é contraste de texto sobre elementos sobrepostos, coberto pelo `npm run contrast`. Antes de confiar no resultado, conferimos que o axe acusa um campo sem rótulo e um texto sem contraste inseridos de propósito
- Atualização: Beatriz conclui a triagem do 484; na aba de Carlos, sem recarregar, a fila passa de "Recebido, sem responsável" para "Em acompanhamento, com Carlos Mendes", o caso aberto muda e o diálogo que ele tinha aberto continua aberto; a auditoria tem uma só consulta dele ao caso
- O servidor recusa (422) a comunicação à família de Gabriel que cita Lara e aceita (201) o texto só sobre Gabriel
- Encerrar o 482 sem confirmar: "Há 2 ações do plano de apoio em aberto…"; confirmando, o caso é encerrado e as duas ações aparecem como canceladas
- Regional fictícia: 23 casos das duas escolas, nenhum da IMSIL, nenhum link para abrir caso, barras por escola com 14 e 9; a regional de SP continua só com a IMSIL e sem quebra por escola
- F1 a F4 sem regressão

## Situação da última rodada de verificação

29/09/2026: `npm run build`, `npm run contrast` e `npm run verificar` completo (F1, F2, F3, atualização, F4, regional e acessibilidade) passaram. O front está completo; o que falta é validação com pessoas, decisões da gestão e backend (ver Pendências).
