import { HttpResponse } from 'msw';
import type { ApiErro, Envolvimento, Evento, Ocorrencia, OcorrenciaResumo, Perfil, Usuario, Vinculo } from '../api/contract';
import { escolas, ocorrencias, usuarios } from './seed';

/*
 * Regras comuns da API simulada. O acesso é decidido aqui, como o backend
 * real deverá fazer: a tela nunca recebe o que o perfil não pode ver.
 */

export const sessoes = new Map<string, string>(); // token -> usuarioId

/*
 * O "banco" da demonstração vive na memória da página. Para um teste de
 * usabilidade não perder o que foi enviado ao recarregar, ele é copiado
 * para a sessão do navegador a cada escrita. A chave tem versão: dados de
 * uma versão anterior do formato são ignorados.
 */
const CHAVE_BANCO = 'demo.banco.ocorrencias.v3';
try {
  const salvo = sessionStorage.getItem(CHAVE_BANCO);
  if (salvo) ocorrencias.splice(0, ocorrencias.length, ...(JSON.parse(salvo) as Ocorrencia[]));
} catch {
  /* sem armazenamento: começa do zero */
}
export function persistir() {
  try {
    sessionStorage.setItem(CHAVE_BANCO, JSON.stringify(ocorrencias));
  } catch {
    /* ignora: a demonstração continua em memória */
  }
}

export const json = (dados: unknown, status = 200) => HttpResponse.json(dados as object, { status }) as Response;
export const erro = (status: number, codigo: ApiErro['codigo'], mensagem: string) => json({ codigo, mensagem } satisfies ApiErro, status);

export type Contexto = { usuario: Usuario; vinculo: Vinculo; escolaId: string | null };

/** Valida token, rede e escola do cabeçalho. Devolve o contexto ou uma resposta de erro. */
export function contexto(request: Request): Contexto | Response {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  // Tokens de demonstração carregam o id da pessoa, para a sessão sobreviver
  // a um recarregamento da página (a API simulada perde a memória ao recarregar).
  const usuarioId = token ? sessoes.get(token) ?? token.match(/^demo-(u-[a-z]+)-/)?.[1] : undefined;
  const usuario = usuarios.find((u) => u.id === usuarioId);
  if (!usuario) return erro(401, 'nao_autenticado', 'Sua sessão expirou. Entre novamente.');

  const redeId = request.headers.get('X-Rede-Id');
  const vinculo = usuario.vinculos.find((v) => v.redeId === redeId);
  if (!vinculo) return erro(403, 'sem_permissao', 'Você não tem vínculo com esta rede.');

  const escolaId = request.headers.get('X-Escola-Id');
  if (escolaId) {
    const escola = escolas.find((e) => e.id === escolaId);
    if (!escola || escola.redeId !== redeId) return erro(403, 'rede_divergente', 'Esta escola não pertence à rede ativa.');
    if (vinculo.escolaIds.length > 0 && !vinculo.escolaIds.includes(escolaId)) {
      return erro(403, 'sem_permissao', 'Você não tem vínculo com esta escola.');
    }
  }
  return { usuario, vinculo, escolaId };
}

/** Escolas que o vínculo alcança dentro da rede. */
export function escolasDoVinculo(v: Vinculo) {
  const daRede = escolas.filter((e) => e.redeId === v.redeId);
  if (v.escolaIds.length > 0) return daRede.filter((e) => v.escolaIds.includes(e.id));
  if (v.regionalId) return daRede.filter((e) => e.regionalId === v.regionalId);
  return daRede;
}

export const conduzCasos: Perfil[] = ['coordenacao', 'direcao', 'referente_protecao'];
export const soProprios: Perfil[] = ['professor', 'apoio'];
export const conduz = (ctx: Contexto) => conduzCasos.includes(ctx.vinculo.perfil);

/** Pode abrir o registro completo? Perfis de rede veem só números agregados. */
export function podeAbrir(ctx: Contexto, o: OcorrenciaResumo) {
  if (o.redeId !== ctx.vinculo.redeId) return false;
  if (!escolasDoVinculo(ctx.vinculo).some((e) => e.id === o.escolaId)) return false;
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

export function novoEvento(ctx: Contexto, tipo: Evento['tipo'], texto: string): Evento {
  return {
    id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    tipo, autorNome: ctx.usuario.nome, autorPerfil: ctx.vinculo.perfil, em: new Date().toISOString(), texto,
  };
}

export const semAcento = (t: string) => t.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Localiza o caso e confere se quem pede pode agir nele (conduz casos na escola). */
export function casoParaAgir(request: Request, id: string): { ctx: Contexto; o: Ocorrencia } | Response {
  const ctx = contexto(request);
  if (ctx instanceof Response) return ctx;
  const o = ocorrencias.find((x) => x.id === id);
  if (!o || o.redeId !== ctx.vinculo.redeId) return erro(404, 'nao_encontrado', 'Não encontramos este caso.');
  if (!conduz(ctx) || !podeAbrir(ctx, o)) return erro(403, 'sem_permissao', 'Seu perfil não conduz casos nesta escola.');
  if (o.status === 'encerrado') return erro(409, 'conflito', 'Este caso está encerrado. Para retomar, registre uma reavaliação com a direção.');
  return { ctx, o };
}
