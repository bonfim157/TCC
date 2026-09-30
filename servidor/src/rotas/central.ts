import type { Context, Hono } from 'hono';
import {
  acaoEmAberto, type CienciaPublica, type ItemDaAgenda, type ItemDaFila, type ModeloDeComunicacao, type Ocorrencia,
  type Orgao, type PessoaDaEquipe,
} from '@tcc/compartilhado/contrato';
import {
  esquemaAcaoPlano, esquemaCiencia, esquemaComunicacao, esquemaDevolutiva, esquemaEncaminhamento, esquemaEncerramento,
  esquemaProvidencia, esquemaRegistroEscola, esquemaRegistroRede, esquemaTriagem,
} from '@tcc/compartilhado/esquemas';
import { definirRede, naRede, type Cliente } from '../banco/conexao';
import { alcance, carregarCaso, carregarCasos, conduz, conduzCasos, novoEvento, paraQuemConsulta, podeAbrir, resumo } from '../casos';
import { auditar, comContexto, type Contexto } from '../contexto';
import { conflito, naoEncontrado, semPermissao, validacao } from '../erros';
import { loginDemoAtivo } from '../ambiente';
import { hashDoToken, novoToken } from '../seguranca';
import { corpo, hojeISO } from '../util';

/* Central de Gestão (B4). Espelha front/src/mocks/central.ts. Só quem conduz casos na escola usa estas rotas. */

const nomeOrgao: Record<Orgao, string> = {
  conselho_tutelar: 'Conselho Tutelar', policia: 'Polícia', samu: 'SAMU', cras: 'CRAS', creas: 'CREAS', saude: 'Serviço de saúde', outro: 'Outro órgão',
};

/** Validade do link de ciência enviado à família. */
const DIAS_DO_LINK = 30;

const dataBr = (d: string) => d.split('-').reverse().join('/');
const somaDias = (dias: number) => new Date(Date.now() - 3 * 3600_000 + dias * 86_400_000).toISOString().slice(0, 10);

/** Marca como feitas as providências cujo id termina com a chave, quando a própria ação já as cumpre. */
async function cumprir(db: Cliente, o: Ocorrencia, chave: string, por: string, observacao: string) {
  await db.query(
    `update providencias set situacao = 'feita', registrada_por = $3, registrada_em = clock_timestamp(), observacao = $4
      where ocorrencia_id = $1 and id like $2 and situacao = 'pendente'`,
    [o.id, `%-${chave}`, por, observacao],
  );
}

function itemDaFila(o: Ocorrencia): ItemDaFila {
  const hoje = hojeISO();
  const prazos = [
    ...o.plano.filter(acaoEmAberto).map((a) => a.prazo),
    ...o.encaminhamentos.filter((e) => !e.devolutiva).map((e) => e.devolutivaAte),
    ...(o.encerramento?.reavaliarEm ? [o.encerramento.reavaliarEm] : []),
  ].sort();
  return {
    ...resumo(o),
    responsavelNome: o.responsavelNome,
    obrigatoriasPendentes: o.providencias.filter((p) => p.obrigatoria && p.situacao === 'pendente').length,
    ctPendente: o.providencias.some((p) => p.id.endsWith('-ct') && p.situacao === 'pendente'),
    devolutivasAtrasadas: o.encaminhamentos.filter((e) => !e.devolutiva && e.devolutivaAte < hoje).length,
    proximoPrazo: prazos[0] ?? null,
  };
}

/** Casos da escola ativa que a pessoa pode abrir. */
async function casosDaEscola(db: Cliente, ctx: Contexto) {
  const escolas = await alcance(db, ctx);
  return (await carregarCasos(db, 'o.escola_id = $1', [ctx.escolaId])).filter((o) => podeAbrir(ctx, escolas, o));
}

/**
 * Executa uma ação sobre o caso: confere se quem pede conduz casos na escola
 * e se o caso ainda está aberto, aplica a mudança, audita e devolve o caso
 * atualizado, já filtrado para quem pediu.
 */
function acaoNoCaso(c: Context, status: 200 | 201, fn: (db: Cliente, ctx: Contexto, o: Ocorrencia) => Promise<void>) {
  return comContexto(c.req.raw.headers, async (db, ctx) => {
    const o = await carregarCaso(db, c.req.param('id') ?? '');
    if (!o) throw naoEncontrado('Não encontramos este caso.');
    if (!conduz(ctx) || !podeAbrir(ctx, await alcance(db, ctx), o)) {
      throw semPermissao('Seu perfil não conduz casos nesta escola.').registrar(`caso ${o.protocolo}`, 'tentativa de alterar sem permissão');
    }
    if (o.status === 'encerrado') throw conflito('Este caso está encerrado. Para retomar, registre uma reavaliação com a direção.');
    await fn(db, ctx, o);
    const atual = (await carregarCaso(db, o.id))!;
    await auditar(db, ctx, 'alteracao', `caso ${atual.protocolo}`, 'permitido', atual.eventos.at(-1)?.tipo);
    return c.json(paraQuemConsulta(ctx, atual), status);
  });
}

export function rotasDaCentral(app: Hono) {
  app.get('/central/fila', (c) =>
    comContexto(c.req.raw.headers, async (db, ctx) => {
      if (!conduz(ctx)) throw semPermissao('A Central de Gestão é para quem conduz casos na escola.');
      return c.json((await casosDaEscola(db, ctx)).map(itemDaFila));
    }),
  );

  app.get('/central/agenda', (c) =>
    comContexto(c.req.raw.headers, async (db, ctx) => {
      if (!conduz(ctx)) throw semPermissao('A agenda é para quem conduz casos na escola.');
      const itens: ItemDaAgenda[] = (await casosDaEscola(db, ctx))
        .flatMap((o) => {
          const base = { ocorrenciaId: o.id, protocolo: o.protocolo };
          const reavaliacao = o.encerramento?.reavaliarEm
            ? [{ data: o.encerramento.reavaliarEm, tipo: 'reavaliacao' as const, descricao: 'Reavaliar caso encerrado', ...base }]
            : [];
          // Caso encerrado só entra na agenda pela data de reavaliação.
          if (o.status === 'encerrado') return reavaliacao;
          return [
            ...o.plano.filter(acaoEmAberto).map((a) => ({ data: a.prazo, tipo: 'prazo_plano' as const, descricao: a.descricao, ...base })),
            ...o.encaminhamentos.filter((e) => !e.devolutiva).map((e) => ({ data: e.devolutivaAte, tipo: 'devolutiva' as const, descricao: `Devolutiva de ${e.orgaoNome}`, ...base })),
            ...reavaliacao,
          ];
        })
        .sort((a, b) => a.data.localeCompare(b.data));
      return c.json(itens);
    }),
  );

  app.get('/equipe', (c) =>
    comContexto(c.req.raw.headers, async (db, ctx) => {
      const r = await db.query<PessoaDaEquipe>(
        `select u.id, u.nome, v.perfil from vinculos v join usuarios u on u.id = v.usuario_id
          where v.rede_id = $1 and v.perfil = any($2)
            and ($3::text is null or exists (select 1 from vinculo_escolas ve where ve.vinculo_id = v.id and ve.escola_id = $3))
          order by u.nome`,
        [ctx.vinculo.redeId, conduzCasos, ctx.escolaId],
      );
      return c.json(r.rows);
    }),
  );

  app.get('/modelos', (c) =>
    comContexto(c.req.raw.headers, async (db) => {
      const r = await db.query('select id, rede_id, tipo, nome, texto from modelos_comunicacao order by id');
      const lista: ModeloDeComunicacao[] = r.rows.map((m) => ({ id: m.id, redeId: m.rede_id, tipo: m.tipo, nome: m.nome, texto: m.texto }));
      return c.json(lista);
    }),
  );

  app.post('/ocorrencias/:id/triagem', async (c) => {
    const p = await corpo(c, esquemaTriagem);
    return acaoNoCaso(c, 200, async (db, ctx, o) => {
      // Quem recebe o caso precisa conduzir casos nesta escola.
      const resp = (await db.query<{ id: string; nome: string }>(
        `select u.id, u.nome from vinculos v join usuarios u on u.id = v.usuario_id
          where u.id = $1 and v.rede_id = $2 and v.perfil = any($3)
            and exists (select 1 from vinculo_escolas ve where ve.vinculo_id = v.id and ve.escola_id = $4)`,
        [p.responsavelId, o.redeId, conduzCasos, o.escolaId],
      )).rows[0];
      if (!resp) throw validacao('Escolha quem vai conduzir o caso.');
      if (!(await db.query('select 1 from categorias where id = $1', [p.categoriaId])).rowCount) throw validacao('Tipo de ocorrência inválido.');
      if (p.categoriaId !== o.categoriaId) {
        // Nova categoria: novas providências, mantendo o que já foi feito.
        await db.query(`delete from providencias where ocorrencia_id = $1 and situacao = 'pendente'`, [o.id]);
        await db.query(
          `insert into providencias (id, rede_id, ocorrencia_id, descricao, base, obrigatoria, situacao, ordem)
           select r.id, r.rede_id, $1::text, r.descricao, r.base, r.obrigatoria, 'pendente', r.ordem from regras_protocolo r
            where (r.categoria_ids is null or $2::text = any(r.categoria_ids)) and (not r.somente_com_risco or $3::boolean)
              and not exists (select 1 from providencias p where p.ocorrencia_id = $1 and p.id = r.id)`,
          [o.id, p.categoriaId, o.fato.riscoImediato],
        );
      }
      await db.query(
        `update ocorrencias set categoria_id = $2, prioridade = $3, responsavel_id = $4, responsavel_nome = $5, status = 'em_acompanhamento' where id = $1`,
        [o.id, p.categoriaId, p.prioridade, resp.id, resp.nome],
      );
      await novoEvento(db, ctx, o.id, 'triagem', `Triagem concluída. Responsável: ${resp.nome}.${p.observacao.trim() ? ` ${p.observacao.trim()}` : ''}`);
    });
  });

  app.post('/ocorrencias/:id/providencias/:pid', async (c) => {
    const p = await corpo(c, esquemaProvidencia);
    return acaoNoCaso(c, 200, async (db, ctx, o) => {
      const prov = o.providencias.find((x) => x.id === c.req.param('pid'));
      if (!prov) throw naoEncontrado('Providência não encontrada.');
      if (p.situacao === 'dispensada' && p.observacao.trim().length < 15) {
        throw validacao('Explique por que esta providência não se aplica (pelo menos 15 caracteres).');
      }
      const pendente = p.situacao === 'pendente';
      await db.query(
        `update providencias set situacao = $3, observacao = $4, registrada_por = $5,
                registrada_em = case when $6::boolean then null else clock_timestamp() end
          where ocorrencia_id = $1 and id = $2`,
        [o.id, prov.id, p.situacao, p.observacao.trim() || null, pendente ? null : ctx.usuario.nome, pendente],
      );
      const verbo = p.situacao === 'feita' ? 'Providência cumprida' : p.situacao === 'dispensada' ? 'Providência dispensada' : 'Providência reaberta';
      await novoEvento(db, ctx, o.id, 'providencia', `${verbo}: ${prov.descricao.toLowerCase()}.${p.observacao.trim() ? ` ${p.observacao.trim()}` : ''}`);
    });
  });

  app.post('/ocorrencias/:id/encaminhamentos', async (c) => {
    const p = await corpo(c, esquemaEncaminhamento);
    return acaoNoCaso(c, 201, async (db, ctx, o) => {
      if (!p.devolutivaAte) throw validacao('Informe até quando a escola espera uma devolutiva.');
      const orgaoNome = p.orgaoNome.trim() || nomeOrgao[p.orgao];
      await db.query(
        `insert into encaminhamentos (rede_id, ocorrencia_id, orgao, orgao_nome, canal, protocolo_externo, devolutiva_ate, registrado_por)
         values ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [o.redeId, o.id, p.orgao, orgaoNome, p.canal, p.protocoloExterno.trim(), p.devolutivaAte, ctx.usuario.nome],
      );
      if (p.orgao === 'conselho_tutelar') await cumprir(db, o, 'ct', ctx.usuario.nome, `Encaminhado a ${orgaoNome}${p.protocoloExterno ? `, ${p.protocoloExterno}` : ''}.`);
      if (p.orgao === 'samu' || p.orgao === 'policia') await cumprir(db, o, 'emergencia', ctx.usuario.nome, `Acionado: ${orgaoNome}.`);
      await novoEvento(db, ctx, o.id, 'encaminhamento',
        `Encaminhado a ${orgaoNome}${p.protocoloExterno ? ` (${p.protocoloExterno})` : ''}. Devolutiva esperada até ${dataBr(p.devolutivaAte)}.`);
    });
  });

  app.post('/ocorrencias/:id/encaminhamentos/:eid/devolutiva', async (c) => {
    const { texto } = await corpo(c, esquemaDevolutiva);
    return acaoNoCaso(c, 200, async (db, ctx, o) => {
      const enc = o.encaminhamentos.find((e) => e.id === c.req.param('eid'));
      if (!enc) throw naoEncontrado('Encaminhamento não encontrado.');
      if (texto.trim().length < 10) throw validacao('Descreva a devolutiva recebida.');
      await db.query(
        `update encaminhamentos set devolutiva_em = clock_timestamp(), devolutiva_texto = $3 where ocorrencia_id = $1 and id = $2`,
        [o.id, enc.id, texto.trim()],
      );
      await novoEvento(db, ctx, o.id, 'encaminhamento', `Devolutiva de ${enc.orgaoNome}: ${texto.trim()}`);
    });
  });

  app.post('/ocorrencias/:id/registros', async (c) => {
    const p = await corpo(c, esquemaRegistroEscola);
    return acaoNoCaso(c, 201, async (db, ctx, o) => {
      if (p.texto.trim().length < 15) throw validacao('Descreva o que foi feito, com pelo menos 15 caracteres.');
      await novoEvento(db, ctx, o.id, p.tipo, p.texto.trim());
      if (p.tipo === 'escuta') {
        await cumprir(db, o, 'escuta', ctx.usuario.nome, 'Escuta registrada na linha do tempo.');
        await cumprir(db, o, 'acolhimento', ctx.usuario.nome, 'Acolhimento feito na escuta.');
      }
      if (o.status === 'recebido') await db.query(`update ocorrencias set status = 'em_triagem' where id = $1`, [o.id]);
    });
  });

  app.post('/ocorrencias/:id/plano', async (c) => {
    const p = await corpo(c, esquemaAcaoPlano, 'Informe a ação, o responsável e o prazo.');
    return acaoNoCaso(c, 201, async (db, ctx, o) => {
      if (p.descricao.trim().length < 5 || !p.responsavel.trim() || !p.prazo) throw validacao('Informe a ação, o responsável e o prazo.');
      await db.query(
        `insert into acoes_plano (rede_id, ocorrencia_id, descricao, responsavel, prazo, situacao, ordem)
         values ($1, $2, $3, $4, $5, $6, (select coalesce(max(ordem), -1) + 1 from acoes_plano where ocorrencia_id = $2))`,
        [o.redeId, o.id, p.descricao.trim(), p.responsavel.trim(), p.prazo, p.prazo < hojeISO() ? 'atrasada' : 'no_prazo'],
      );
      await cumprir(db, o, 'plano', ctx.usuario.nome, 'Plano de apoio definido.');
      await novoEvento(db, ctx, o.id, 'providencia', `Ação incluída no plano de apoio: ${p.descricao.trim()}.`);
    });
  });

  app.post('/ocorrencias/:id/plano/:aid/concluir', (c) =>
    acaoNoCaso(c, 200, async (db, ctx, o) => {
      const acao = o.plano.find((a) => a.id === c.req.param('aid'));
      if (!acao) throw naoEncontrado('Ação não encontrada.');
      await db.query(`update acoes_plano set situacao = 'concluida' where ocorrencia_id = $1 and id = $2`, [o.id, acao.id]);
      await novoEvento(db, ctx, o.id, 'providencia', `Ação do plano concluída: ${acao.descricao}.`);
    }),
  );

  app.post('/ocorrencias/:id/comunicacoes', async (c) => {
    const p = await corpo(c, esquemaComunicacao, 'Revise o destinatário e o texto da comunicação.');
    return acaoNoCaso(c, 201, async (db, ctx, o) => {
      const destinatario = p.destinatario.trim();
      if (p.texto.trim().length < 30 || !destinatario) throw validacao('Revise o destinatário e o texto da comunicação.');
      // A tela já bloqueia, mas só conhece os nomes que o perfil pode ver. O servidor
      // confere todos, inclusive os de visibilidade restrita, sem revelar qual foi citado.
      if (p.tipo === 'familia' && o.envolvidos.some((e) => e.tipo === 'estudante' && e.pessoaId !== p.estudanteId && p.texto.includes(e.nome))) {
        throw validacao('O texto cita outro estudante envolvido no caso. Retire o nome antes de enviar à família.')
          .registrar(`caso ${o.protocolo}`, 'comunicação à família citava outro estudante');
      }
      if (p.tipo === 'familia') {
        // O banco guarda só o hash do token. O link em texto só fica gravado em ambientes
        // de demonstração, onde a tela o mostra; em produção ele segue por e-mail.
        const token = novoToken();
        await db.query(
          `insert into comunicacoes (rede_id, ocorrencia_id, tipo, destinatario, texto, registrada_por, token_hash, token_expira_em, link_ciencia)
           values ($1, $2, 'familia', $3, $4, $5, $6, now() + make_interval(days => $7), $8)`,
          [o.redeId, o.id, destinatario, p.texto.trim(), ctx.usuario.nome, hashDoToken(token), DIAS_DO_LINK, loginDemoAtivo() ? `/ciencia/${token}` : null],
        );
        await db.query('insert into tokens_ciencia (token_hash, rede_id) values ($1, $2)', [hashDoToken(token), o.redeId]);
        await cumprir(db, o, 'familia', ctx.usuario.nome, `Comunicação enviada a ${destinatario}.`);
        await novoEvento(db, ctx, o.id, 'comunicacao_familia', `Comunicação enviada a ${destinatario}, com pedido de ciência.`);
      } else {
        await db.query(
          `insert into comunicacoes (rede_id, ocorrencia_id, tipo, destinatario, texto, registrada_por) values ($1, $2, 'conselho_tutelar', $3, $4, $5)`,
          [o.redeId, o.id, destinatario, p.texto.trim(), ctx.usuario.nome],
        );
        await db.query(
          `insert into encaminhamentos (rede_id, ocorrencia_id, orgao, orgao_nome, canal, protocolo_externo, devolutiva_ate, registrado_por)
           values ($1, $2, 'conselho_tutelar', $3, 'oficio', '', $4, $5)`,
          [o.redeId, o.id, destinatario, somaDias(10), ctx.usuario.nome],
        );
        await cumprir(db, o, 'ct', ctx.usuario.nome, `Ofício enviado a ${destinatario}.`);
        await novoEvento(db, ctx, o.id, 'encaminhamento', `Ofício enviado a ${destinatario}. Devolutiva esperada em até 10 dias.`);
      }
    });
  });

  app.post('/ocorrencias/:id/registro-rede', async (c) => {
    const { codigo } = await corpo(c, esquemaRegistroRede);
    return acaoNoCaso(c, 200, async (db, ctx, o) => {
      if (codigo.trim().length < 3) throw validacao('Informe o código do registro no sistema da rede.');
      await db.query('update ocorrencias set registro_na_rede = $2 where id = $1', [o.id, codigo.trim()]);
      await cumprir(db, o, 'conviva', ctx.usuario.nome, `Código ${codigo.trim()}.`);
      await novoEvento(db, ctx, o.id, 'providencia', `Lançado no sistema oficial da rede: ${codigo.trim()}.`);
    });
  });

  app.post('/ocorrencias/:id/encerrar', async (c) => {
    const p = await corpo(c, esquemaEncerramento);
    return acaoNoCaso(c, 200, async (db, ctx, o) => {
      if (!['coordenacao', 'direcao'].includes(ctx.vinculo.perfil)) throw semPermissao('Só coordenação ou direção encerram casos.');
      const pendentes = o.providencias.filter((x) => x.obrigatoria && x.situacao === 'pendente');
      if (pendentes.length) {
        throw conflito(`Faltam ${pendentes.length} providências obrigatórias: ${pendentes.map((x) => x.descricao.toLowerCase()).join('; ')}. Cumpra ou dispense cada uma com justificativa.`);
      }
      const justificativa = p.justificativa.trim();
      if (justificativa.length < 20) throw validacao('Explique o resultado e por que o caso pode ser encerrado (pelo menos 20 caracteres).');
      // Caso encerrado não aceita mais ações: nada do plano pode ficar pendurado.
      const abertas = o.plano.filter(acaoEmAberto);
      if (abertas.length && !p.cancelarAcoesAbertas) {
        throw conflito(`Há ${abertas.length === 1 ? '1 ação' : `${abertas.length} ações`} do plano de apoio em aberto. Conclua antes de encerrar ou confirme que ${abertas.length === 1 ? 'ela será cancelada' : 'elas serão canceladas'}.`);
      }
      await db.query(`update acoes_plano set situacao = 'cancelada' where ocorrencia_id = $1 and situacao in ('no_prazo', 'atrasada')`, [o.id]);
      await db.query(
        `update ocorrencias set status = 'encerrado', encerrado_em = clock_timestamp(), encerrado_por = $2,
                justificativa_encerramento = $3, reavaliar_em = $4 where id = $1`,
        [o.id, ctx.usuario.nome, justificativa, p.reavaliarEm],
      );
      const canceladas = abertas.length
        ? ` ${abertas.length === 1 ? 'Ação do plano cancelada' : `${abertas.length} ações do plano canceladas`} no encerramento: ${abertas.map((a) => a.descricao).join('; ')}.`
        : '';
      await novoEvento(db, ctx, o.id, 'encerramento',
        `${justificativa}${canceladas}${p.reavaliarEm ? ` Reavaliação marcada para ${dataBr(p.reavaliarEm)}.` : ''}`);
    });
  });

  /* ---------- Ciência da família: rota pública, só com o link ---------- */

  /** Acha a comunicação pelo token. A rede só é descoberta pelo hash, sem ver mais nada antes disso. */
  async function comunicacaoDoToken(db: Cliente, token: string) {
    const hash = hashDoToken(token);
    const rede = (await db.query<{ rede_id: string }>('select rede_id from tokens_ciencia where token_hash = $1', [hash])).rows[0]?.rede_id;
    if (!rede) return null;
    await definirRede(db, rede);
    const r = await db.query(
      `select m.id, m.ocorrencia_id, m.destinatario, m.texto, m.em, m.ciencia_em, m.ciencia_nome, o.protocolo, o.rede_id,
              e.nome as escola, r.nome as rede
         from comunicacoes m join ocorrencias o on o.id = m.ocorrencia_id join escolas e on e.id = o.escola_id join redes r on r.id = o.rede_id
        where m.token_hash = $1 and (m.token_expira_em is null or m.token_expira_em > now())`,
      [hash],
    );
    return r.rows[0] ?? null;
  }

  app.get('/ciencia/:token', async (c) => {
    const m = await naRede({ redeId: null }, (db) => comunicacaoDoToken(db, c.req.param('token')));
    if (!m) throw naoEncontrado('Este link não é válido ou já expirou. Procure a secretaria da escola.');
    const publica: CienciaPublica = {
      escola: m.escola, rede: m.rede, redeId: m.rede_id, destinatario: m.destinatario, texto: m.texto, enviadaEm: m.em,
      ciencia: m.ciencia_em ? { em: m.ciencia_em, nome: m.ciencia_nome } : null,
    };
    return c.json(publica);
  });

  app.post('/ciencia/:token', async (c) => {
    const { nome } = await corpo(c, esquemaCiencia, 'Escreva seu nome para confirmar.');
    await naRede({ redeId: null }, async (db) => {
      const m = await comunicacaoDoToken(db, c.req.param('token'));
      if (!m) throw naoEncontrado('Este link não é válido ou já expirou.');
      if (nome.trim().length < 3) throw validacao('Escreva seu nome para confirmar.');
      if (m.ciencia_em) throw conflito('A ciência desta comunicação já foi confirmada.');
      await db.query(
        `update comunicacoes set ciencia_em = clock_timestamp(), ciencia_nome = $3 where ocorrencia_id = $1 and id = $2`,
        [m.ocorrencia_id, m.id, nome.trim()],
      );
      await db.query(
        `insert into eventos (rede_id, ocorrencia_id, tipo, autor_nome, autor_perfil, texto) values ($1, $2, 'comunicacao_familia', $3, 'professor', $4)`,
        [m.rede_id, m.ocorrencia_id, nome.trim(), `Ciência confirmada por ${nome.trim()} (${m.destinatario}).`],
      );
      await auditar(db, null, 'alteracao', `caso ${m.protocolo}`, 'permitido', 'ciência da família', m.rede_id);
    });
    return c.json({ ok: true });
  });
}
