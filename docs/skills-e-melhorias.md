# Skills novas: o que foi feito com elas

Registro de 13/10/2026. Cinco skills novas do Claude Code foram usadas neste projeto, uma de cada vez: primeiro para diagnosticar o front, depois para executar o plano que saiu desse diagnóstico. O plano item por item, com as caixas marcadas, está em [`plano-melhorias-skills.md`](plano-melhorias-skills.md).

## As skills e o que cada uma fez

| Skill | Para que serve | O que fez aqui |
| --- | --- | --- |
| **graphify** | Transforma o código num grafo de arquivos, funções e ligações | Mapeou `front/src` (472 nós, 16 grupos). Mostrou que `CasoNaCentral.tsx` (34 KB) era o arquivo mais conectado, justo onde estavam os problemas de tela |
| **playwright** | Abre o site num navegador de verdade e tira capturas | Navegou como professora e como coordenação, no computador e no celular, no claro e no escuro. Depois, conferiu cada mudança e mediu animações que captura de tela não mostra |
| **impeccable** | Auditoria técnica e avaliação de usabilidade, com um detector de padrões ruins | Deu as notas de partida (técnica 15/20, usabilidade 28/40), achou os problemas mais graves e, no fim, gerou `front/PRODUCT.md` e `front/DESIGN.md` |
| **Emil Kowalski** (`emil-design-eng`) | Movimento e resposta ao toque | Apontou botões sem reação ao clique, diálogos que abriam secos e o modo de movimento reduzido que apagava o sinal de carregamento |
| **taste skill** (`design-taste-frontend`) | Marca, cor, tipografia e padrões de interface | Apontou os três indicadores vermelhos iguais e a fonte larga demais para tela densa |

## O que mudou no sistema

### Fase 1: segurança e fluxo
- A pergunta **"Alguém corre risco agora?"** passou para o topo do registro. Antes era a última.
- A fila da Central mostra os urgentes primeiro e, logo depois, os casos **sem responsável**, com etiqueta própria. Antes, um desses ficava escondido no fim de uma caixa com rolagem.

### Fase 2: o caso na Central
- `CasoNaCentral.tsx` foi dividido em cinco componentes, sem mudar a tela.
- **"O que aconteceu"** (o relato) abre o caso, antes das ações e das providências.
- Uma ação principal por fase do caso; "Comunicar família" e "Ofício ao Conselho Tutelar" ficam juntos em **Comunicar**.
- Cada providência mostra a situação escrita (Cumprida, Pendente, Não se aplica). Antes era um quadrado que parecia caixa de marcar, mas não era clicável.
- Nos indicadores, só **urgentes** fica vermelho; atraso e pendência ficam em âmbar.
- As abas quebram de linha em vez de esconder abas fora da tela.

### Fase 3: acabamento
- Botões cedem um pouco ao toque; diálogos e avisos entram com uma transição curta; o efeito de passar o mouse só aparece em aparelhos com mouse.
- Avisos e o número de protocolo perderam as faixas grossas de cor.
- O Início separa **Atrasados** de **Próximos**.
- Fonte nova: **Atkinson Hyperlegible Next**, feita para baixa visão. É mais estreita que a Poppins, então botões e abas quebram menos no celular.
- O rodapé com os telefones de emergência começava sempre fora da primeira tela, em todas as páginas. A causa era a altura mínima da página, que não contava a faixa de demonstração. Corrigido.

### Fase 4: documentação de produto e design
- `front/PRODUCT.md`: usuários (professor e coordenação), posição ("acolher e proteger, não punir") e compromissos (WCAG 2.1 AA, eMAG, LGPD), confirmados por você.
- `front/DESIGN.md`: o sistema visual atual, com o tema **"O Livro de Registro"**: cores, tipografia, raios, componentes e regras.
- `front/.impeccable/design.json`: arquivo de apoio que o impeccable gera junto.

### Depois do plano: data e horário do registro
O calendário e o relógio do navegador seguem o idioma dele (muitas vezes inglês). Viraram componentes próprios, em português:
- **Data:** atalhos Hoje, Ontem e Outro dia. "Outro dia" abre um calendário (Setembro de 2026, dom a sáb) que bloqueia datas futuras e funciona pelo teclado.
- **Horário:** listas de hora e minuto e um botão **Agora**.
- Embaixo de cada um, o valor por extenso: "Terça-feira, 29 de setembro de 2026", "Por volta das 9h40".

Os outros campos de data (busca, relatórios, prazos na Central) ainda usam o calendário do navegador.

## Como foi conferido

- `npm run build`, `npm run contrast` (todas as cores no padrão AA, claro e escuro) e `npm test` (118 testes do servidor) passaram.
- `npm run verificar`: os 8 roteiros do navegador passaram, e o axe auditou 208 telas sem nenhuma violação WCAG A/AA.
- Animações conferidas por estilos medidos no Playwright: escala de 0,97 ao pressionar, diálogo entrando em cerca de 200ms, spinner pulsando com movimento reduzido, hover desligado no toque.
- Detector do impeccable: de 3 achados para 1, que é um falso positivo conhecido (o marcador de data da linha do tempo).

## Login real e branches

O login por e-mail e senha já estava no código e foi testado no servidor local: senha errada avisa, a certa entra, **Sair** encerra a sessão, coordenação e direção pedem o código de um aplicativo autenticador, e 6 senhas erradas bloqueiam por 15 minutos. A sessão fica num cookie que a página não consegue ler.

| Branch | Situação |
| --- | --- |
| `front/melhorias-skills` | PR #5, base `front-descomplicado`. Tudo deste documento menos a seção de ambientes do README |
| `teste` | Demonstração para banca e testes, com pessoas fictícias e sem senha. Nunca entra na `main` |
| `login` | Login real. Mesmo código da `teste`; muda só a configuração na Vercel |

## O que ficou parado

1. **Banco na nuvem.** A Neon pede que os termos sejam aceitos na conta da Vercel ([link](https://vercel.com/ferreirabonfimrafael-1561s-projects/~/integrations/accept-terms/neon?source=cli)). Depois disso: criar o banco em São Paulo, o acesso restrito do app, o banco de teste da `login` e o de produção só com a IMSIL.
2. **Endereço público da demonstração.** Os previews da Vercel pedem login da própria Vercel. Proposta: um segundo projeto, `cuidar-registrar-demo`, com a `teste` como produção.
3. **Primeira conta de produção.** Falta o nome e o e-mail reais da direção. A conta exige aplicativo autenticador e é criada pelo computador de quem administra.
4. **Decisões para confirmar no preview do PR #5:** a fonte nova (o zero cortado aparece em "190" e "2026-000483") e "Incluir no plano" escondido durante a triagem.
5. **Outros campos de data** podem usar o calendário novo.
