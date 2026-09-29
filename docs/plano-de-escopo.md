# Plano de escopo do front-end: sistema de ocorrências escolares

Atualizado em 29/09/2026 (front completo: F1 a F4 construídas e parte técnica da F5 feita; faltam os testes com pessoas). Este arquivo é a fonte oficial do plano; a cópia no Claude Docs é só para leitura.

Propomos construir o front-end completo do sistema em 5 fases, com dados simulados, antes de qualquer integração com backend. O protótipo HTML (`prototipo-ocorrencias.html`) serve como referência de linguagem visual, não como base de código.

Documentos relacionados:

- [Gestão da ocorrência](gestao-da-ocorrencia.md): o que o gestor faz ao receber uma ocorrência, base legal e fontes
- [Pendências](pendencias.md): tudo o que ficou para depois, com situação
- [Registro de execução](registro-de-execucao.md): o que foi construído e verificado em cada fase
- [Contrato para o backend](contrato-para-o-backend.md): rotas, erros e regras de acesso que o servidor precisa seguir
- [README do front](../front/README.md): como rodar

## Situação atual

| Fase | Situação | O que existe |
| --- | --- | --- |
| F1 Fundação e multi-rede | Construída | Guia da interface com 20 componentes, contraste AA verificado por script, duas redes isoladas, perfis de demonstração, estados do sistema |
| F2 Registrar e acompanhar | Construída | Início, registro em 3 passos com rascunho no aparelho, meus registros, detalhe do caso com linha do tempo e adendos |
| F3 Central de Gestão | Construída | Fila por risco que se atualiza sozinha, caso com providências por tipo, encaminhamentos com devolutiva, plano de apoio, comunicação à família com ciência, ofício ao Conselho Tutelar, encerramento com justificativa, agenda |
| F4 Gestão e administração | Construída | Busca por perfil, relatório agregado com supressão de grupos pequenos, quebra por escola na regional e exportação com motivo, administração em dois níveis (rede e escola), matriz de permissões (consulta), auditoria |
| F5 Validação e entrega | Parte técnica feita | Auditoria automática de acessibilidade sem violações e contrato entregue para o backend. Faltam os testes com pessoas (usabilidade e leitor de tela) |

Os testes com usuários ficaram para depois de o front estar completo (decisão de 28/09/2026). O front ficou completo em 29/09/2026; os testes estão em [Pendências](pendencias.md).

## Objetivo e limites

Entregar uma interface web responsiva, navegável e acessível que cubra os módulos da seção 4 do relatório, pronta para ser ligada a uma API real depois. Tudo roda com dados fictícios servidos por uma API simulada, com o mesmo formato que o backend terá.

**Entra nesta etapa**

- Todas as telas do inventário abaixo, com estados de carregamento, vazio e erro
- Biblioteca de componentes e padrões visuais (design system) documentada
- Simulação de perfis para demonstrar o que cada um vê
- Conformidade com eMAG e WCAG 2.1 nível AA nos caminhos críticos
- Testes de usabilidade com professores, coordenação e ao menos uma pessoa com deficiência

**Fica fora desta etapa**

- Backend, banco de dados e autenticação real (login e MFA apenas simulados)
- Envio real de e-mail, SMS ou notificações
- Controle de acesso efetivo: o front esconde o que o perfil não pode ver, mas a garantia de segurança depende do backend
- Itens que o relatório já exclui do MVP: IA de classificação, app nativo, painel público, automação de sanções

## Decisão de arquitetura: multi-rede

O sistema atende várias redes de ensino numa mesma instalação. Cada rede (secretaria municipal ou estadual) é um inquilino isolado, e as escolas são unidades dentro dela.

| Ponto | Decisão |
| --- | --- |
| Inquilino | A rede de ensino, com a hierarquia rede, regional, escola. A escola não é inquilino, porque a regional precisa de visão agregada e o histórico acompanha transferências dentro da rede |
| Por quê | Cada município define seu protocolo (Lei 14.811/2024); cada secretaria responde pelos seus dados (LGPD); redes municipal e estadual convivem na mesma cidade com dados separados |
| Isolamento | Banco compartilhado, com o identificador da rede em todo registro e segurança por linha aplicada no próprio banco. Uma instalação exclusiva por rede continua possível por configuração |
| No front | Rede identificada por subdomínio ou no login; nome e brasão da secretaria; protocolo carregado por rede; seletor de rede e escola sempre visível; administração em dois níveis |
| Na demonstração | API simulada com duas redes, para mostrar que os dados não se misturam |

Custo: 1 semana a mais na F1. Somada à Central de Gestão na F3 (+1 semana), a estimativa total é de 14 semanas.

## Escola piloto: IMSIL, Limeira

O piloto começa com uma única escola: a [E.E. Irmã Maria de Santo Inocêncio Lima](https://imsil-limeira.blogspot.com/), no Jardim Ouro Verde, em Limeira. Ela pertence à rede estadual de São Paulo e responde à [Unidade Regional de Ensino de Limeira](https://delimeira.educacao.sp.gov.br/urelim/).

- **Conviva SP:** a rede estadual já exige o registro de ocorrências na Plataforma Conviva (Placon). O sistema não substitui esse registro: cada caso mostra se já foi lançado no Conviva e com qual código, e esse lançamento é uma providência obrigatória da triagem.
- **Dados de demonstração:** a rede e a escola são reais; pessoas, turmas e casos são fictícios. Uma segunda rede, marcada como fictícia, existe só para provar o isolamento entre redes.
- **Arquitetura:** continua multi-rede. Uma escola só não muda o modelo; muda apenas a configuração inicial.

## Inventário de telas

São 15 telas, que cobrem os 8 módulos da seção 4 do relatório e os protótipos pedidos na seção 7.

| # | Tela | Módulo do relatório | Perfis que usam | Fase |
| --- | --- | --- | --- | --- |
| 1 | Login simulado, identificação da rede e seletor de rede e escola | Autenticação (seção 12) | Todos | F1 |
| 2 | Estados do sistema: sem permissão, sem conexão, erro, página não encontrada | Transversal | Todos | F1 |
| 3 | Início: registrar, situação da escola, prazos próximos | UX (seção 7) | Todos | F2 |
| 4 | Novo registro em 3 passos, com rascunho, validação, urgência, envolvidos e anexos | Novo registro | Professor, Apoio, Coordenação, Direção, Referente | F2 |
| 5 | Meus registros e rascunhos | Novo registro | Professor, Apoio, Coordenação | F2 |
| 6 | Detalhe do caso: linha do tempo, adendos, situação, confidencialidade | Caso | Autor, Coordenação, Direção, Referente | F2 |
| 7 | Central de Gestão: fila por risco e prazo, caso aberto, providências por tipo, encaminhamentos com devolutiva, plano de apoio e agenda | Triagem, Caso, Plano de apoio | Coordenação, Direção, Referente de proteção | F3 |
| 8 | Documentos do caso: ofício ao Conselho Tutelar e comunicação à família a partir de modelos | Comunicação | Coordenação, Direção, Referente | F3 |
| 9 | Comunicação com responsáveis: modelo aprovado, pré-visualização sem dados de terceiros | Comunicação | Coordenação, Direção, Referente | F3 |
| 10 | Confirmação de ciência pelo responsável (página pública, pelo link) | Comunicação | Família | F3 |
| 11 | Busca com filtros por período, categoria e situação | Busca e relatórios | Coordenação, Direção, Referente, Regional | F4 |
| 12 | Relatório agregado com supressão de grupos pequenos e exportação com motivo | Busca e relatórios | Direção, Regional, Secretaria | F4 |
| 13 | Administração em dois níveis: rede (protocolo, categorias, prazos, modelos, contatos) e escola (turmas, usuários) | Administração | Secretaria, Direção, Administração técnica | F4 |
| 14 | Matriz de permissões | Administração | Secretaria, Administração técnica | F4 |
| 15 | Consulta de auditoria | Auditoria | Direção, Secretaria, Administração técnica | F4 |

Um seletor de perfil de demonstração, visível em todas as telas, mostra o que cada perfil pode ou não ver. Ele muda menus e telas; os dados continuam limitados pelo vínculo real, porque quem decide o acesso é o servidor.

## Requisitos transversais

Valem para todas as telas e entram no critério de aceite de cada fase.

| Tema | O que será exigido | Referência |
| --- | --- | --- |
| Acessibilidade | WCAG 2.1 AA e eMAG: navegação completa por teclado, foco visível, contraste mínimo de 4,5:1 nos temas claro e escuro, rótulos em todos os campos, leitor de tela nos caminhos críticos, nada dependendo só de cor | Relatório, seções 7 e 12 |
| Público-alvo | Texto-base de 17px, áreas de toque de no mínimo 44px, controles explícitos em vez de ícones soltos, opção de aumentar a fonte | Documentação do protótipo, seção 3.1 |
| Responsividade | Celular primeiro, funcional a partir de 360px de largura, sem rolagem horizontal | Relatório, seção 7 |
| Conexão instável | Rascunho salvo localmente, aviso de falta de conexão, reenvio sem perda do que foi digitado | Relatório, seções 7 e 14 |
| Privacidade na interface | Rótulo de confidencialidade visível, explicação de quem verá, nomes de terceiros ocultos em comunicações, nenhum dado real de pessoas em demonstração | Relatório, seções 6, 7 e 10 |
| Linguagem | Factual e não estigmatizante; orientação nos campos de relato; nunca rótulos sobre a pessoa | Relatório, seções 1 e 3 |
| Prevenção de erro | Confirmação antes de enviar ou compartilhar, aviso de duplicata, correções como adendo | Relatório, seções 3 e 7 |
| Consistência | Design system único com cores, tipografia, espaçamentos e componentes documentados | Este plano |

## Fases e entregas

| Fase | Duração estimada | Entregas | Ponto de controle ao fim |
| --- | --- | --- | --- |
| F1 Fundação e multi-rede | 3 semanas | Design system, layout, seletor de perfil, rede e escola, API simulada com duas redes, telas 1 e 2 | Gestão aprova o design system e a navegação |
| F2 Registrar e acompanhar | 3 semanas | Telas 3 a 6 | Teste de usabilidade com professores, coordenação e uma pessoa com deficiência |
| F3 Central de Gestão | 4 semanas | Telas 7 a 10 | Encarregado de dados revisa as telas de comunicação |
| F4 Gestão e administração | 2 semanas | Telas 11 a 15 | Nenhum |
| F5 Validação e entrega | 2 semanas | Auditoria de acessibilidade, segundo teste de usabilidade, correções, documentação para o backend | Front aprovado para integração com o backend |

As durações são estimativas para uma pessoa de front-end e mudam com o tamanho da equipe.

## Critérios de aceite por fase

Uma fase só é concluída quando todos os itens forem verificados em demonstração. Detalhes da verificação em [Registro de execução](registro-de-execucao.md).

**F1 · Fundação**

- [x] Design system publicado com cores, tipografia, espaçamentos e ao menos 15 componentes
- [x] Contraste AA verificado nos temas claro e escuro
- [x] Troca de perfil simulado altera menus e telas visíveis
- [ ] API simulada responde no formato combinado com o backend (contrato existe; falta validar com o backend)
- [x] API simulada com duas redes; nenhuma tela mostra dados de uma rede estando na outra
- [x] Rede e escola ativas sempre visíveis no topo; a troca pede confirmação se houver alteração não enviada
- [x] Nome e brasão da secretaria carregados conforme a rede

**F2 · Registrar e acompanhar**

- [ ] Professor registra uma ocorrência do início ao fim usando só o teclado (ordem de foco verificada; falta passada completa com pessoa e leitor de tela)
- [x] Rascunho sobrevive a recarregar a página e à perda de conexão
- [x] Campos obrigatórios mostram erro em texto, não só em cor
- [x] Resumo da revisão reflete exatamente o que foi preenchido
- [x] Correção após envio gera adendo visível na linha do tempo
- [ ] Teste de usabilidade realizado e achados registrados

**F3 · Central de Gestão**

- [x] Coordenação leva um caso de Recebido a Encerrado na Central, sem trocar de tela, com justificativa no encerramento
- [x] Providências geradas pelo tipo do caso; as obrigatórias impedem o encerramento, salvo justificativa registrada
- [x] Cada encaminhamento externo guarda órgão, data, canal, protocolo e a devolutiva esperada, com alerta de atraso
- [x] Comunicação à família bloqueia o envio quando o texto cita outro estudante
- [x] Ações do plano de apoio mostram situação: no prazo, atrasada ou concluída
- [x] Perfil Professor não vê a Central nem casos de terceiros
- [x] Lançamento no Conviva SP registrado como providência, com o código
- [ ] Revisão das telas de comunicação pelo encarregado de dados

**F4 · Gestão e administração**

- [x] Relatório agregado oculta grupos abaixo do limite mínimo definido (3 casos)
- [x] Exportação exige motivo antes de liberar o arquivo, e o motivo vai para a auditoria
- [x] Busca retorna apenas casos permitidos ao perfil ativo
- [x] Protocolo configurado pela secretaria vale para todas as escolas da rede; a escola altera apenas o que é dela (contatos, pessoas)
- [x] Visão da regional agrega várias escolas da mesma rede e nunca de outra rede (verificado na rede de testes, com duas escolas fictícias)

**F5 · Validação e entrega**

- [x] Auditoria de acessibilidade sem pendências críticas nos caminhos de registro, triagem e acompanhamento (automática, com axe-core; falta a passada com leitor de tela)
- [ ] Segundo teste de usabilidade com melhora frente ao primeiro
- [x] Documentação de componentes e contrato de dados entregues à equipe de backend (componentes em `/guia`; contrato em [Contrato para o backend](contrato-para-o-backend.md); falta a validação com o backend)

## Decisões tomadas

| Data | Decisão | Motivo |
| --- | --- | --- |
| 28/09/2026 | Stack React, TypeScript, Vite e MSW (assumida; confirmar com a gestão) | Recomendação do plano; "estamos prontos" tomado como aprovação |
| 28/09/2026 | Multi-rede, com a rede como inquilino | Protocolos por município, LGPD por secretaria |
| 28/09/2026 | Escola piloto: IMSIL, Limeira, rede estadual SP | Definição do usuário |
| 28/09/2026 | Central de Gestão substitui as telas separadas de triagem e plano de apoio | Pesquisa sobre a gestão da ocorrência |
| 28/09/2026 | Testes com usuários adiados até o front estar completo | Definição do usuário |
| 28/09/2026 | Repositório Git é a fonte oficial de todos os registros | Definição do usuário, para trabalhar em locais diferentes |
| 28/09/2026 | Azul institucional e fontes Source Serif 4 e Source Sans 3, servidas pelo próprio app | Documentação do protótipo; conexão instável e privacidade |
| 29/09/2026 | Encerrar caso com ações do plano em aberto exige confirmar o cancelamento delas | Caso encerrado não aceita ações; nada fica pendurado. A direção pode mudar a regra (pendência 23) |
| 29/09/2026 | A segunda escola para testar a regional é fictícia, na rede de testes | A IMSIL é a única escola real por enquanto; não inventar escolas reais |
| 29/09/2026 | A Central se atualiza por consulta periódica (30 s), sem conexão em tempo real | Funciona com qualquer backend; tempo real pode vir depois sem mudar a tela |
| 29/09/2026 | Na auditoria, consultas da mesma pessoa ao mesmo caso contam uma vez a cada 15 minutos | A atualização automática geraria um registro a cada 30 s e esconderia o que importa. Muda o que a trilha da LGPD guarda: validar com o encarregado de dados (pendência 4) |

## Decisões pendentes da gestão

| Decisão | Recomendação | Alternativa | Impacto se atrasar |
| --- | --- | --- | --- |
| Confirmar a stack | React com TypeScript, API simulada com MSW | Vue ou Angular, se o backend já usar | Retrabalho se mudar depois |
| Tamanho da equipe de front | 1 pessoa mais apoio de design nas fases 1 e 2 | 2 pessoas, cerca de 8 semanas | Muda as durações |
| Identidade visual | Manter o azul institucional e as fontes atuais | Manual de marca da secretaria, se houver | Retrabalho no design system |
| Quem participa dos testes | 3 a 5 professores, 2 da coordenação e 1 pessoa com deficiência | Só equipe interna, com menor validade | Adia os pontos de controle |
| Nome do produto | Definir antes da entrega | Manter "Cuidar e Registrar" como provisório | Troca de textos e marca depois |

## Riscos e mitigação

| Risco | Sinal | Mitigação |
| --- | --- | --- |
| Front e backend divergem no formato dos dados | Telas quebram ao integrar | Contrato de dados em `front/src/api/contract.ts`, seguido pela API simulada |
| Tratar o protótipo como código final | Pedidos para "só ajustar o HTML" | O protótipo é referência visual; o código novo está em `front/` |
| Acessibilidade deixada para o final | Muitos problemas só na F5 | Verificação de acessibilidade em cada fase |
| Esconder na tela ser confundido com segurança | Gestão considerar o acesso resolvido | O RBAC real depende do backend; o front só reflete as permissões |
| Teste com usuários sem participantes | Pontos de controle adiados | Convidar participantes da IMSIL com antecedência |
| Aumento de escopo durante as fases | Telas novas no meio da fase | Novos pedidos entram em Pendências, com decisão da gestão |
| Dados de uma rede aparecem em outra | Professor que atua em duas redes vê casos da rede errada | Rede ativa sempre visível; testes com duas redes; isolamento no banco |
