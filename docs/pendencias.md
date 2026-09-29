# Pendências

Tudo o que ficou para depois de o front estar completo, em um só lugar. Atualize a coluna Situação ao avançar (Aberta, Em andamento, Resolvida) e registre a data na coluna Notas.

Última revisão: 29/09/2026. O front está completo; o que sobra depende de pessoas, decisões da gestão ou backend. A fase do back-end que resolve cada item está em [Plano do back-end › O que falta, item por item](plano-backend.md#o-que-falta-item-por-item).

## Validação com pessoas

| # | Pendência | Fase | Depende de | Situação | Notas |
| --- | --- | --- | --- | --- | --- |
| 1 | Teste de usabilidade na IMSIL com professores, coordenação e ao menos uma pessoa com deficiência | F2 e F5 | Agenda da escola | Aberta | Roteiro de teste ainda a preparar |
| 2 | Registro completo feito só com teclado e com leitor de tela (NVDA) | F2 e F5 | Equipe do TCC | Aberta | Ordem de foco verificada por script; axe sem violações nas telas principais |
| 3 | Aprovação do design system e da navegação pela gestão | F1 | Gestão | Aberta | Mostrar em `/guia` |
| 4 | Revisão das telas de comunicação pelo encarregado de dados | F3 | Encarregado de dados | Aberta | Comunicação à família, ofício ao CT, página de ciência. Incluir: consultas repetidas ao mesmo caso contam uma vez a cada 15 min na auditoria, e a supressão complementar (pendência 31) |
| 5 | Teste de leitura com o texto em 130% em aparelhos reais da escola | F5 | Equipe do TCC | Aberta | Em 360px já não há rolagem lateral |

## Decisões

| # | Pendência | Fase | Depende de | Situação | Notas |
| --- | --- | --- | --- | --- | --- |
| 6 | Confirmar a stack (React, TypeScript, Vite, MSW), assumida para começar | F1 | Gestão | Aberta | |
| 7 | Definir quem registra a comunicação ao Conselho Tutelar: só a direção ou também coordenação e orientação | F3 | Direção da IMSIL | Aberta | Hoje: coordenação, direção e referente de proteção |
| 8 | Decidir se a escola registra também a ausência de ocorrências no período, como o Conviva SP | F3 | Direção da IMSIL | Aberta | |
| 9 | Nome do produto e identidade visual definitivos | F1 | Gestão | Aberta | Nome provisório: Cuidar e Registrar |

## Conteúdo e normas

| # | Pendência | Fase | Depende de | Situação | Notas |
| --- | --- | --- | --- | --- | --- |
| 10 | Validar a tabela de providências por tipo com a Unidade Regional de Limeira, jurídico e encarregado de dados | F3 | Rede e jurídico | Aberta | Regras em `front/src/mocks/protocolo.ts` |
| 11 | Validar os modelos de comunicação à família e de ofício ao Conselho Tutelar | F3 | Direção e jurídico | Aberta | Textos em `front/src/mocks/protocolo.ts` |
| 12 | Confirmar o critério de infrequência (FICAI) usado pela rede | F3 | Unidade Regional | Aberta | |
| 13 | Contatos locais (Conselho Tutelar, CRAS, CREAS, delegacia) de Limeira | F4 | Direção da IMSIL | Aberta | A direção já edita em Administração › Contatos; faltam os dados reais |

## Integração e backend

| # | Pendência | Fase | Depende de | Situação | Notas |
| --- | --- | --- | --- | --- | --- |
| 14 | Validar o contrato de dados (`front/src/api/contract.ts`) com a equipe de backend | F1 | Backend | Aberta | Documento de entrega: `docs/contrato-para-o-backend.md` |
| 15 | Controle de acesso aplicado no servidor real, com a mesma matriz do front | Todas | Backend | Aberta | Regras de referência em `front/src/mocks/base.ts` |
| 16 | Login com a conta institucional da rede, com MFA para perfis de gestão | F1 | Seduc-SP e backend | Aberta | |
| 17 | Relação com o Conviva SP: lançamento manual com código (atual) ou integração | F3 | Seduc-SP | Aberta | |
| 18 | Anexos reais em armazenamento privado, com verificação de arquivo | F2 | Backend | Aberta | Hoje só o nome do arquivo é guardado |
| 19 | Rascunhos em aparelho compartilhado: prazo de expiração ou rascunho no servidor | F2 | Backend e direção | Aberta | Hoje ficam no navegador até enviar ou descartar |
| 20 | Envio real de comunicações às famílias (e-mail, SMS ou aplicativo) e link de ciência seguro | F3 | Backend | Aberta | Hoje o link é mostrado na tela, só para demonstração |
| 21 | Turmas e estudantes vindos da Secretaria Escolar Digital, em vez de cadastro manual | F4 | Seduc-SP | Aberta | |

## Front (conhecidas, ainda não resolvidas)

| # | Pendência | Fase | Situação | Notas |
| --- | --- | --- | --- | --- |
| 22 | Atualização automática da fila quando outra pessoa altera um caso | F3 | Resolvida | 29/09/2026: fila, agenda e caso aberto recarregam a cada 30 s e ao voltar à aba, sem fechar diálogos; `f3-atualizacao.mjs` |
| 23 | Encerrar caso com ações do plano ainda abertas: decidir se cancela ou mantém | F3 | Resolvida no front | 29/09/2026: quem encerra precisa confirmar o cancelamento das ações abertas, que fica na linha do tempo. Validar a regra com a direção da IMSIL |
| 24 | Rodar de novo `npm run verificar` completo (F3 e F4) depois das últimas mudanças | F4 | Resolvida | 29/09/2026: F1 a F4 passaram; ver Registro de execução |
| 25 | Edição da matriz de permissões | F4 | Aberta (backend) | Hoje só consulta. Editar só na tela mostraria permissões que o servidor recusa; depende de o servidor ler as permissões de um cadastro |
| 26 | Testar a visão da regional com mais de uma escola | F4 | Resolvida | 29/09/2026: rede de testes com duas escolas fictícias e Rita Moraes (regional); relatório ganhou quebra por escola; `f4-regional.mjs` |
| 27 | Configurações da administração (protocolo, modelos, contatos) persistem só no navegador da demonstração | F4 | Aberta (backend) | Rotas já definidas no contrato |
| 28 | Remover o componente `EmConstrucao` e o campo `fase` da navegação, que não são mais usados | F4 | Resolvida | 29/09/2026 |
| 29 | Auditoria automática de acessibilidade | F5 | Resolvida | 29/09/2026: 45 verificações em cada uma das 4 combinações de tema (claro, escuro) e largura (360, 1440px), 180 no total, sem violação WCAG A/AA. Contraste de texto sobre elementos sobrepostos fica inconclusivo no axe; coberto por `npm run contrast` |
| 30 | Bloqueio de nome de outro estudante na comunicação à família também no servidor | F3 | Resolvida | 29/09/2026: a simulação recusa, inclusive nomes restritos que a tela não vê. O backend real precisa repetir a regra |
| 31 | Supressão complementar nos relatórios | F4 | Aberta | Com só um grupo suprimido, o total menos os outros grupos revela o número escondido (vale para tipos, meses e escolas). Decidir com o encarregado de dados se suprime também um segundo grupo ou se mostra o total arredondado |
