import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { rotas, type Categoria, type FiltrosDeBusca, type ResultadoDeBusca, type StatusCaso } from '../api/contract';
import { Botao, CampoSelecao, CampoTexto } from '../components/controles';
import { Tabela } from '../components/estrutura';
import { EstadoDaCarga, EtiquetaPrioridade, EtiquetaStatus, rotuloStatus, Vazio } from '../components/feedback';
import { useSessao } from '../state/sessao';
import { useApi } from '../state/useApi';
import { diaPorExtenso } from '../util/formato';

const vazio: FiltrosDeBusca = { de: '', ate: '', categoriaId: '', status: '', prioridade: '', texto: '' };

/**
 * Tela 11: busca. O servidor devolve só o que o perfil alcança; abrir um
 * caso segue as mesmas regras do detalhe.
 */
export function Buscar() {
  const s = useSessao();
  const categorias = useApi<Categoria[]>(rotas.categorias, [s.rede?.id]);
  const [rascunho, setRascunho] = useState<FiltrosDeBusca>(vazio);
  const [aplicados, setAplicados] = useState<FiltrosDeBusca | null>(null);
  const resultado = useApi<ResultadoDeBusca[]>(aplicados ? rotas.busca(aplicados) : null, [aplicados, s.escola?.id]);
  const cats = categorias.estado.tipo === 'ok' ? categorias.estado.dados : [];
  const muda = (k: keyof FiltrosDeBusca) => (e: { target: { value: string } }) => setRascunho((f) => ({ ...f, [k]: e.target.value }));

  function buscar(e: FormEvent) {
    e.preventDefault();
    setAplicados({ ...rascunho });
  }

  return (
    <div className="pagina">
      <div className="pagina-cabeca">
        <h1>Buscar casos</h1>
        <p>Resultados limitados ao que o seu perfil pode ver. Cada busca fica registrada na auditoria.</p>
      </div>

      <form className="painel filtros-busca" onSubmit={buscar} role="search" aria-label="Filtros de busca">
        <CampoTexto rotulo="Protocolo ou local" opcional type="search" value={rascunho.texto} onChange={muda('texto')} />
        <CampoTexto rotulo="De" opcional type="date" value={rascunho.de} onChange={muda('de')} />
        <CampoTexto rotulo="Até" opcional type="date" value={rascunho.ate} onChange={muda('ate')} />
        <CampoSelecao rotulo="Tipo" value={rascunho.categoriaId} onChange={muda('categoriaId')}>
          <option value="">Todos</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </CampoSelecao>
        <CampoSelecao rotulo="Situação" value={rascunho.status} onChange={muda('status')}>
          <option value="">Todas</option>
          {(['recebido', 'em_triagem', 'em_acompanhamento', 'encerrado'] as StatusCaso[]).map((st) => <option key={st} value={st}>{rotuloStatus[st][0]}</option>)}
        </CampoSelecao>
        <CampoSelecao rotulo="Prioridade" value={rascunho.prioridade} onChange={muda('prioridade')}>
          <option value="">Todas</option>
          <option value="urgente">Urgente</option>
          <option value="alta">Alta</option>
          <option value="media">Média</option>
          <option value="baixa">Baixa</option>
        </CampoSelecao>
        <div className="acoes-linha filtros-acoes">
          <Botao type="submit">Buscar</Botao>
          <Botao variante="texto" onClick={() => { setRascunho(vazio); setAplicados(null); }}>Limpar filtros</Botao>
        </div>
      </form>

      {aplicados && (
        <EstadoDaCarga estado={resultado.estado} tentarDeNovo={resultado.tentarDeNovo} rotulo="Buscando">
          {(lista) =>
            lista.length === 0 ? (
              <Vazio titulo="Nenhum caso encontrado">Tente um período maior ou remova algum filtro.</Vazio>
            ) : (
              <section className="pilha" aria-labelledby="t-resultados">
                <h2 id="t-resultados" aria-live="polite" className="titulo-bloco">
                  {lista.length === 1 ? '1 caso encontrado' : `${lista.length} casos encontrados`}
                </h2>
                <Tabela
                  legenda="Resultados da busca"
                  chaveLinha={(o) => o.id}
                  linhas={lista}
                  colunas={[
                    {
                      chave: 'p', titulo: 'Protocolo',
                      celula: (o) => (o.podeAbrir ? <Link to={s.perfil === 'diretoria_regional' ? `/casos/${o.id}` : `/central/${o.id}`}>{o.protocolo}</Link> : <span title="Seu perfil vê só o resumo">{o.protocolo}</span>),
                    },
                    { chave: 'd', titulo: 'Data', celula: (o) => diaPorExtenso(o.abertaEm.slice(0, 10)).replace(' de 2026', '') },
                    { chave: 't', titulo: 'Tipo', celula: (o) => cats.find((c) => c.id === o.categoriaId)?.nome ?? '' },
                    { chave: 'l', titulo: 'Local', celula: (o) => o.local },
                    { chave: 'e', titulo: 'Escola', celula: (o) => o.escolaNome },
                    { chave: 's', titulo: 'Situação', celula: (o) => <EtiquetaStatus status={o.status} /> },
                    { chave: 'r', titulo: 'Prioridade', celula: (o) => <EtiquetaPrioridade prioridade={o.prioridade} /> },
                  ]}
                />
                {lista.some((o) => !o.podeAbrir) && (
                  <p className="campo-ajuda">Protocolos sem link: seu perfil vê só o resumo desses casos.</p>
                )}
              </section>
            )
          }
        </EstadoDaCarga>
      )}
    </div>
  );
}
