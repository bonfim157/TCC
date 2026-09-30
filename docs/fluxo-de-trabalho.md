# Fluxo de trabalho

Padrão adotado em 30/09/2026. Vale para qualquer pessoa ou assistente que altere este repositório.

## Por quê

A `main` é publicada automaticamente em produção pela Vercel (https://cuidar-registrar.vercel.app), sem esperar os testes. Um envio direto na `main` com erro vai ao ar. Por isso, nenhuma mudança entra na `main` sem passar antes por uma branch.

## O caminho de toda mudança

1. **Branch.** Partir da `main` atualizada:
   ```bash
   git switch main && git pull
   git switch -c tipo/assunto        # ex.: feat/anexos, fix/login, docs/pendencias
   ```
2. **Trabalhar e conferir no computador.** Antes de enviar: `npm run build`, `npm test` e, se a mudança mexe em tela, os roteiros (`npm run verificar`, com o front rodando).
3. **Enviar e abrir o pull request.**
   ```bash
   git push -u origin tipo/assunto
   gh pr create --fill
   ```
4. **Esperar as duas conferências automáticas:**
   - **Testes do GitHub** (workflow "Verificação"): build, contraste, testes do servidor e os roteiros do navegador, com a API simulada e contra o servidor real. Leva cerca de 25 minutos.
   - **Preview da Vercel**: cada pull request ganha um endereço próprio, separado do público. Abrir e conferir a mudança ali. O endereço aparece no pull request e em `npx vercel ls cuidar-registrar`. Previews pedem login na Vercel.
5. **Juntar na `main`** só com os testes verdes e o preview conferido:
   ```bash
   gh pr merge --squash --delete-branch
   git switch main && git pull
   ```
   A Vercel publica a `main` em produção em menos de um minuto.
6. **Conferir a produção** depois de publicada, ao menos abrindo o endereço.

## Regras

- Nada de `git push` direto na `main`.
- Pull request com teste vermelho não é juntado. Corrige-se na mesma branch.
- Uma mudança por pull request, com descrição do que foi feito e de como foi conferido.
- Registros continuam no repositório: decisões em `docs/plano-backend.md` ou `docs/plano-de-escopo.md`, o que ficou para depois em `docs/pendencias.md`, o que foi construído e verificado em `docs/registro-de-execucao.md`.
- Se a produção quebrar mesmo assim: no painel da Vercel, promover a publicação anterior (Deployments › a anterior › Promote) e corrigir por pull request.

## Conta do GitHub

O repositório é da conta `bonfim157`. Em máquina onde a conta ativa do `gh` é outra, os comandos `gh` precisam do token dela:

```bash
GH_TOKEN=$(gh auth token --user bonfim157) gh pr create --fill
```

## Ambientes

| Ambiente | Endereço | O que roda | Dados |
| --- | --- | --- | --- |
| Produção | https://cuidar-registrar.vercel.app | Front com API simulada e faixa de demonstração | Fictícios, no navegador de quem abre |
| Preview | um por pull request | O mesmo, até o banco Neon ser ligado; depois, o servidor real | Fictícios |
| Computador | `npm run dev` ou `npm run dev:servidor` + `VITE_API=real npm run dev` | Simulado ou servidor real com banco local | Fictícios |

Nenhum ambiente recebe dados reais de estudantes antes do RIPD aprovado e da autorização da rede (ver [Plano do back-end](plano-backend.md)).
