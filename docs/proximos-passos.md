# Próximos passos (salvo em 29/10/2026)

Retomada: branch `pendencias-planos` (commits `a7b199c` e `6c429b2`). Ainda não está na `main`: falta o pull request (https://github.com/bonfim157/TCC/pull/new/pendencias-planos), porque a conta `gh` local não é colaboradora do repositório.

## Primeiro, ao retomar
1. Abrir e aprovar o PR para a `main` (depois do preview da Vercel).
2. Rodar os roteiros do navegador contra o servidor local: `f6-login`, `f3-central`, `f2-registro`. Ver a troca de senha e o QR na tela.
3. Decidir a matriz de permissões editável (pendência 25): a secretaria precisa mudar permissões sem deploy?

## Bloqueia tudo em produção
- Banco Neon de produção (`plano-backend.md`, passo 2): criar o banco, o papel da aplicação, migrações e carga inicial da IMSIL. Sem isso o servidor real não tem onde gravar.

## Depende de conta ou escolha sua
- Serviço de e-mail: recuperação de senha (32) e envio às famílias (20).
- Armazenamento de anexos, Vercel Blob privado (18).
- Login institucional e integrações com a Seduc-SP: conta institucional (16), Conviva (17), Secretaria Escolar Digital (21).

## Depende da gestão ou do encarregado de dados
- Supressão complementar nos relatórios (31); quem registra no Conselho Tutelar (7); registro de ausência (8); tabela de providências (10 a 12); contatos de Limeira (13); texto do rodapé (34); nome do produto (9); RIPD e retenção; revisão das telas de comunicação pelo encarregado (4).

## Testes com pessoas
- Coordenação e uma pessoa com deficiência (1); NVDA (2); texto em 130% nos aparelhos da escola (5).

## Engenharia restante
- Política de conteúdo (CSP), testada num preview.
- Tarefa diária, registro de erros, teste de restauração de backup e revisão ASVS (B6).
- Confirmar em produção que o limite por endereço recebe `x-forwarded-for`.

## Decisões tomadas sem confirmação (validar com a gestão)
- Rascunhos expiram em 7 dias e são apagados ao sair.
- Limite de 20 tentativas por endereço em 15 minutos.
- QR do segundo fator gerado no navegador, com `qrcode` (MIT).
- Consulta leve da Central usa a contagem de eventos da rede como marca.
- Cabeçalhos de segurança sem CSP por enquanto.
