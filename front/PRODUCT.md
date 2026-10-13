# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Duas pessoas guiam as decisões de interface, com o mesmo peso:

- **Professor(a):** registra o que viu ou ouviu, muitas vezes no intervalo e pelo celular, logo depois do fato. Precisa terminar rápido e sem medo de errar; o rascunho fica salvo no aparelho até o envio.
- **Coordenação e direção:** conduzem os casos na Central de gestão, no computador. Fazem a triagem, cumprem as providências do protocolo, comunicam a família e o Conselho Tutelar, acompanham devolutivas e encerram com justificativa.

Também usam o sistema, em papel secundário: referente de proteção, apoio escolar, regional e secretaria (busca, relatórios agregados, administração) e a família, que confirma a ciência de uma comunicação por um link.

## Product Purpose

Registrar, acompanhar e prevenir ocorrências em escolas públicas. Sucesso é cada ocorrência chegar a quem conduz, com as providências obrigatórias cumpridas ou justificadas, a família e a rede de proteção avisadas quando a lei exige, e o histórico preservado.

## Positioning

Acolher e proteger, não punir. O registro existe para cuidar do estudante e prevenir a repetição. O sistema segue o protocolo legal (ECA, Decreto 9.603/2018, Lei 13.431/2017, Lei 14.811/2024) sugerindo providências por tipo de caso, mas quem conduz decide. Na rede estadual de São Paulo, convive com a Plataforma Conviva (Placon) sem substituí-la: cada caso mostra se já foi lançado lá e com qual código.

## Operating Context

- Escola piloto: E.E. Irmã Maria de Santo Inocêncio Lima (IMSIL), Limeira, rede estadual de São Paulo, ligada à Unidade Regional de Ensino de Limeira.
- Arquitetura multi-rede: cada rede de ensino é um inquilino isolado (rede, regional, escola), com protocolo próprio.
- Fluxo do caso: registro em 3 passos → triagem → providências, escuta, encaminhamentos com devolutiva, plano de apoio, comunicação à família e ofício ao Conselho Tutelar → encerramento com justificativa e reavaliação opcional.
- Em risco imediato, a orientação é agir antes de registrar: acolher, chamar a direção, ligar para os serviços de emergência.

## Capabilities and Constraints

- Front em React + TypeScript + Vite; API simulada no navegador (MSW) com o mesmo contrato do servidor real (Hono + PostgreSQL, Vercel). Ver `docs/contrato-para-o-backend.md`.
- Protótipo acadêmico (TCC), sem vínculo oficial com a Secretaria da Educação.
- O front esconde o que o perfil não pode ver; a garantia de acesso é do backend.
- Fora do escopo atual: IA de classificação, app nativo, painel público, automação de sanções, envio real de e-mail ou SMS.
- Testes com pessoas (usabilidade e leitor de tela) ainda pendentes; ver `docs/pendencias.md`.

## Evidence on Hand

- Rede e escola reais; pessoas, turmas e casos fictícios (`compartilhado/`).
- Base legal e fontes em `docs/gestao-da-ocorrencia.md`.
- Não existem depoimentos, números de uso ou resultados de piloto. Nada disso pode ser inventado.

## Product Principles

1. Acolher antes de registrar: a segurança do estudante vem antes do formulário.
2. O sistema sugere, quem conduz decide: providências vêm do protocolo, com justificativa quando não se aplicam.
3. Descrever o fato, não a pessoa: a linguagem evita rótulos sobre estudantes.
4. Cada um vê só o que precisa: sigilo por perfil e por pessoa envolvida.
5. Nada se apaga: correções viram adendo identificado e o histórico fica.

## Accessibility & Inclusion

- WCAG 2.1 nível AA e eMAG nos caminhos críticos, com contraste conferido por script (`npm run contrast`) e auditoria automática (axe) nos roteiros de verificação.
- LGPD e sigilo: pessoas com visibilidade restrita aparecem ocultas; a comunicação à família não pode citar outros estudantes (o sistema bloqueia o envio).
