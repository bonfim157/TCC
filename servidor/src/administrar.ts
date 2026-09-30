import { randomBytes } from 'node:crypto';
import type { Perfil } from '@tcc/compartilhado/contrato';
import { modelos, regras } from '@tcc/compartilhado/protocolo';
import { categorias, categoriasSensiveis, escolas, redes, regionais } from '@tcc/compartilhado/seed';
import { comoDono, type Cliente } from './banco/conexao';
import { hashDaSenha } from './senha';

/*
 * Tarefas de administração feitas como dono do banco, pela linha de comando
 * (src/cli.ts): a carga inicial de uma rede real e a criação de contas.
 * Nada aqui é alcançável pela API.
 */

const PERFIS: Perfil[] = ['professor', 'apoio', 'coordenacao', 'direcao', 'referente_protecao', 'diretoria_regional', 'secretaria', 'admin_tecnico'];

async function naRedeComoDono<T>(redeId: string, fn: (c: Cliente) => Promise<T>) {
  return comoDono(async (c) => {
    await c.query('begin');
    try {
      await c.query(`select set_config('app.rede_id', $1, true)`, [redeId]);
      const r = await fn(c);
      await c.query('commit');
      return r;
    } catch (e) {
      await c.query('rollback');
      throw e;
    }
  });
}

/**
 * Carga inicial de uma rede: a rede, suas regionais e escolas, os tipos de
 * ocorrência, o protocolo de providências e os modelos de comunicação. Sem
 * pessoas e sem casos. Os dados vêm de compartilhado/ (os mesmos da
 * demonstração, que para a rede SP descrevem a IMSIL de verdade).
 * Pode rodar de novo: o que já existe fica como está.
 */
export async function cargaInicial(redeId: string) {
  const rede = redes.find((r) => r.id === redeId);
  if (!rede) throw new Error(`Rede desconhecida: ${redeId}. Conhecidas: ${redes.map((r) => r.id).join(', ')}`);
  return naRedeComoDono(redeId, async (c) => {
    const ins = (tabela: string, linha: Record<string, unknown>) => {
      const cols = Object.keys(linha);
      return c.query(
        `insert into ${tabela} (${cols.join(', ')}) values (${cols.map((_, i) => `$${i + 1}`).join(', ')}) on conflict do nothing`,
        Object.values(linha),
      );
    };
    await ins('redes', { id: rede.id, nome: rede.nome, secretaria: rede.secretaria, municipio: rede.municipio, uf: rede.uf, esfera: rede.esfera, sigla: rede.sigla, subdominio: rede.subdominio });
    for (const r of regionais.filter((x) => x.redeId === redeId)) await ins('regionais', { id: r.id, rede_id: redeId, nome: r.nome });
    for (const e of escolas.filter((x) => x.redeId === redeId)) {
      await ins('escolas', { id: e.id, rede_id: redeId, regional_id: e.regionalId, nome: e.nome, sigla: e.sigla ?? null, municipio: e.municipio, bairro: e.bairro });
      await ins('contatos_locais', { escola_id: e.id, rede_id: redeId });
    }
    for (const [i, cat] of categorias.filter((x) => x.redeId === redeId).entries()) {
      await ins('categorias', { id: cat.id, rede_id: redeId, nome: cat.nome, ativa: true, ordem: i, sensivel: categoriasSensiveis.includes(cat.id) });
    }
    for (const [i, r] of regras.filter((x) => x.redeId === redeId).entries()) {
      await ins('regras_protocolo', {
        id: r.id, rede_id: redeId, categoria_ids: r.categoriaIds === 'todas' ? null : r.categoriaIds,
        somente_com_risco: r.somenteComRisco, descricao: r.descricao, base: r.base, obrigatoria: r.obrigatoria, ordem: i,
      });
    }
    for (const m of modelos.filter((x) => x.redeId === redeId)) await ins('modelos_comunicacao', { id: m.id, rede_id: redeId, tipo: m.tipo, nome: m.nome, texto: m.texto });
    const n = async (t: string) => Number((await c.query(`select count(*) n from ${t}`)).rows[0].n);
    return { escolas: await n('escolas'), categorias: await n('categorias'), regras: await n('regras_protocolo'), modelos: await n('modelos_comunicacao') };
  });
}

export type NovaConta = { nome: string; email: string; redeId: string; perfil: Perfil; escolaIds?: string[]; regionalId?: string };

/**
 * Cria uma conta com vínculo numa rede e devolve a senha temporária, que a
 * pessoa troca no primeiro acesso. Se o e-mail já existe, só acrescenta o
 * vínculo (uma pessoa pode atuar em mais de uma rede) e não mexe na senha.
 */
export async function criarConta(conta: NovaConta): Promise<{ usuarioId: string; senhaTemporaria: string | null }> {
  const email = conta.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('E-mail inválido.');
  if (conta.nome.trim().length < 3) throw new Error('Informe o nome completo.');
  if (!PERFIS.includes(conta.perfil)) throw new Error(`Perfil inválido. Use um de: ${PERFIS.join(', ')}`);
  const escolaIds = conta.escolaIds ?? [];
  const perfilDeEscola = !['diretoria_regional', 'secretaria', 'admin_tecnico'].includes(conta.perfil);
  if (perfilDeEscola && escolaIds.length === 0) throw new Error('Perfis de escola precisam de ao menos uma escola.');
  if (conta.perfil === 'diretoria_regional' && !conta.regionalId) throw new Error('A diretoria regional precisa da regional.');

  return naRedeComoDono(conta.redeId, async (c) => {
    if (!(await c.query('select 1 from redes where id = $1', [conta.redeId])).rowCount) throw new Error('Rede não encontrada. Rode a carga inicial antes.');
    for (const e of escolaIds) {
      if (!(await c.query('select 1 from escolas where id = $1', [e])).rowCount) throw new Error(`Escola ${e} não existe nesta rede.`);
    }
    if (conta.regionalId && !(await c.query('select 1 from regionais where id = $1', [conta.regionalId])).rowCount) throw new Error('Regional não existe nesta rede.');

    let usuarioId = (await c.query<{ id: string }>('select id from usuarios where lower(email) = $1', [email])).rows[0]?.id;
    let senhaTemporaria: string | null = null;
    if (!usuarioId) {
      // 16 caracteres aleatórios: forte o bastante para durar até o primeiro acesso.
      senhaTemporaria = randomBytes(12).toString('base64url');
      usuarioId = (await c.query<{ id: string }>(
        `insert into usuarios (nome, email, senha_hash, senha_temporaria) values ($1, $2, $3, true) returning id`,
        [conta.nome.trim(), email, await hashDaSenha(senhaTemporaria)],
      )).rows[0].id;
    }
    await c.query(`select set_config('app.usuario_id', $1, true)`, [usuarioId]);
    if ((await c.query('select 1 from vinculos where usuario_id = $1 and rede_id = $2', [usuarioId, conta.redeId])).rowCount) {
      throw new Error('Esta pessoa já tem vínculo com a rede.');
    }
    const vinculoId = (await c.query<{ id: string }>(
      `insert into vinculos (usuario_id, rede_id, perfil, regional_id) values ($1, $2, $3, $4) returning id`,
      [usuarioId, conta.redeId, conta.perfil, conta.regionalId ?? null],
    )).rows[0].id;
    for (const e of escolaIds) await c.query('insert into vinculo_escolas (vinculo_id, rede_id, escola_id) values ($1, $2, $3)', [vinculoId, conta.redeId, e]);
    await c.query(
      `insert into auditoria (rede_id, ator, acao, recurso, resultado, detalhe) values ($1, 'Administração do sistema', 'administracao', $2, 'permitido', $3)`,
      [conta.redeId, `conta de ${conta.nome.trim()}`, `criada com perfil ${conta.perfil}`],
    );
    return { usuarioId, senhaTemporaria };
  });
}
