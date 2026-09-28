import type { ApiErro } from './contract';

/*
 * Cliente HTTP. Anexa token, rede e escola ativas em toda chamada.
 * O estado vem de `configurarCliente`, chamado pelo provedor de sessão.
 */

type Credenciais = { token: string | null; redeId: string | null; escolaId: string | null };
let credenciais: Credenciais = { token: null, redeId: null, escolaId: null };
let semConexaoSimulada = false;

export function configurarCliente(c: Partial<Credenciais>) {
  credenciais = { ...credenciais, ...c };
}

export function simularSemConexao(ativo: boolean) {
  semConexaoSimulada = ativo;
}

export class FalhaDeRede extends Error {
  constructor() {
    super('Sem conexão com o servidor.');
  }
}

export class ErroDaApi extends Error {
  constructor(public status: number, public dados: ApiErro) {
    super(dados.mensagem);
  }
}

export async function api<T>(caminho: string, init: RequestInit = {}): Promise<T> {
  if (semConexaoSimulada || !navigator.onLine) throw new FalhaDeRede();

  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body) headers.set('Content-Type', 'application/json');
  if (credenciais.token) headers.set('Authorization', `Bearer ${credenciais.token}`);
  if (credenciais.redeId) headers.set('X-Rede-Id', credenciais.redeId);
  if (credenciais.escolaId) headers.set('X-Escola-Id', credenciais.escolaId);

  let resposta: Response;
  try {
    resposta = await fetch(caminho, { ...init, headers });
  } catch {
    throw new FalhaDeRede();
  }

  if (!resposta.ok) {
    const dados = (await resposta.json().catch(() => ({
      codigo: 'erro_interno',
      mensagem: 'O servidor respondeu de forma inesperada.',
    }))) as ApiErro;
    throw new ErroDaApi(resposta.status, dados);
  }
  return (await resposta.json()) as T;
}
