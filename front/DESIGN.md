---
name: Cuidar e Registrar
description: Registro e acompanhamento de ocorrências escolares, para acolher e proteger
colors:
  azul-de-escola: "#1F5AA6"
  azul-de-escola-tinta: "#1A4F93"
  azul-de-escola-suave: "#E7EEF8"
  azul-de-escola-decor: "#A9C3E6"
  papel: "#F7F7F9"
  superficie: "#FFFFFF"
  tinta: "#1E1F2E"
  tinta-suave: "#4B4D63"
  linha: "#E1E2E9"
  linha-forte: "#878A9E"
  urgente: "#9A3412"
  urgente-suave: "#F7E6DD"
  atencao: "#7A4F00"
  atencao-suave: "#FBF1D9"
  ok: "#1E6B3A"
  ok-suave: "#E1F0E6"
  neutro: "#4F5864"
  neutro-suave: "#E7E9EC"
  veu: "rgb(10 14 18 / .55)"
  sombra-leve: "rgb(0 0 0 / .14)"
  sombra-media: "rgb(0 0 0 / .18)"
  sombra-forte: "rgb(0 0 0 / .2)"
typography:
  protocolo:
    fontFamily: "Atkinson Hyperlegible Next, Segoe UI, Arial, sans-serif"
    fontSize: "2.6rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.02em"
  caso:
    fontFamily: "Atkinson Hyperlegible Next, Segoe UI, Arial, sans-serif"
    fontSize: "2.4rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "0.01em"
  headline:
    fontFamily: "Atkinson Hyperlegible Next, Segoe UI, Arial, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Atkinson Hyperlegible Next, Segoe UI, Arial, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 600
    lineHeight: 1.25
  subtitle:
    fontFamily: "Atkinson Hyperlegible Next, Segoe UI, Arial, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: "Atkinson Hyperlegible Next, Segoe UI, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    fontFeature: "tnum"
  headline-celular:
    fontFamily: "Atkinson Hyperlegible Next, Segoe UI, Arial, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
  compacto:
    fontFamily: "Atkinson Hyperlegible Next, Segoe UI, Arial, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 500
    lineHeight: 1.4
  label:
    fontFamily: "Atkinson Hyperlegible Next, Segoe UI, Arial, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.4
  micro:
    fontFamily: "Atkinson Hyperlegible Next, Segoe UI, Arial, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.4
  micro-celular:
    fontFamily: "Atkinson Hyperlegible Next, Segoe UI, Arial, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 400
    lineHeight: 1.4
  mono:
    fontFamily: "ui-monospace, Cascadia Mono, Consolas, monospace"
    fontSize: "1.125rem"
    fontWeight: 600
rounded:
  fino: "4px"
  controle: "8px"
  superficie: "12px"
  pilula: "999px"
spacing:
  e1: "4px"
  e2: "8px"
  e3: "12px"
  e4: "16px"
  e5: "24px"
  e6: "32px"
  e7: "48px"
  e8: "64px"
components:
  button-primary:
    backgroundColor: "{colors.azul-de-escola}"
    textColor: "{colors.superficie}"
    rounded: "{rounded.controle}"
    padding: "0 24px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.controle}"
    padding: "0 24px"
    height: "44px"
  button-danger:
    backgroundColor: "{colors.urgente}"
    textColor: "{colors.superficie}"
    rounded: "{rounded.controle}"
    padding: "0 24px"
    height: "44px"
  input:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.controle}"
    padding: "12px 16px"
    height: "44px"
  painel:
    backgroundColor: "{colors.superficie}"
    rounded: "{rounded.superficie}"
    padding: "24px"
  etiqueta-urgente:
    backgroundColor: "{colors.urgente-suave}"
    textColor: "{colors.urgente}"
    typography: "{typography.label}"
    rounded: "{rounded.pilula}"
    padding: "3px 12px"
  etiqueta-atencao:
    backgroundColor: "{colors.atencao-suave}"
    textColor: "{colors.atencao}"
    typography: "{typography.label}"
    rounded: "{rounded.pilula}"
    padding: "3px 12px"
  etiqueta-ok:
    backgroundColor: "{colors.ok-suave}"
    textColor: "{colors.ok}"
    typography: "{typography.label}"
    rounded: "{rounded.pilula}"
    padding: "3px 12px"
---

# Design System: Cuidar e Registrar

## Overview

**Creative North Star: "O Livro de Registro"**

O sistema se comporta como o livro de ocorrências da escola feito com cuidado: pauta limpa, data na margem, o fato escrito antes de qualquer decisão e nada que se apague. A linha do tempo do caso é literalmente uma folha de livro (data na margem com filete, texto na pauta), e os adendos aparecem como anotação à parte, nunca como edição do original.

A densidade é de ferramenta de trabalho, não de vitrine: coordenação e direção leem e agem em sequência, professores registram com pressa no celular. Por isso a interface é sóbria e firme, com bordas finas, sem sombras de destaque, alvos de toque de 44px e cor reservada para ação e estado. O tom é institucional sem imitar órgão oficial: um azul calmo por rede, neutros frios e tipografia desenhada para baixa visão.

A cor nunca carrega sozinha um significado. Toda etiqueta de estado tem texto, e a urgente ganha um losango no lugar do ponto, para quem não distingue vermelho de âmbar.

**Key Characteristics:**
- O fato antes das ações: o relato abre o caso, a pergunta de risco abre o registro.
- Um acento por rede; o resto é neutro e cores de estado.
- Planos chapados com borda de 1px; profundidade só no diálogo.
- Tudo cabe numa coluna no celular; nada rola de lado escondido.
- Contraste AA verificado por script nos modos claro e escuro.

## Colors

Paleta fria e contida: um azul de rede sobre papel quase branco, com quatro cores de estado que só aparecem quando há algo a dizer.

### Primary
- **Azul de Escola** (`azul-de-escola`): botão principal, aba e item de navegação ativos, anel de foco. É o acento da rede estadual de SP; cada rede declara o seu em `src/design/themes.ts`, com o próprio "texto sobre acento".
- **Azul de Escola, tinta** (`azul-de-escola-tinta`): links e textos coloridos sobre superfície, mais escuro que o acento para passar de 4,5:1 em texto pequeno.
- **Azul de Escola, suave** (`azul-de-escola-suave`): seleção (opção marcada, caso aberto na fila, grupo "Comunicar" aberto) e aviso informativo.
- **Azul de Escola, decoração** (`azul-de-escola-decor`): círculos de ícone e filetes. Nunca leva texto nem foco.

### Neutral
- **Papel** (`papel`): fundo das páginas.
- **Superfície** (`superficie`): painéis, campos, cartões e diálogos.
- **Tinta** (`tinta`): texto principal. **Tinta suave** (`tinta-suave`): texto de apoio, metadados, ajuda de campo.
- **Linha** (`linha`): divisórias e bordas de painel. **Linha forte** (`linha-forte`): borda de campo e de botão secundário (3:1 sobre superfície).

### Estado
- **Urgente** (`urgente` sobre `urgente-suave`): prioridade urgente, risco imediato, erro, ação destrutiva.
- **Atenção** (`atencao` sobre `atencao-suave`): pendência, atraso, devolutiva vencida, caso sem responsável.
- **Ok** (`ok` sobre `ok-suave`): providência cumprida, ciência confirmada, caso encerrado.
- **Neutro** (`neutro` sobre `neutro-suave`): situações sem urgência (recebido, recomendada, não se aplica).

### Camadas
- **Véu** (`veu`): fundo escurecido atrás do diálogo.
- **Sombras** (`sombra-leve`, `sombra-media`, `sombra-forte`): só em camadas que flutuam sobre a página (menus abertos, painel do menu no celular, notificação). Nunca em painéis em repouso.

### Named Rules
**The Um Vermelho Rule.** Vermelho é só para urgência real: risco, prioridade urgente, erro. Atraso e pendência são âmbar. Se três indicadores lado a lado ficam vermelhos, o alarme perde a força.

**The Acento da Rede Rule.** O azul pertence à rede, não ao produto. Nenhum componente fixa o hex do azul; tudo passa por `--accent`, `--accent-ink`, `--accent-soft` e `--decor`.

**The Contraste Conferido Rule.** Todo par novo de cor entra em `src/design/themes.ts` e passa por `npm run contrast` (AA, claro e escuro) antes de ser usado.

## Typography

**Display Font:** Atkinson Hyperlegible Next (com Segoe UI, Arial)
**Body Font:** Atkinson Hyperlegible Next

**Character:** Uma família só, desenhada pelo Braille Institute para baixa visão: letras parecidas (0 e O, I e l) são fáceis de separar, o que importa em protocolos e telefones. Títulos se distinguem pelo peso, não por outra família.

### Hierarchy
- **Headline** (600, 28px, 1.25): título de página ("Central de gestão", "O que aconteceu?").
- **Title** (600, 22px, 1.25): título de seção e de caso.
- **Subtitle** (600, 18px, 1.25): título de painel ("Providências", "Prazos").
- **Body** (400, 16px, 1.6): texto corrido, com medida máxima de 68 caracteres. Números tabulares em toda a interface, para protocolos e datas alinharem.
- **Label** (500, 13px): etiquetas, ajuda de campo, metadados.
- **Protocolo** (600, 2,6rem, 1): o número que a pessoa leva depois de enviar um registro. **Caso** (600, 2,4rem): número do caso na página completa.
- **Compacto** (500, 15px): navegação, filtros, dados de cartão e botões em duas colunas no celular.
- **Micro** (12px e 11px): só a faixa de demonstração e o nome da rede no topo do celular.
- **Mono** (Cascadia Mono): só nos exemplos de código do Guia da interface.

### Named Rules
**The Três Pesos Rule.** Só 400, 500 e 600 são carregados; o negrito usa 600. Peso novo é download novo.

**The A+ Rule.** Tamanhos em rem, sobre uma escala que o usuário controla (botões A+ e A− e opção em Aparência). Nada de px fixo em texto.

## Layout

Coluna central de até 1280px com respiro lateral de 24px; a Central de gestão abre a até 1500px, com a fila (280 a 340px) ao lado do caso. Espaçamento em múltiplos de 4px (`e1` a `e8`).

Abaixo de 1400px o caso empilha: o relato, as ações, depois as providências, depois as abas. Abaixo de 1000px fila e caso se alternam (o caso ganha "Voltar para a fila"). Abaixo de 600px os botões de ação viram duas colunas com a ação principal na linha inteira, e as tabelas viram cartões.

A página toda conta a faixa de demonstração na altura mínima (em `#root`), para o rodapé com os telefones de emergência caber na primeira tela quando há espaço.

### Named Rules
**The Nada Escondido Rule.** Nenhuma lista importante rola dentro de uma caixa e nenhuma aba rola de lado. Se não cabe, quebra de linha.

## Elevation & Depth

Plano por padrão. Painéis e cartões usam borda de 1px na cor `linha` e uma sombra quase imperceptível (`0 1px 2px` a 5% de tinta) só para descolar do papel. Seleção é tonal (fundo suave e borda no acento), não sombra.

O diálogo é a única camada elevada: sombra ampla (`0 24px 64px` a 28%) e fundo escurecido a 55%. Ele entra em 200ms a partir de 96% do tamanho e sai mais rápido.

### Named Rules
**The Sem Faixa Lateral Rule.** Avisos e cartões não ganham faixa grossa de cor num lado só. Estado é fundo suave, ícone e borda de 1px.

## Shapes

Quatro raios com regra: 4px para detalhes internos (código, esqueleto de carregamento, adendo da linha do tempo, barras de gráfico), 8px para controles (botão, campo, aba em coluna estreita), 12px para superfícies (painel, aviso, diálogo, cartão de opção) e pílula só para etiquetas de estado. Bordas de 1px nas superfícies, 1,5px em campos e botões secundários. A etiqueta urgente troca o ponto por um losango.

## Components

### Buttons
- **Shape:** cantos suaves (8px), altura mínima de 44px.
- **Primary:** fundo no acento da rede, texto branco. Uma por grupo de ações, escolhida pela fase do caso.
- **Secondary:** superfície com borda de 1,5px em linha forte; a borda escurece no hover.
- **Texto:** link sublinhado para ações de menor peso ("Encerrar caso", "Não se aplica").
- **Perigo:** fundo urgente, só dentro de diálogo de confirmação destrutiva.
- **Hover / Focus / Active:** hover só com mouse; foco com anel de 3px no acento; ao pressionar, cede a 97% em 160ms.

### Chips
- **Style:** etiqueta em pílula, texto de 13px com ponto (ou losango, na urgente) da mesma cor do texto, fundo suave do estado.
- **State:** só informam; não são clicáveis.

### Cards / Containers
- **Corner Style:** 12px.
- **Background:** superfície sobre papel.
- **Shadow Strategy:** plano (ver Elevation & Depth).
- **Border:** 1px em linha.
- **Internal Padding:** 24px no computador, 16px no celular.

### Inputs / Fields
- **Style:** superfície, borda de 1,5px em linha forte, 8px, altura de 44px. Rótulo acima, ajuda abaixo do rótulo, erro abaixo do campo com ícone.
- **Focus:** borda e anel no acento.
- **Error / Disabled:** borda urgente com `aria-invalid`; desabilitado em neutro suave.

### Navigation
- Abas horizontais com ícone de 20px, texto em tinta suave e item atual em tinta do acento com filete de 3px embaixo. No celular, viram menu.

### Linha do tempo
- Folha de livro: data na margem (132px) com filete no acento, texto na pauta. Adendo com filete tracejado em âmbar e fundo de atenção. No celular, a data vai para cima com filete à esquerda.

### Indicadores da Central
- Contadores que também filtram a fila (`aria-pressed`). Só "urgentes" fica vermelho; pendência e atraso em âmbar; o filtro ativo ganha anel no acento.

## Do's and Don'ts

### Do:
- **Do** começar o caso pelo relato e o registro pela pergunta de risco.
- **Do** usar uma única ação principal por grupo, e agrupar comunicações em "Comunicar" quando houver mais de uma.
- **Do** escrever a situação (Cumprida, Pendente, Não se aplica) em vez de depender de cor ou ícone.
- **Do** manter alvos de toque de 44px e conferir contraste com `npm run contrast`.
- **Do** animar só o que é ocasional (diálogo, aviso) e manter sem animação o que se repete (troca de caso, filtros, abas).

### Don't:
- **Don't** usar vermelho para atraso ou pendência.
- **Don't** desenhar um quadrado vazio que pareça caixa de marcar sem ser clicável.
- **Don't** colocar faixa grossa de cor num lado de aviso ou cartão.
- **Don't** esconder casos ou abas em rolagem interna ou lateral.
- **Don't** fixar o azul da rede num componente; use os tokens de acento.
