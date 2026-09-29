import type { ApiErro } from '@tcc/compartilhado/contrato';

/** Erro com o formato do contrato. A mensagem vai para a tela como está. */
export class ErroApi extends Error {
  /** Quando preenchido, a recusa é gravada na auditoria como "negado". */
  auditar?: { recurso: string; detalhe: string };
  constructor(public status: 400 | 401 | 403 | 404 | 409 | 422 | 500, public codigo: ApiErro['codigo'], mensagem: string) {
    super(mensagem);
  }
  registrar(recurso: string, detalhe: string) {
    this.auditar = { recurso, detalhe };
    return this;
  }
  corpo(): ApiErro {
    return { codigo: this.codigo, mensagem: this.message };
  }
}

export const naoAutenticado = () => new ErroApi(401, 'nao_autenticado', 'Sua sessão expirou. Entre novamente.');
export const semPermissao = (mensagem: string) => new ErroApi(403, 'sem_permissao', mensagem);
export const redeDivergente = (mensagem: string) => new ErroApi(403, 'rede_divergente', mensagem);
export const naoEncontrado = (mensagem: string) => new ErroApi(404, 'nao_encontrado', mensagem);
export const conflito = (mensagem: string) => new ErroApi(409, 'conflito', mensagem);
export const validacao = (mensagem: string) => new ErroApi(422, 'validacao', mensagem);
