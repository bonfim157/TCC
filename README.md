# Cuidar e Registrar: sistema de ocorrências escolares (TCC)

Sistema para registrar, acompanhar e prevenir ocorrências em escolas públicas, com foco em acolhimento e proteção, não em punição. Escola piloto: E.E. Irmã Maria de Santo Inocêncio Lima (IMSIL), Limeira, rede estadual de São Paulo.

Protótipo acadêmico, sem vínculo oficial com a Secretaria da Educação. Pessoas e casos nos dados de demonstração são fictícios.

## Onde está cada coisa

| Caminho | Conteúdo |
| --- | --- |
| [`docs/plano-de-escopo.md`](docs/plano-de-escopo.md) | Plano do front: fases, telas, critérios de aceite, decisões e riscos |
| [`docs/pendencias.md`](docs/pendencias.md) | Tudo o que ficou para depois, com situação |
| [`docs/gestao-da-ocorrencia.md`](docs/gestao-da-ocorrencia.md) | Como a gestão escolar trata uma ocorrência, base legal e fontes |
| [`docs/registro-de-execucao.md`](docs/registro-de-execucao.md) | O que foi construído e verificado em cada fase |
| [`docs/contrato-para-o-backend.md`](docs/contrato-para-o-backend.md) | Rotas, erros e regras de acesso que o backend precisa seguir |
| [`docs/plano-backend.md`](docs/plano-backend.md) | Plano do back-end, banco de dados, hospedagem na Vercel, segurança e LGPD |
| [`front/`](front/README.md) | Aplicação web (React, TypeScript, Vite) com API simulada |
| `servidor/`, `api/` | API (Hono) para Vercel Functions, banco PostgreSQL, testes |
| `compartilhado/` | Contrato de dados, esquemas de validação, protocolo e dados fictícios |
| `relatorio-sistema-ocorrencias-escolas-publicas.docx` | Relatório completo do sistema (v1.0) |
| `documentacao-prototipo.docx` | Documentação do protótipo HTML inicial |
| `prototipo-ocorrencias.html` | Protótipo HTML inicial, referência visual |

## Rodar o front

```bash
npm install            # na raiz: instala front, servidor e compartilhado
npm run dev            # demonstração com API simulada: http://localhost:5173/?rede=sp
```

Com o servidor real (banco local, dados fictícios), em dois terminais:

```bash
npm run dev:servidor           # API em http://localhost:3000/api
VITE_API=real npm run dev      # front usando o servidor
npm test                       # testes do servidor
```

No modo real, o login por e-mail e senha fica em `/entrar?modo=senha` (pessoas fictícias: `ana@demo.tcc`, `carlos@demo.tcc`..., senha `demonstracao-2026`). Detalhes em [`docs/plano-backend.md`](docs/plano-backend.md).

Detalhes, verificação e estrutura em [`front/README.md`](front/README.md).

## Situação

Front completo em 29/09/2026 (fases F1 a F4 e a parte técnica da F5). Falta o que depende de pessoas, decisões da gestão e backend. Veja a situação atual no [plano de escopo](docs/plano-de-escopo.md) e em [pendências](docs/pendencias.md). Próxima etapa: [plano do back-end](docs/plano-backend.md).

## Links externos

- [Cópia antiga do plano no Claude Docs](https://claude.ai/code/artifact/419a1396-84bd-4ee3-8340-e1d20e260b8d): desatualizada; a versão oficial é [`docs/plano-de-escopo.md`](docs/plano-de-escopo.md)
- [Artifact no Claude](https://claude.ai/artifact/96r5ojTWWnHQBnAZmcTqek)
