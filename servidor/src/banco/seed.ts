import { comoDono, type Cliente } from './conexao';
import { hashDoToken } from '../seguranca';
import { modelos, regras } from '@tcc/compartilhado/protocolo';
import { categorias, categoriasSensiveis, contatos, escolas, ocorrencias, pessoas, redes, regionais, usuarios } from '@tcc/compartilhado/seed';

/*
 * Carrega os dados fictícios da demonstração (os mesmos da API simulada).
 * Só para desenvolvimento, testes e previews: produção nunca recebe seed.
 * Roda como dono do banco, antes de a aplicação atender.
 */


/** Tabelas com dados, na ordem em que podem ser esvaziadas (filhas antes das mães). */
const TABELAS = [
  'tokens_ciencia', 'auditoria', 'sessoes', 'comunicacoes', 'acoes_plano', 'encaminhamentos', 'providencias', 'eventos', 'anexos',
  'envolvimentos', 'ocorrencias', 'contadores_protocolo', 'responsaveis', 'pessoas', 'contatos_locais',
  'modelos_comunicacao', 'regras_protocolo', 'categorias', 'vinculo_escolas', 'vinculos', 'usuarios', 'escolas',
  'regionais', 'redes',
];

export function carregarSeed() {
  if (process.env.VERCEL_ENV === 'production') throw new Error('Seed fictício não pode rodar em produção.');
  return comoDono(semear);
}

async function semear(c: Cliente) {
  // O dono do banco também está sujeito à Row-Level Security (FORCE): cada linha
  // é gravada com a sua rede informada, como a aplicação faz.
  let redeAtual = '';
  const naRedeDaLinha = async (rede: string) => {
    if (rede === redeAtual) return;
    redeAtual = rede;
    await c.query(`select set_config('app.rede_id', $1, true)`, [rede]);
  };
  const ins = async (tabela: string, linha: Record<string, unknown>) => {
    if (typeof linha.rede_id === 'string') await naRedeDaLinha(linha.rede_id);
    const cols = Object.keys(linha);
    return c.query(
      `insert into ${tabela} (${cols.join(', ')}) values (${cols.map((_, i) => `$${i + 1}`).join(', ')})`,
      Object.values(linha),
    );
  };
  try {
    await c.query('begin');
    await c.query(`truncate ${TABELAS.join(', ')} restart identity cascade`);

    for (const r of redes) await ins('redes', { id: r.id, nome: r.nome, secretaria: r.secretaria, municipio: r.municipio, uf: r.uf, esfera: r.esfera, sigla: r.sigla, subdominio: r.subdominio });
    for (const r of regionais) await ins('regionais', { id: r.id, rede_id: r.redeId, nome: r.nome });
    for (const e of escolas) await ins('escolas', { id: e.id, rede_id: e.redeId, regional_id: e.regionalId, nome: e.nome, sigla: e.sigla ?? null, municipio: e.municipio, bairro: e.bairro });

    await ins('usuarios', { id: 'u-historico', nome: 'Registro histórico' });
    for (const u of usuarios) {
      await ins('usuarios', { id: u.id, nome: u.nome });
      for (const v of u.vinculos) {
        const id = `${u.id}@${v.redeId}`;
        await ins('vinculos', { id, usuario_id: u.id, rede_id: v.redeId, perfil: v.perfil, regional_id: v.regionalId ?? null });
        for (const escolaId of v.escolaIds) await ins('vinculo_escolas', { vinculo_id: id, rede_id: v.redeId, escola_id: escolaId });
      }
    }

    for (const [i, cat] of categorias.entries()) await ins('categorias', { id: cat.id, rede_id: cat.redeId, nome: cat.nome, ativa: cat.ativa, ordem: i, sensivel: categoriasSensiveis.includes(cat.id) });
    for (const [i, r] of regras.entries()) {
      await ins('regras_protocolo', {
        id: r.id, rede_id: r.redeId, categoria_ids: r.categoriaIds === 'todas' ? null : r.categoriaIds,
        somente_com_risco: r.somenteComRisco, descricao: r.descricao, base: r.base, obrigatoria: r.obrigatoria, ordem: i,
      });
    }
    for (const m of modelos) await ins('modelos_comunicacao', { id: m.id, rede_id: m.redeId, tipo: m.tipo, nome: m.nome, texto: m.texto });
    for (const ct of contatos) {
      const rede = escolas.find((e) => e.id === ct.escolaId)!.redeId;
      await ins('contatos_locais', { escola_id: ct.escolaId, rede_id: rede, conselho_tutelar: ct.conselhoTutelar, cras: ct.cras, creas: ct.creas, delegacia: ct.delegacia, saude: ct.saude });
    }
    for (const p of pessoas) await ins('pessoas', { id: p.id, rede_id: p.redeId, escola_id: p.escolaId, nome: p.nome, tipo: p.tipo, turma: p.turma ?? null });

    for (const o of ocorrencias) {
      const r = o.redeId;
      await ins('ocorrencias', {
        id: o.id, rede_id: r, escola_id: o.escolaId, protocolo: o.protocolo, categoria_id: o.categoriaId, status: o.status,
        prioridade: o.prioridade, aberta_em: o.abertaEm, local: o.local, criado_por_id: o.criadoPorId, criado_por_nome: o.criadoPorNome,
        registro_na_rede: o.registroNaRede, responsavel_id: o.responsavelId, responsavel_nome: o.responsavelNome,
        fato_data: o.fato.data, fato_hora: o.fato.hora, relato: o.fato.relato, risco_imediato: o.fato.riscoImediato,
        providencia_imediata: o.fato.providenciaImediata,
        encerrado_em: o.encerramento?.em ?? null, encerrado_por: o.encerramento?.por ?? null,
        justificativa_encerramento: o.encerramento?.justificativa ?? null, reavaliar_em: o.encerramento?.reavaliarEm ?? null,
      });
      for (const [i, e] of o.envolvidos.entries()) {
        await ins('envolvimentos', { ocorrencia_id: o.id, rede_id: r, pessoa_id: e.pessoaId, nome: e.nome, tipo: e.tipo, turma: e.turma ?? null, papel: e.papel, visibilidade: e.visibilidade, ordem: i });
      }
      for (const a of o.anexos) await ins('anexos', { id: a.id, rede_id: r, ocorrencia_id: o.id, nome: a.nome, tamanho_kb: a.tamanhoKb, justificativa: a.justificativa });
      for (const ev of o.eventos) await ins('eventos', { id: ev.id, rede_id: r, ocorrencia_id: o.id, tipo: ev.tipo, autor_nome: ev.autorNome, autor_perfil: ev.autorPerfil, em: ev.em, texto: ev.texto });
      for (const [i, p] of o.providencias.entries()) {
        await ins('providencias', {
          id: p.id, rede_id: r, ocorrencia_id: o.id, descricao: p.descricao, base: p.base, obrigatoria: p.obrigatoria, situacao: p.situacao,
          registrada_por: p.registradaPor ?? null, registrada_em: p.registradaEm ?? null, observacao: p.observacao ?? null, ordem: i,
        });
      }
      for (const e of o.encaminhamentos) {
        await ins('encaminhamentos', {
          id: e.id, rede_id: r, ocorrencia_id: o.id, orgao: e.orgao, orgao_nome: e.orgaoNome, canal: e.canal, em: e.em,
          protocolo_externo: e.protocoloExterno, devolutiva_ate: e.devolutivaAte, devolutiva_em: e.devolutiva?.em ?? null,
          devolutiva_texto: e.devolutiva?.texto ?? null, registrado_por: e.registradoPor,
        });
      }
      for (const [i, a] of o.plano.entries()) await ins('acoes_plano', { id: a.id, rede_id: r, ocorrencia_id: o.id, descricao: a.descricao, responsavel: a.responsavel, prazo: a.prazo, situacao: a.situacao, ordem: i });
      for (const cm of o.comunicacoes) {
        const token = cm.linkCiencia?.replace('/ciencia/', '') ?? null;
        await ins('comunicacoes', {
          id: cm.id, rede_id: r, ocorrencia_id: o.id, tipo: cm.tipo, destinatario: cm.destinatario, texto: cm.texto, em: cm.em,
          registrada_por: cm.registradaPor, token_hash: token ? hashDoToken(token) : null, link_ciencia: cm.linkCiencia,
          ciencia_em: cm.ciencia?.em ?? null, ciencia_nome: cm.ciencia?.nome ?? null,
        });
        if (token) await ins('tokens_ciencia', { token_hash: hashDoToken(token), rede_id: r });
      }
    }

    // O contador de protocolo começa do maior número já usado em cada rede e ano.
    for (const r of redes) {
      await naRedeDaLinha(r.id);
      await c.query(`
        insert into contadores_protocolo (rede_id, ano, ultimo)
        select rede_id, split_part(protocolo, '-', 1)::int, max(split_part(protocolo, '-', 2)::int)
        from ocorrencias group by 1, 2`);
    }

    await c.query('commit');
  } catch (e) {
    await c.query('rollback');
    throw e;
  }
}
