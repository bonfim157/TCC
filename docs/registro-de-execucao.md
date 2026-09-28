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
