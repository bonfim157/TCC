import { useState } from 'react';
import { api, ErroDaApi, FalhaDeRede } from '../api/client';
import { rotas, type Categoria, type Contagem, type Exportacao, type Relatorio } from '../api/contract';
import { Botao, CampoAreaTexto, CampoSelecao, CampoTexto } from '../components/controles';
import { DialogoFormulario, Painel } from '../components/estrutura';
import { Aviso, EstadoDaCarga, useNotificar } from '../components/feedback';
import { perfisDeEscola } from '../state/perfis';
import { useSessao } from '../state/sessao';
import { useApi } from '../state/useApi';
import { diaPorExtenso, hojeISO } from '../util/formato';

/**
 * Barras horizontais de uma só série. O valor fica escrito ao lado de cada
 * barra; grupos suprimidos aparecem como texto, sem barra.
 */
function Barras({ titulo, dados, limite }: { titulo: string; dados: Contagem[]; limite: number }) {
  const max = Math.max(1, ...dados.map((d) => d.total ?? 0));
  return (
    <Painel titulo={titulo}>
      {dados.length === 0 ? <p>Nenhum caso no período.</p> : (
        <table className="barras">
          <caption className="visualmente-oculto">{titulo}</caption>
          <thead className="visualmente-oculto"><tr><th scope="col">Grupo</th><th scope="col">Casos</th></tr></thead>
          <tbody>
            {dados.map((d) => (
              <tr key={d.chave}>
                <th scope="row">{d.rotulo}</th>
                <td>
                  <span className="barra-trilho">
                    {d.total !== null && <span className="barra" style={{ width: `${(d.total / max) * 100}%` }} />}
                    <span className={d.total === null ? 'barra-valor barra-suprimida' : 'barra-valor'}>
                      {d.total === null ? `menos de ${limite}` : d.total}
                    </span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Painel>
  );
}

const inicioDoAno = () => `${new Date().getFullYear()}-01-01`;
const mesesAtras = (n: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

/** Tela 12: relatório agregado. Nenhum caso individual aparece aqui. */
export function Relatorios() {
  const s = useSessao();
  const notificar = useNotificar();
  const categorias = useApi<Categoria[]>(rotas.categorias, [s.rede?.id]);
  const [filtro, setFiltro] = useState({ de: inicioDoAno(), ate: hojeISO(), escolaId: '', categoriaId: '' });
  const relatorio = useApi<Relatorio>(rotas.relatorio(filtro), [filtro, s.escola?.id], { manterAoAtualizar: true });
  const [exportar, setExportar] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const cats = categorias.estado.tipo === 'ok' ? categorias.estado.dados : [];
  const escolhePorEscola = s.perfil && !perfisDeEscola.includes(s.perfil) && s.escolas.length > 1;
  const bullying = cats.find((c) => /bullying/i.test(c.nome));

  async function gerar() {
    setEnviando(true);
    setErro(null);
    try {
      const r = await api<Exportacao>(rotas.exportacoes, {
        method: 'POST',
        body: JSON.stringify({ motivo, de: filtro.de, ate: filtro.ate, escolaId: filtro.escolaId, somenteCategoriaId: filtro.categoriaId }),
      });
      const url = URL.createObjectURL(new Blob(['﻿' + r.conteudoCsv], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = r.nomeArquivo;
      a.click();
      URL.revokeObjectURL(url);
      setExportar(false);
      setMotivo('');
      notificar('Arquivo gerado. A exportação e o motivo ficaram registrados na auditoria.');
    } catch (e) {
      setErro(e instanceof FalhaDeRede ? 'Sem conexão. Tente de novo.' : e instanceof ErroDaApi ? e.message : 'Não foi possível exportar.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="pagina">
      <div className="pagina-cabeca">
        <h1>Relatórios</h1>
        <p>Números agregados para planejar ações de convivência. Nenhum caso individual aparece aqui.</p>
      </div>

      <div className="painel filtros-busca">
        <CampoTexto rotulo="De" type="date" value={filtro.de} onChange={(e) => setFiltro((f) => ({ ...f, de: e.target.value }))} />
        <CampoTexto rotulo="Até" type="date" value={filtro.ate} max={hojeISO()} onChange={(e) => setFiltro((f) => ({ ...f, ate: e.target.value }))} />
        <CampoSelecao rotulo="Tipo" value={filtro.categoriaId} onChange={(e) => setFiltro((f) => ({ ...f, categoriaId: e.target.value }))}>
          <option value="">Todos</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </CampoSelecao>
        {escolhePorEscola && (
          <CampoSelecao rotulo="Escola" value={filtro.escolaId} onChange={(e) => setFiltro((f) => ({ ...f, escolaId: e.target.value }))}>
            <option value="">Todas do meu alcance</option>
            {s.escolas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </CampoSelecao>
        )}
        <div className="acoes-linha filtros-acoes">
          {bullying && (
            <Botao variante="secundario" onClick={() => setFiltro((f) => ({ ...f, de: mesesAtras(2), ate: hojeISO(), categoriaId: bullying.id }))}>
              Relatório bimestral de bullying
            </Botao>
          )}
          <Botao variante="secundario" onClick={() => { setErro(null); setExportar(true); }}>Exportar planilha</Botao>
        </div>
      </div>

      <EstadoDaCarga estado={relatorio.estado} tentarDeNovo={relatorio.tentarDeNovo} rotulo="Calculando relatório">
        {(r) => (
          <>
            <div className="relatorio-resumo">
              <p className="relatorio-total"><strong>{r.total}</strong> {r.total === 1 ? 'caso' : 'casos'}</p>
              <p>
                {r.escopo}, de {r.periodo.de ? diaPorExtenso(r.periodo.de) : 'o início'} a {r.periodo.ate ? diaPorExtenso(r.periodo.ate) : 'hoje'}.
                {filtro.categoriaId && ` Só ${cats.find((c) => c.id === filtro.categoriaId)?.nome.toLowerCase()}.`}
              </p>
            </div>
            <Aviso tipo="info">
              Grupos com menos de {r.limiteMinimo} casos aparecem como “menos de {r.limiteMinimo}”, para não permitir identificar estudantes.
              Mais registros podem indicar mais confiança no canal, não piora da convivência.
            </Aviso>
            <div className="relatorio-grade">
              <Barras titulo="Casos por tipo" dados={[...r.porCategoria].sort((a, b) => (b.total ?? 0) - (a.total ?? 0))} limite={r.limiteMinimo} />
              <Barras titulo="Casos por mês" dados={r.porMes} limite={r.limiteMinimo} />
              <Barras titulo="Casos por situação" dados={r.porSituacao} limite={r.limiteMinimo} />
            </div>
          </>
        )}
      </EstadoDaCarga>

      <DialogoFormulario
        aberto={exportar}
        titulo="Exportar planilha agregada"
        descricao="A planilha terá só os números deste relatório, com os mesmos grupos suprimidos. A exportação e o motivo ficam registrados."
        enviar="Gerar planilha"
        carregando={enviando}
        erro={erro}
        aoCancelar={() => setExportar(false)}
        aoEnviar={gerar}
      >
        <CampoAreaTexto
          rotulo="Para que você vai usar esta planilha"
          ajuda="Ex.: relatório bimestral de bullying para a Unidade Regional, conforme a Lei 13.185."
          rows={3}
          maxLength={400}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />
      </DialogoFormulario>
    </div>
  );
}
