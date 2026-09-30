import { comoDono, configurarBanco, fecharBanco } from '../src/banco/conexao';
import { DONO_LOCAL, iniciarBancoLocal } from '../src/banco/local';
import { migrar } from '../src/banco/migrar';
import { carregarSeed } from '../src/banco/seed';
import { criarApp } from '../src/app';

/** Banco local novo, com migrações e dados fictícios, e a API pronta para receber pedidos. */
export async function prepararAmbiente(opcoes: { semSeed?: boolean } = {}) {
  process.env.TCC_LOGIN_DEMO = '1';
  const local = await iniciarBancoLocal();
  const pool = configurarBanco(local.url, { max: 1, donoLocal: DONO_LOCAL });
  await migrar();
  if (!opcoes.semSeed) await carregarSeed();
  const app = criarApp();

  const pedir = (caminho: string, init: RequestInit & { cabecalhos?: Record<string, string> } = {}) =>
    app.request(`/api${caminho}`, {
      ...init,
      headers: { 'content-type': 'application/json', ...(init.cabecalhos ?? {}) },
    });

  /** Entra pelo login de demonstração e devolve os cabeçalhos da sessão. */
  async function entrar(usuarioId: string, redeId: string, escolaId?: string) {
    const r = await pedir('/sessoes', { method: 'POST', body: JSON.stringify({ usuarioId, redeId }) });
    if (r.status !== 200) throw new Error(`login falhou: ${r.status} ${await r.text()}`);
    const { token } = (await r.json()) as { token: string };
    return {
      authorization: `Bearer ${token}`,
      'x-rede-id': redeId,
      ...(escolaId ? { 'x-escola-id': escolaId } : {}),
    } as Record<string, string>;
  }

  return {
    pool,
    /** SQL como dono do banco, para preparar situações de teste. */
    dono: (sql: string, parametros: unknown[] = []) => comoDono((c) => c.query(sql, parametros)),
    pedir,
    entrar,
    async encerrar() {
      await fecharBanco();
      await local.parar();
    },
  };
}
