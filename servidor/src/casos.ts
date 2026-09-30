import type {
  AcaoDoPlano, Anexo, Comunicacao, Encaminhamento, Envolvimento, Evento, Ocorrencia, OcorrenciaResumo, Perfil, Providencia,
} from '@tcc/compartilhado/contrato';
import type { Cliente } from './banco/conexao';
import { escolasDoVinculo, type Contexto } from './contexto';

/*
 * Casos: leitura do caso inteiro a partir das tabelas e as regras de quem
 * pode ver o quê. As regras são as mesmas de front/src/mocks/base.ts; aqui o
 * banco já garantiu a rede, e estas funções decidem dentro dela.
 */

export const conduzCasos: Perfil[] = ['coordenacao', 'direcao', 'referente_protecao'];
export const soProprios: Perfil[] = ['professor', 'apoio'];
export const conduz = (ctx: Contexto) => conduzCasos.includes(ctx.vinculo.perfil);

/** Ids das escolas que o vínculo alcança, calculados uma vez por requisição. */
export async function alcance(c: Cliente, ctx: Contexto): Promise<string[]> {
  ctx.alcance ??= (await escolasDoVinculo(c, ctx.vinculo)).map((e) => e.id);
  return ctx.alcance;
}

/** Pode abrir o registro completo? Perfis de rede veem só números agregados. */
export function podeAbrir(ctx: Contexto, escolasNoAlcance: string[], o: Pick<OcorrenciaResumo, 'escolaId' | 'criadoPorId'>) {
  if (!escolasNoAlcance.includes(o.escolaId)) return false;
  if (o.criadoPorId === ctx.usuario.id) return true;
  return conduz(ctx);
}

/** Oculta nomes que o perfil não pode ver. Quem registrou sempre vê o que escreveu. */
export function filtrarEnvolvidos(ctx: Contexto, o: Ocorrencia): Envolvimento[] {
  const autor = o.criadoPorId === ctx.usuario.id;
  const perfil = ctx.vinculo.perfil;
  return o.envolvidos.map((e) => {
    const pode =
      autor ||
      e.visibilidade === 'equipe_do_caso' ||
      (e.visibilidade === 'coordenacao_direcao' && conduzCasos.includes(perfil)) ||
      (e.visibilidade === 'somente_direcao' && perfil === 'direcao');
    return pode ? e : { ...e, nome: 'Pessoa com visibilidade restrita', turma: undefined, restrito: true };
  });
}

/**
 * Versão do caso que este perfil pode receber. Quem só registrou vê o
 * andamento, mas não as comunicações, encaminhamentos e providências.
 */
export function paraQuemConsulta(ctx: Contexto, o: Ocorrencia): Ocorrencia {
  const visto = { ...o, envolvidos: filtrarEnvolvidos(ctx, o) };
  if (conduz(ctx)) return visto;
  return { ...visto, providencias: [], encaminhamentos: [], comunicacoes: [] };
}

export const resumo = (o: Ocorrencia): OcorrenciaResumo => ({
  id: o.id, redeId: o.redeId, escolaId: o.escolaId, protocolo: o.protocolo, categoriaId: o.categoriaId,
  status: o.status, prioridade: o.prioridade, abertaEm: o.abertaEm, local: o.local, criadoPorId: o.criadoPorId,
});

/* ---------- Leitura ---------- */

type Linha = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const semNulos = <T extends Linha>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined)) as T;

function agrupar(linhas: Linha[]): Map<string, Linha[]> {
  const m = new Map<string, Linha[]>();
  for (const l of linhas) {
    const lista = m.get(l.ocorrencia_id);
    if (lista) lista.push(l);
    else m.set(l.ocorrencia_id, [l]);
  }
  return m;
}

/**
 * Monta casos completos. `onde` é um trecho SQL sobre a tabela ocorrencias
 * (apelido o), sempre com parâmetros; a rede já vem filtrada pelo banco.
 */
export async function carregarCasos(c: Cliente, onde = 'true', parametros: unknown[] = []): Promise<Ocorrencia[]> {
  const casos = (await c.query(`select o.* from ocorrencias o where ${onde} order by o.aberta_em desc`, parametros)).rows;
  if (casos.length === 0) return [];
  const ids = casos.map((o) => o.id);
  const filhos = async (tabela: string, ordem: string) =>
    agrupar((await c.query(`select * from ${tabela} where ocorrencia_id = any($1) order by ${ordem}`, [ids])).rows);

  // Uma consulta por tabela, em sequência: o banco local atende uma conexão por vez.
  const envolvimentos = await filhos('envolvimentos', 'ordem');
  const anexos = await filhos('anexos', 'nome');
  const eventos = await filhos('eventos', 'em, id');
  const providencias = await filhos('providencias', 'ordem');
  const encaminhamentos = await filhos('encaminhamentos', 'em');
  const plano = await filhos('acoes_plano', 'ordem');
  const comunicacoes = await filhos('comunicacoes', 'em');

  return casos.map((o): Ocorrencia => ({
    id: o.id, redeId: o.rede_id, escolaId: o.escola_id, protocolo: o.protocolo, categoriaId: o.categoria_id,
    status: o.status, prioridade: o.prioridade, abertaEm: o.aberta_em, local: o.local,
    criadoPorId: o.criado_por_id, criadoPorNome: o.criado_por_nome, registroNaRede: o.registro_na_rede,
    responsavelId: o.responsavel_id, responsavelNome: o.responsavel_nome,
    fato: {
      categoriaId: o.categoria_id, data: o.fato_data, hora: o.fato_hora, local: o.local, relato: o.relato,
      riscoImediato: o.risco_imediato, providenciaImediata: o.providencia_imediata,
    },
    envolvidos: (envolvimentos.get(o.id) ?? []).map((e): Envolvimento => semNulos({
      pessoaId: e.pessoa_id, nome: e.nome, tipo: e.tipo, turma: e.turma, papel: e.papel, visibilidade: e.visibilidade,
    })),
    anexos: (anexos.get(o.id) ?? []).map((a): Anexo => ({ id: a.id, nome: a.nome, tamanhoKb: a.tamanho_kb, justificativa: a.justificativa })),
    eventos: (eventos.get(o.id) ?? []).map((e): Evento => ({ id: e.id, tipo: e.tipo, autorNome: e.autor_nome, autorPerfil: e.autor_perfil, em: e.em, texto: e.texto })),
    plano: (plano.get(o.id) ?? []).map((a): AcaoDoPlano => ({ id: a.id, descricao: a.descricao, responsavel: a.responsavel, prazo: a.prazo, situacao: a.situacao })),
    providencias: (providencias.get(o.id) ?? []).map((p): Providencia => semNulos({
      id: p.id, descricao: p.descricao, base: p.base, obrigatoria: p.obrigatoria, situacao: p.situacao,
      registradaPor: p.registrada_por, registradaEm: p.registrada_em, observacao: p.observacao,
    })),
    encaminhamentos: (encaminhamentos.get(o.id) ?? []).map((e): Encaminhamento => ({
      id: e.id, orgao: e.orgao, orgaoNome: e.orgao_nome, canal: e.canal, em: e.em, protocoloExterno: e.protocolo_externo,
      devolutivaAte: e.devolutiva_ate, devolutiva: e.devolutiva_em ? { em: e.devolutiva_em, texto: e.devolutiva_texto } : null,
      registradoPor: e.registrado_por,
    })),
    comunicacoes: (comunicacoes.get(o.id) ?? []).map((m): Comunicacao => ({
      id: m.id, tipo: m.tipo, destinatario: m.destinatario, texto: m.texto, em: m.em, registradaPor: m.registrada_por,
      linkCiencia: m.link_ciencia, ciencia: m.ciencia_em ? { em: m.ciencia_em, nome: m.ciencia_nome } : null,
    })),
    encerramento: o.encerrado_em
      ? { em: o.encerrado_em, por: o.encerrado_por, justificativa: o.justificativa_encerramento, reavaliarEm: o.reavaliar_em }
      : null,
  }));
}

export async function carregarCaso(c: Cliente, id: string): Promise<Ocorrencia | null> {
  return (await carregarCasos(c, 'o.id = $1', [id]))[0] ?? null;
}

/** Novo evento na linha do tempo, em nome de quem fez a requisição. */
export async function novoEvento(c: Cliente, ctx: Contexto, ocorrenciaId: string, tipo: Evento['tipo'], texto: string) {
  await c.query(
    `insert into eventos (rede_id, ocorrencia_id, tipo, autor_nome, autor_perfil, texto) values ($1, $2, $3, $4, $5, $6)`,
    [ctx.vinculo.redeId, ocorrenciaId, tipo, ctx.usuario.nome, ctx.vinculo.perfil, texto],
  );
}
