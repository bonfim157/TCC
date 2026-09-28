# Gestão da ocorrência na escola pública

Levantamento de 28/09/2026. Base para a Central de Gestão (F3) e para as regras de providências em `front/src/mocks/protocolo.ts`.

Ao receber uma ocorrência, a gestão da escola pública recebe, avalia o risco, acolhe, classifica, aciona quem a lei exige, comunica a família, registra e acompanha até o encerramento. A regra sem exceção: suspeita de violência contra o estudante é comunicada ao Conselho Tutelar, mesmo sem prova (ECA, arts. 13, 56 e 245).

Não existe um protocolo nacional único. A Lei 14.811/2024 manda cada município criar o seu, em cooperação com o estado; por isso o sistema permite que cada rede configure tipos, providências, prazos e contatos.

Este levantamento não substitui parecer jurídico nem o protocolo oficial da rede.

## Fluxo da gestão

| Passo | O que acontece | Observação |
| --- | --- | --- |
| 1. Recebe o relato | De professor, apoio, estudante ou família | |
| Decisão: risco imediato? | Se sim, aciona emergência (190, SAMU 192, Bombeiros 193), preserva o local e a direção assume | Depois, segue o fluxo |
| 2. Acolhe e escuta | Sem perguntas invasivas | Decreto 9.603/2018, art. 11 |
| 3. Classifica | Tipo, envolvidos e prioridade | |
| Decisão: violência contra o estudante? | Se sim, comunica o Conselho Tutelar, já na suspeita | ECA, arts. 13, 56 e 245 |
| 4. Comunica a família | Responsável ou pessoa de referência | |
| 5. Registra no sistema da rede | Na rede estadual SP, no Conviva SP; informa a regional se grave | |
| 6. Plano de acompanhamento | Pedagógico, restaurativo e rede CRAS/CREAS | |
| 7. Devolutiva e encerramento | Com data de reavaliação | |

Acionar polícia ou saúde não dispensa a comunicação ao Conselho Tutelar. A escuta na escola serve para proteger, não para produzir prova.

## Medidas por tipo de ocorrência

| Tipo | Quem conduz na escola | Quem acionar fora | Quando | Base |
| --- | --- | --- | --- | --- |
| Suspeita ou confirmação de violência contra o estudante | Direção ou orientador | Conselho Tutelar sempre; polícia e saúde quando couber | Imediatamente | ECA arts. 13 e 245; Lei 13.431, art. 13; Decreto 9.603, art. 11 |
| Negligência, abuso ou abandono | Direção | Conselho Tutelar | Ao identificar | ECA art. 56, IV |
| Bullying e cyberbullying | Coordenação | Família; Conselho Tutelar se houver violência | Ao identificar; relatório bimestral da rede | Lei 13.185, arts. 5 e 6 |
| Ato infracional de adolescente (12 a 17 anos) | Direção | Autoridade policial; Conselho Tutelar se houver violação de direito | No ato | ECA art. 172 |
| Ato infracional de criança (até 11 anos) | Direção | Conselho Tutelar | No ato | ECA arts. 105 e 136 |
| Arma, ameaça de ataque, inclusive em redes sociais | Direção | Polícia (190); órgãos superiores da rede | Imediatamente | Protocolo de segurança de MG, item 6 |
| Roubo, furto, incêndio ou outro sinistro | Direção | Polícia ou bombeiros; local preservado | Imediatamente | Protocolo de segurança de MG, item 3 |
| Acidente ou problema de saúde | Quem presenciou e direção | SAMU (192); família | Imediatamente | Protocolo de Valparaíso de Goiás |
| Faltas reiteradas e evasão | Secretaria escolar e coordenação | Família; Conselho Tutelar depois de esgotados os recursos da escola; Ministério Público se persistir | Critério da FICAI da rede | ECA art. 56, II |
| Conflito entre pares e indisciplina | Coordenação | Família | Conforme o regimento | Regimento escolar |

## Obrigações legais do gestor

A omissão tem pena: o diretor que deixa de comunicar suspeita de maus-tratos pode ser multado em 3 a 20 salários de referência, o dobro se reincidir (ECA, art. 245).

| Norma | O que exige | Reflexo no sistema |
| --- | --- | --- |
| [ECA, art. 13](https://www.planalto.gov.br/ccivil_03/leis/l8069.htm) | Comunicar ao Conselho Tutelar suspeita ou confirmação de castigo físico, tratamento cruel ou maus-tratos | Providência obrigatória que bloqueia o encerramento |
| [ECA, art. 56](https://www.planalto.gov.br/ccivil_03/leis/l8069.htm) | Comunicar maus-tratos, faltas reiteradas, elevada repetência, negligência, abuso ou abandono | Providências para infrequência |
| [ECA, art. 70-B](https://www.planalto.gov.br/ccivil_03/leis/l8069.htm) | Ter pessoas capacitadas a reconhecer e comunicar crimes contra crianças | Perfil "referente de proteção" |
| [ECA, art. 247](https://www.planalto.gov.br/ccivil_03/leis/l8069.htm) | Proibido divulgar nome ou ato de adolescente a quem se atribua ato infracional | Sigilo por padrão; comunicação à família sem citar outros estudantes |
| [Lei 13.431/2017, art. 13](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2017/lei/l13431.htm) | Quem souber de violência deve comunicar imediatamente | Registro de data, canal e protocolo do encaminhamento |
| [Decreto 9.603/2018, art. 11](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/decreto/d9603.htm) | Acolher, informar direitos, encaminhar a atendimento emergencial e comunicar o Conselho Tutelar | Providências de acolhimento, escuta e comunicação |
| [Lei 13.185/2015, arts. 5 e 6](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13185.htm) | Escola previne e combate o bullying; rede publica relatório bimestral | Relatório bimestral (F4) |
| [Lei 14.811/2024, arts. 2 e 3](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/lei/l14811.htm) | Município cria protocolo de proteção com segurança pública, saúde e comunidade escolar | Protocolo configurável por rede (F4) |

## Como as redes públicas fazem hoje

| Rede | Instrumento | Como a gestão atua |
| --- | --- | --- |
| Estado de SP | [Conviva SP / Placon](https://gruposulnews.com.br/conviva-sp-saiba-como-funciona-o-novo-aplicativo-de-seguranca-nas-escolas/) | Registram o orientador de convivência, o especialista em currículo, o diretor e o vice. Tela de chamados com histórico e situação. Registra o encaminhamento de cada envolvido e até a ausência de ocorrências ([manual](https://efape.educacao.sp.gov.br/convivasp/wp-content/uploads/2020/06/Manual_PLACON.pdf)). Se a direção não resolve, o caso sobe à regional e à Ouvidoria ([Seduc-SP](https://atendimento.educacao.sp.gov.br/knowledgebase/article/SED-02097/pt-br)) |
| Estado de MG | [Protocolo de Acesso e Segurança (2023)](https://www.educacao.mg.gov.br/wp-content/uploads/2023/04/PROTOCOLO-DE-SEGURANCA-PARA-AS-INSTITUICOES-ESCOLARES-DO-ESTADO-DE-MINAS-GERAIS-5.pdf) | Direção mantém registros atualizados, analisa toda ameaça e a comunica aos órgãos superiores, preserva o local para a polícia |
| Valparaíso de Goiás | [Protocolo de atendimento a vítimas de violência (2024)](https://educacao.valparaisodegoias.go.gov.br/wp-content/uploads/2024/05/Protocolo-de-Atendimento-nas-Escolas-para-Criancas-e-Adolescentes-Vitimas-de-Violencia.pdf) | Orientador faz a escuta; o caso vai imediatamente ao Conselho Tutelar; todo encaminhamento pede devolutiva do andamento |
| Várias redes | [FICAI](https://www3.seduc.mt.gov.br/en/ppei/ficha-ficai) | Infrequência: a escola tenta trazer o aluno de volta; sem sucesso, Conselho Tutelar; persistindo, Ministério Público |

O que os protocolos pedem e o papel não garante é a devolutiva: a escola encaminha e perde de vista o que o Conselho Tutelar ou a saúde fizeram. Por isso cada encaminhamento no sistema guarda a data e a devolutiva esperada.

## Plano do front: Central de Gestão

Toda a atuação de quem conduz casos acontece numa única tela, a Central de Gestão (`/central`).

| Bloco | O que mostra | Regra que a interface aplica |
| --- | --- | --- |
| Indicadores | Novas, urgentes, a comunicar ao Conselho Tutelar, devolutivas atrasadas | Clicar filtra a fila; nenhum ranking de estudante ou professor |
| Fila | Casos da escola, ordenados por prioridade, pendências e prazo | Urgentes no topo |
| Caso aberto | Resumo, linha do tempo, encaminhamentos, plano de apoio, comunicações | Correção vira adendo; dados de terceiros ocultos |
| Providências | Lista gerada pelo tipo do caso | O sistema sugere, quem conduz decide; obrigatórias bloqueiam o encerramento, salvo justificativa |
| Encaminhamentos | Órgão, data, canal, protocolo externo, devolutiva esperada | Atraso aparece na fila e na agenda |
| Documentos | Ofício ao Conselho Tutelar e comunicação à família a partir de modelos | Envio bloqueado se o texto cita outro estudante |
| Agenda | Prazos do plano, devolutivas esperadas, reavaliações | Atrasos em destaque |

## Fontes

Legislação (texto consultado no Planalto): [ECA](https://www.planalto.gov.br/ccivil_03/leis/l8069.htm), [Lei 13.431/2017](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2017/lei/l13431.htm), [Decreto 9.603/2018](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/decreto/d9603.htm), [Lei 13.185/2015](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13185.htm), [Lei 14.811/2024](https://www2.camara.leg.br/legin/fed/lei/2024/lei-14811-12-janeiro-2024-795244-publicacaooriginal-170834-pl.html).

Protocolos e sistemas: [Valparaíso de Goiás](https://educacao.valparaisodegoias.go.gov.br/wp-content/uploads/2024/05/Protocolo-de-Atendimento-nas-Escolas-para-Criancas-e-Adolescentes-Vitimas-de-Violencia.pdf), [SEE/MG](https://www.educacao.mg.gov.br/wp-content/uploads/2023/04/PROTOCOLO-DE-SEGURANCA-PARA-AS-INSTITUICOES-ESCOLARES-DO-ESTADO-DE-MINAS-GERAIS-5.pdf), [Manual do Placon](https://efape.educacao.sp.gov.br/convivasp/wp-content/uploads/2020/06/Manual_PLACON.pdf), [Conviva SP](https://gruposulnews.com.br/conviva-sp-saiba-como-funciona-o-novo-aplicativo-de-seguranca-nas-escolas/), [Seduc-SP](https://atendimento.educacao.sp.gov.br/knowledgebase/article/SED-02097/pt-br), [FICAI Seduc-MT](https://www3.seduc.mt.gov.br/en/ppei/ficha-ficai), [FICAI MPRS](https://www.mprs.mp.br/hotsite/ficai/).

Escola piloto: [blog da IMSIL](https://imsil-limeira.blogspot.com/), [Lei estadual 3.063/1981](https://leisestaduais.com.br/sp/lei-ordinaria-n-3063-1981-sao-paulo-da-a-denominacao-de-irma-maria-de-santo-inocencio-lima-a-escola-estadual-de-1o-grau-do-jardim-ouro-verde-em-limeira), [Unidade Regional de Ensino de Limeira](https://delimeira.educacao.sp.gov.br/urelim/).

Limitações do levantamento: o manual do Placon é quase todo em imagens; o manual do MEC "Escola que Protege" não pôde ser lido (página com verificação anti-robô); os prazos da FICAI não foram confirmados.
