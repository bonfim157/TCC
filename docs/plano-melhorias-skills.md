# Plano de melhorias do front (análise com skills, 13/10/2026)

Fontes: graphify (G), playwright (P, 11 capturas), impeccable (I), Emil Kowalski (E), taste skill (T).
A análise só leu o código; nenhuma tela foi alterada.

## Fase 1 — Segurança e fluxo (P1)
- [x] 1. **Pergunta de risco no topo do registro** (PassoFato.tsx:120). "Sim" leva direto à orientação de emergência. [I, P]
- [x] 2. **Fila da Central não esconde casos** (central.css:27, `max-height: 72vh`). Casos sem responsável sobem na ordenação; sem rolagem interna no desktop. [I, P]

## Fase 2 — Clareza do caso (P2)
- [x] 3. **Dividir CasoNaCentral.tsx** em Providencias / AcoesDoCaso / ConvivaSP / AbasDoCaso, sem mudar visual. Facilita 4 a 6. [G]
- [x] 4. **Relato antes das providências** no painel do caso. [I]
- [x] 5. **Ações do caso por fase:** 1 primária, "Comunicar…" agrupado, o resto contextual. [I]
- [x] 6. **Marcador de providência** deixa de parecer checkbox (ou vira o próprio controle). [I]
- [x] 7. **Indicadores:** só "urgentes" em vermelho; os outros em âmbar. [I, T]
- [x] 8. **Abas do caso no celular** com pista de rolagem ou quebra em linhas. [I, P]
- [x] 9. **Movimento reduzido** sem matar o feedback: spinner e esqueleto viram estáticos/pulso de opacidade. [I, E]

## Fase 3 — Acabamento (P2/P3)
- [x] 10. `:active` com scale(0.97) nos botões + token `--ease-out`. [E]
- [x] 11. Diálogo e aviso com entrada via `@starting-style` (200ms) e saída mais rápida. [E]
- [x] 12. Hover só em `(hover: hover) and (pointer: fine)`. [E]
- [x] 13. `.aviso` sem faixa lateral de 5px; `.protocolo` sem filete de 6px. [I]
- [x] 14. "Prazos próximos" → separar "Atrasados". [I]
- [x] 15. Testar Atkinson Hyperlegible ou Inter no lugar de Poppins; tirar o peso 500. [T] Resultado: adotada a Atkinson Hyperlegible Next (página do caso no celular ~8% mais curta, abas cabem duas por linha); pesos 400, 500 e 600, com o negrito em 600.
- [x] 16. Tela de entrar: faixa de emergência visível sem rolar. [T, P] Causa achada: a altura mínima de 100dvh não descontava a faixa de demonstração, então o rodapé de toda página começava 35px abaixo da primeira tela.

## Fase 4 — Documentação
- [x] 17. `/impeccable init` (PRODUCT.md) e `/impeccable document` (DESIGN.md). [I] Resultado: `front/PRODUCT.md` (confirmado em entrevista: professor e coordenação, "acolher e proteger", WCAG/eMAG e LGPD), `front/DESIGN.md` ("O Livro de Registro") e `front/.impeccable/design.json`. Detector do impeccable: de 3 achados para 1, o falso positivo da linha do tempo.

## Fora do plano (de propósito)
Sem animação na troca de caso, filtros e abas (uso contínuo). Sem trocar ícones agora. Sem redesenho.

Análise feita na branch `front-descomplicado` (PR #3); as referências de linha valem para ela.

**Andamento:** execução na branch `front/melhorias-skills`; cada item marcado foi feito e conferido no navegador.

---

## Graphify — mapa do código (front/src)

55 arquivos de código, ~34 mil palavras, só extração estrutural (AST, sem custo de tokens: 0 entrada / 0 saída).
Grafo: 472 nós, 1801 arestas, 16 comunidades. O grafo foi gerado fora do repositório.
Saúde: 187 arestas apontam para fora do recorte (imports de @tcc/compartilhado), esperado por ter analisado só front/src.

### Nós centrais (mais conexões)
useSessao() 53 · Botao() 41 · Aviso() 35 · EstadoDaCarga() 35 · useApi() 34 · base() dos ícones 32 · CasoNaCentral() 31 · CampoTexto() 27 · api() 26 · App() 24

### Coesão das comunidades (0 a 1)
Cliente da API e páginas 0,08 · Temas e preferências 0,07 · Mock de gestão 0,11 · Componentes de interface 0,12 · Central e revisão 0,17 · Regras de acesso do mock 0,24

### Achados para o plano
- **CasoNaCentral.tsx (34 KB, 31 conexões)** concentra providências, ações, Conviva, abas e diálogos. É o maior arquivo e é exatamente onde as outras skills acharam os problemas de hierarquia. Dividir em `Providencias`, `AcoesDoCaso`, `ConvivaSP`, `AbasDoCaso` antes de mexer no visual.
- **Guia.tsx (24 KB)** e **Administracao.tsx (18 KB)** são os próximos candidatos.
- **useSessao() é ponte entre 8 comunidades.** Normal para sessão, mas qualquer mudança nele exige testar todas as áreas.
- Comunidade "Cliente da API e páginas" com coesão 0,08: páginas importam o cliente direto. Não é urgente.

---

## Impeccable — audit + critique (front/src)

⚠️ DEGRADED: single-context (detector rodou no mesmo contexto, antes da revisão de design; sem sub-agentes isolados).
Overlay no navegador: não injetado (live-server não iniciado, para não criar arquivos no projeto). Snapshot em `.impeccable/critique/` NÃO gravado: pedido de não alterar pastas.

### Audit técnico — 15/20 (Good)
| # | Dimensão | Nota | Achado principal |
|---|---|---|---|
| 1 | Acessibilidade | 3 | `npm run contrast`: todos os pares AA passam (claro e escuro). Marcador de providência parece checkbox mas não é clicável |
| 2 | Performance | 3 | Sem imagens pesadas; CasoNaCentral.tsx 34 KB num só componente |
| 3 | Tematização | 4 | Tokens em themes.ts, verificação de contraste automatizada, modo escuro coerente |
| 4 | Responsivo | 3 | Abas do caso cortam em "Encaminh…" sem indicação de rolagem no celular |
| 5 | Integridade | 2 | Faixa lateral de 5px em `.aviso`; filete de 6px em `.protocolo` arredondado; fila com corte em 72vh |

Detector: 3 ocorrências. `componentes.css:103` (.aviso border-left 5px) e `registro.css:63` (.protocolo border-top 6px em cartão arredondado) são reais. `registro.css:95` (.evento-quando no celular) é marcador de data da linha do tempo: falso positivo.

### Critique — Nielsen 28/40
| # | Heurística | Nota | Ponto |
|---|---|---|---|
| 1 | Status do sistema | 3 | "A fila se atualiza sozinha", contagens claras |
| 2 | Mundo real | 4 | Linguagem de escola, base legal citada em cada providência |
| 3 | Controle/liberdade | 3 | "Reabrir" e "Não se aplica" existem; rascunho local |
| 4 | Consistência | 2 | Caixa de seleção decorativa + botão "Marcar como cumprida"; 3 indicadores com o mesmo vermelho |
| 5 | Prevenção de erro | 3 | Diálogos de confirmação; validação por etapa |
| 6 | Reconhecer > lembrar | 3 | Relato do caso fica abaixo das providências: decide-se sem ver o fato |
| 7 | Eficiência | 2 | 7 ações no topo do caso com peso visual parecido |
| 8 | Minimalismo | 3 | Limpo, mas Agenda repete sob o caso aberto |
| 9 | Recuperação de erro | 3 | LimiteDeErro, mensagens em português claro |
| 10 | Ajuda | 2 | Guia e Dúvidas existem, mas o card "Primeira vez" some ao dispensar sem caminho de volta evidente |

Veredito de especificidade: autoral para o contexto (Conviva SP, ECA, Decreto 9.603, telefones de emergência no rodapé). Não é intercambiável.

### Problemas prioritários
- **[P1] "Alguém corre risco agora?" é a última pergunta do registro** (PassoFato.tsx:120). Num caso de risco, a pessoa preenche tipo, data, local e relato antes. Mover para o topo do passo 1, com resposta "Sim" levando direto à orientação de emergência. → /impeccable layout + clarify
- **[P1] Fila corta o caso que mais precisa de atenção** (central.css:27, `max-height: 72vh`). O 4º caso (2026-000484, sem responsável, 3 providências pendentes) fica escondido numa rolagem interna. Ordenar "sem responsável" acima ou tirar o limite de altura no desktop. → /impeccable layout
- **[P2] Marcador de providência parece checkbox** (CasoNaCentral.tsx:53). Clique nele não faz nada. Ou vira o próprio controle, ou vira um ícone de estado que não pareça campo. → /impeccable clarify
- **[P2] Relato abaixo das providências** no painel do caso: inverter (resumo do fato → providências). → /impeccable layout
- **[P2] Hierarquia das 7 ações do caso**: 1 primária + 5 secundárias iguais + 1 link. Agrupar ("Comunicar…" num menu) e mostrar só as que fazem sentido na fase atual. → /impeccable distill
- **[P2] `prefers-reduced-motion` mata tudo** (base.css:97-98): spinner e esqueleto giram a 0,01ms, ou seja, somem como feedback de carregamento. Trocar por versão estática (texto "Carregando…" ou pulso de opacidade). → /impeccable animate
- **[P3] Faixa lateral de 5px em `.aviso` e filete de 6px no protocolo**: trocar por fundo suave + ícone (já existe) e borda de 1px. → /impeccable polish
- **[P3] "Prazos próximos" lista só itens vencidos** (início da professora): renomear para "Prazos" ou separar "Atrasados". → /impeccable clarify

### Personas
- **Professora com pressa (celular, intervalo):** risco no fim do formulário; 9 tipos em grade exigem leitura de todos.
- **Coordenação (power user):** sem atalhos de teclado na fila; 7 botões por caso; caso sem responsável escondido.
- **Pessoa com baixa visão (A+):** A+/A− presente e bom; abas cortadas no celular sem pista de rolagem.

### Follow-ups sugeridos
`/impeccable init` (PRODUCT.md) e `/impeccable document` (DESIGN.md) para registrar o sistema atual.

---

## Emil Kowalski (design engineering) — movimento e resposta ao toque

Leitura geral: o projeto acerta no que mais importa, que é não animar o que é frequente (troca de caso na fila, filtros, navegação). O que falta é resposta ao clique e entrada dos elementos ocasionais (diálogos, avisos).

| Antes | Depois | Por quê |
| --- | --- | --- |
| `.btn` sem `:active` (componentes.css:9) | `.btn:active:not(:disabled) { transform: scale(0.97) }` + `transform 160ms var(--ease-out)` na transição | Botão precisa confirmar que ouviu o toque, principalmente no celular |
| Sem curvas próprias; transições usam `ease` padrão (.15s) | Token `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` em base.css e uso em botões, chevrons e cartões | As curvas nativas do CSS são fracas; uma curva só deixa tudo coerente |
| `dialog.dialogo` abre seco com `showModal()` (estrutura.tsx:149, componentes.css:145) | `opacity 0→1` + `scale(0.96)→1` com `@starting-style`, 200ms ease-out; `::backdrop` com fade; saída mais rápida (150ms) | Diálogo é ocasional, então pode animar; aparecer do nada parece quebrado. Modal fica centralizado (sem transform-origin no gatilho) |
| Aviso flutuante com `@keyframes entra` (componentes.css:159) | Transição com `@starting-style` (opacity + translateY(8px)) e saída animada | Keyframes recomeçam do zero quando dois avisos chegam juntos; transição se ajusta no meio |
| `prefers-reduced-motion` zera tudo a 0,01ms (base.css:97) | Tirar só movimento (`transform`); manter fades de opacidade; spinner vira pulso de opacidade, esqueleto fica estático | Movimento reduzido é menos movimento, não zero feedback. Hoje o carregamento fica sem nenhum sinal |
| `:hover` sem condição em `.fila-item`, `.indicador`, `.cartao-registro`, `.tabela tr` | Envolver em `@media (hover: hover) and (pointer: fine)` | No toque o hover "gruda" depois do tap |
| `.cartao-registro` transiciona `transform` (registro.css:157) mas nada o move | Remover `transform` da lista de propriedades, ou usar no `:active` (scale 0.98) | Transição declarada sem uso é ruído |
| Providência muda de "pendente" para "cumprida" sem transição | Realce breve do item (fundo `--okSoft` some em 600ms) após confirmar o diálogo | Indica a mudança de estado no lugar em que o olho está; acontece poucas vezes por dia |

**O que não fazer:** nada de animação na troca de caso da fila, nos indicadores-filtro ou nas abas. São ações de uso contínuo da coordenação, e animá-las deixaria tudo mais lento. Nada de stagger na fila.

---

## Taste skill (design-taste-frontend) — auditoria, modo redesenho-preservar

Leitura: sistema de serviço público para equipe escolar (professores, coordenação, direção), com linguagem de confiança e acessibilidade, tendendo a algo próximo de GOV.UK/USWDS em sobriedade.
Dials: VARIANCE 3 · MOTION 2 · DENSITY 5 (preset "Public-sector service").
Escopo: a skill se declara fora de escopo para painéis e formulários em etapas (seção 13). Só as regras de marca, cor, forma, tipografia, estados e "AI tells" se aplicam aqui.

### Passa
- Zero travessões (—) no texto visível dos .tsx.
- Uma cor de destaque por rede, tokens únicos, modo escuro testado (contraste AA nos dois).
- Raios com regra documentada (8 controles · 12 superfícies · pílula só em etiquetas).
- Estados de carregamento (esqueleto), vazio e erro existem.
- Fonte servida localmente via @fontsource (não por <link> do Google).
- Pontos coloridos nas etiquetas carregam estado real (e "urgente" vira losango, o que ajuda quem não distingue cor). Justificado.

### Achados
- **[P2] Poppins é larga para interface densa.** Faz "Ofício ao Conselho Tutelar" quebrar em 2 linhas no celular e aperta a barra de abas. Testar Atkinson Hyperlegible (feita para baixa visão) ou Inter, que a skill aceita para setor público. Mudança só de token `--sans`.
- **[P2] Três indicadores vermelhos iguais na Central.** "urgentes", "Conselho Tutelar" e "devolutiva atrasada" têm o mesmo peso de alarme; quando tudo é urgente, nada é. Só "urgentes" em vermelho; os outros em âmbar (`--warn`).
- **[P3] Ícones desenhados à mão** (components/icones.tsx, 30 paths). A skill pede biblioteca (Phosphor ou Tabler) para traço uniforme. Baixo risco atual porque estão coerentes; considerar só se faltarem ícones novos.
- **[P3] 4 pesos de Poppins carregados** (400/500/600/700). 500 quase não aparece; tirar reduz download.
- **[P3] Tela de entrar:** a faixa "Em caso de risco agora" fica parcialmente abaixo da dobra em 1366×800. É conteúdo de segurança; subir ou compactar.
