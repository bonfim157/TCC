# Cuidar e Registrar: front-end

Interface do sistema de ocorrências escolares. Fases F1 a F4 construídas; F5 (testes com pessoas) adiada. Plano e pendências em [`../docs/`](../docs/plano-de-escopo.md).

## Como rodar

```bash
npm install        # na raiz do repositório (workspaces)
npm run dev        # http://localhost:5173
npm run build      # checagem de tipos + build de produção
npm run contrast   # confere o contraste WCAG AA das cores de todas as redes
```

Não há backend. Uma API simulada (MSW) responde no próprio navegador. O que é enviado fica guardado neste navegador, compartilhado entre abas; o Guia da interface tem um botão para restaurar os dados iniciais.
Para abrir já com uma rede escolhida, use `?rede=sp` (IMSIL, rede estadual SP) ou `?rede=teste` (rede fictícia, para testar o isolamento e a regional com duas escolas).

### Pessoas de demonstração (rede SP, IMSIL)

| Pessoa | Perfil | Para ver |
| --- | --- | --- |
| Ana Ribeiro | Professora (também na rede de testes) | Registrar, meus registros, troca de rede |
| Carlos Mendes | Coordenação | Central de gestão |
| Beatriz Nunes | Direção | Central, encerramento, nomes restritos |
| Joana Prado | Referente de proteção | Central |
| Roberto Lima | Apoio | Registro com acesso limitado |
| Marta Siqueira | Unidade Regional | Visão agregada |
| Paulo Arantes | Secretaria | Relatórios e administração da rede |

Na rede de testes (`?rede=teste`): Luís Farias (coordenação da Escola Fictícia de Testes) e Rita Moraes (Regional Fictícia, com duas escolas, para ver a visão regional somando escolas).

## Verificação no navegador

Com `npm run dev` rodando em outro terminal:

```bash
npx playwright install chromium   # uma vez por máquina
npm run verificar                 # roda todos os roteiros, de F1 a F5
```

| Roteiro | O que confere |
| --- | --- |
| `f1-regressao.mjs` | Timbre por rede, tema escuro, foco, texto em 130% sem rolagem lateral |
| `f2-registro.mjs` | Registro em 3 passos, rascunho, duplicata, sem conexão, adendo, visibilidade de nomes |
| `f3-central.mjs` | Central: ofício ao CT, vazamento de nomes, encerramento, devolutiva, triagem, ciência da família |
| `f3-atualizacao.mjs` | Fila e caso se atualizam quando outra pessoa age; servidor recusa nome de terceiros |
| `f4-gestao.mjs` | Busca, relatórios com supressão, exportação com motivo, administração, auditoria |
| `f4-regional.mjs` | Regional com duas escolas, sem misturar redes |
| `f5-acessibilidade.mjs` | axe-core (WCAG 2.1 A e AA) nas telas principais, temas claro e escuro, 360 e 1440px; falha se houver violação crítica ou grave |

Os roteiros ficam em `scripts/verificacao/` e as capturas de tela em `output/verificacao/` (fora do Git). A auditoria automática não substitui a passada com leitor de tela (NVDA), que continua em Pendências.

## Estrutura

| Pasta | Conteúdo |
| --- | --- |
| `src/api/contract.ts` | Contrato de dados com o backend: tipos, rotas e cabeçalhos obrigatórios. Explicado em [`docs/contrato-para-o-backend.md`](../docs/contrato-para-o-backend.md) |
| `src/mocks/` | API simulada: regras de acesso e auditoria (`base.ts`), registro (`handlers.ts`), Central (`central.ts`), busca, relatórios e administração (`gestao.ts`), protocolo de providências e modelos (`protocolo.ts`), dados fictícios (`seed.ts`) |
| `src/design/themes.ts` | Cores da base e de cada rede; fonte verificada por `npm run contrast` |
| `src/components/` | Componentes do design system |
| `src/layout/` | Cabeçalho, barra de contexto (rede, escola, perfil), navegação, rodapé, aparência e atalhos A+/A− |
| `src/state/` | Sessão, perfis e matriz de acesso, preferências, rascunhos |
| `src/pages/` | Telas: entrar, início, registrar, meus registros, caso, central, ciência, buscar, relatórios, administração, guia, estados |
| `scripts/` | Verificação de contraste e roteiros de verificação no navegador |

## Decisões

- **Multi-rede:** a rede é o inquilino. Toda chamada envia `X-Rede-Id`; a API recusa com 403 qualquer registro de outra rede.
- **Acento por rede:** cada rede tem sua cor, com par de texto verificado nos modos claro e escuro.
- **Celular:** até 980px o topo vira uma linha (marca e botão Menu) e o contexto recolhe numa linha com escola e perfil; até 820px as tabelas viram cartões com o nome de cada coluna. `node scripts/capturas-celular.mjs <largura>` captura todas as telas e mede rolagem lateral, onde começa o conteúdo e alvos de toque.
- **Fonte local:** Poppins (400 a 700) servida pelo próprio app, sem chamadas a terceiros.
- **Visual:** linguagem de portal de serviço público de SP (referência: Delegacia Digital da Polícia Civil): faixa escura no topo, marca centralizada, navegação em linha com ícones, botões em pílula e dourado. O dourado de botões é escurecido (`#8A6B1F`, 5:1 com texto branco); o dourado claro só decora.
- **Permissões na tela não são segurança:** a matriz em `src/state/perfis.ts` só decide o que mostrar; o backend precisa aplicar as regras de `src/mocks/base.ts`.

O **Guia da interface** (`/guia`) reúne cores, tipografia, componentes, estados do sistema e a prova de isolamento entre redes.
