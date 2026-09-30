import type { AcaoAuditada, Escola, Perfil, RegistroDeAuditoria, Usuario, Vinculo } from '@tcc/compartilhado/contrato';
import { definirRede, naRede, type Cliente } from './banco/conexao';
import { hashDoToken } from './seguranca';
import { ErroApi, naoAutenticado, redeDivergente, semPermissao } from './erros';

/*
 * Contexto de cada requisição: quem é a pessoa, com qual vínculo na rede
 * ativa e em qual escola. É a mesma checagem de `contexto()` da API simulada
 * (front/src/mocks/base.ts), agora com o banco filtrando por rede.
 */

export type Contexto = {
  usuario: Usuario;
  vinculo: Vinculo;
  escolaId: string | null;
  /** Ids das escolas no alcance do vínculo; preenchido sob demanda (casos.ts). */
  alcance?: string[];
};

type Cabecalhos = { get(nome: string): string | null | undefined };

/** Token da sessão: cookie (B2) ou, por enquanto, o cabeçalho Authorization. */
export function tokenDaRequisicao(h: Cabecalhos): string | null {
  const bearer = h.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (bearer) return bearer;
  const cookie = h.get('cookie')?.match(/(?:^|;\s*)sessao=([^;]+)/)?.[1];
  return cookie ? decodeURIComponent(cookie) : null;
}

/** Todos os vínculos da pessoa, em todas as redes (a política do banco permite ver os próprios). */
export async function vinculosDe(c: Cliente, usuarioId: string): Promise<Vinculo[]> {
  const r = await c.query<{ rede_id: string; perfil: Perfil; regional_id: string | null; escolas: string[] }>(
    `select v.rede_id, v.perfil, v.regional_id,
            coalesce(array_agg(ve.escola_id order by ve.escola_id) filter (where ve.escola_id is not null), '{}') as escolas
       from vinculos v left join vinculo_escolas ve on ve.vinculo_id = v.id
      where v.usuario_id = $1
      group by v.id, v.rede_id, v.perfil, v.regional_id
      order by v.rede_id`,
    [usuarioId],
  );
  return r.rows.map((v) => ({
    redeId: v.rede_id, perfil: v.perfil, escolaIds: v.escolas, ...(v.regional_id ? { regionalId: v.regional_id } : {}),
  }));
}

async function usuarioDaSessao(c: Cliente, token: string | null) {
  if (!token) return null;
  const s = await c.query<{ id: string; nome: string }>(
    `select u.id, u.nome from sessoes s join usuarios u on u.id = s.usuario_id
      where s.token_hash = $1 and s.expira_em > now()`,
    [hashDoToken(token)],
  );
  return s.rows[0] ?? null;
}

/** Resolve o contexto dentro de uma transação já aberta com a rede do cabeçalho. */
export async function resolverContexto(c: Cliente, h: Cabecalhos): Promise<Contexto> {
  const pessoa = await usuarioDaSessao(c, tokenDaRequisicao(h));
  if (!pessoa) throw naoAutenticado();
  await c.query(`select set_config('app.usuario_id', $1, true)`, [pessoa.id]);
  const vinculos = await vinculosDe(c, pessoa.id);
  const usuario: Usuario = { ...pessoa, vinculos };

  const redeId = h.get('x-rede-id') ?? '';
  const vinculo = vinculos.find((v) => v.redeId === redeId);
  if (!vinculo) throw semPermissao('Você não tem vínculo com esta rede.');

  const escolaId = h.get('x-escola-id') || null;
  if (escolaId) {
    // A escola de outra rede simplesmente não aparece: a Row-Level Security a esconde.
    const e = await c.query('select 1 from escolas where id = $1', [escolaId]);
    if (e.rowCount === 0) throw redeDivergente('Esta escola não pertence à rede ativa.');
    if (vinculo.escolaIds.length > 0 && !vinculo.escolaIds.includes(escolaId)) {
      throw semPermissao('Você não tem vínculo com esta escola.');
    }
  }
  return { usuario, vinculo, escolaId };
}

/**
 * Abre a transação na rede do cabeçalho, resolve o contexto e executa a rota.
 * Recusas marcadas para auditoria são gravadas numa transação própria, porque
 * a transação da rota é desfeita quando ela falha.
 */
export async function comContexto<T>(h: Cabecalhos, fn: (c: Cliente, ctx: Contexto) => Promise<T>): Promise<T> {
  let ctx: Contexto | null = null;
  try {
    return await naRede({ redeId: h.get('x-rede-id') ?? null }, async (c) => {
      ctx = await resolverContexto(c, h);
      return fn(c, ctx);
    });
  } catch (e) {
    if (e instanceof ErroApi && e.auditar && ctx) {
      const quem: Contexto = ctx;
      await naRede({ redeId: quem.vinculo.redeId, usuarioId: quem.usuario.id }, (c) =>
        auditar(c, quem, 'negado', e.auditar!.recurso, 'negado', e.auditar!.detalhe),
      );
    }
    throw e;
  }
}

/** Grava na auditoria. A cadeia de hashes é montada pelo banco. */
export async function auditar(
  c: Cliente,
  ctx: Pick<Contexto, 'usuario' | 'vinculo'> | null,
  acao: AcaoAuditada,
  recurso: string,
  resultado: RegistroDeAuditoria['resultado'] = 'permitido',
  detalhe?: string,
  redeId?: string,
) {
  const rede = ctx?.vinculo.redeId ?? redeId;
  if (!rede) throw new Error('auditoria sem rede');
  if (!ctx) await definirRede(c, rede);
  await c.query(
    `insert into auditoria (rede_id, ator, perfil, acao, recurso, resultado, detalhe) values ($1, $2, $3, $4, $5, $6, $7)`,
    [rede, ctx?.usuario.nome ?? 'Família (link de ciência)', ctx?.vinculo.perfil ?? null, acao, recurso, resultado, detalhe ?? null],
  );
}

/** Escolas que o vínculo alcança dentro da rede ativa. */
export async function escolasDoVinculo(c: Cliente, v: Vinculo): Promise<Escola[]> {
  const r = await c.query<{ id: string; rede_id: string; regional_id: string; nome: string; sigla: string | null; municipio: string; bairro: string }>(
    `select * from escolas
      where ($1::text[] = '{}' or id = any($1))
        and ($2::text is null or cardinality($1::text[]) > 0 or regional_id = $2)
      order by nome`,
    [v.escolaIds, v.regionalId ?? null],
  );
  return r.rows.map((e) => ({
    id: e.id, redeId: e.rede_id, regionalId: e.regional_id, nome: e.nome, municipio: e.municipio, bairro: e.bairro,
    ...(e.sigla ? { sigla: e.sigla } : {}),
  }));
}
