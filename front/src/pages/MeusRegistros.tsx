import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { rotas, type Categoria, type OcorrenciaResumo, type StatusCaso } from '../api/contract';
import { Painel } from '../components/estrutura';
import { EstadoDaCarga, EtiquetaStatus, Vazio } from '../components/feedback';
import { IconeDocumento, IconeLupa, IconeMais, IconeOk, IconeRelogio, IconeSeta } from '../components/icones';
import { useRascunhosLocais } from '../state/rascunhosLocais';
import { useDono } from '../state/useDono';
import { useSessao } from '../state/sessao';
import { useApi } from '../state/useApi';
import { dataHoraCurta } from '../util/formato';

type Filtro = 'todas' | 'analise' | 'acompanhamento' | 'encerradas';

const grupos: Record<Exclude<Filtro, 'todas'>, StatusCaso[]> = {
  analise: ['recebido', 'em_triagem'],
  acompanhamento: ['em_acompanhamento', 'encaminhado_rede'],
  encerradas: ['encerrado', 'duplicado', 'cancelado'],
};
const filtros: [Filtro, string][] = [
  ['todas', 'Todas'],
  ['analise', 'Em análise'],
  ['acompanhamento', 'Em acompanhamento'],
  ['encerradas', 'Encerradas'],
];

const grupoDe = (s: StatusCaso): Filtro =>
  (Object.keys(grupos) as Exclude<Filtro, 'todas'>[]).find((g) => grupos[g].includes(s)) ?? 'todas';

const iconeDoGrupo = { analise: IconeRelogio, acompanhamento: IconeDocumento, encerradas: IconeOk, todas: IconeDocumento };

/** Tela 5: registros enviados pela pessoa e rascunhos guardados neste aparelho. */
export function MeusRegistros() {
  const s = useSessao();
  const dono = useDono();
  const id = useId();
  const rascunhos = useRascunhosLocais(dono);
  const lista = useApi<OcorrenciaResumo[]>(rotas.ocorrencias, [s.rede?.id, s.escola?.id]);
  const categorias = useApi<Categoria[]>(rotas.categorias, [s.rede?.id]);
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [busca, setBusca] = useState('');
  const nomeCategoria = (cid: string) =>
    (categorias.estado.tipo === 'ok' && categorias.estado.dados.find((c) => c.id === cid)?.nome) || 'Tipo não escolhido';

  return (
    <div className="pagina">
      <div className="inicio-cabeca">
        <div className="pagina-cabeca">
          <h1>Meus registros</h1>
          <p>Ocorrências que você enviou{s.escola ? ` na ${s.escola.sigla ?? s.escola.nome}` : ''} e rascunhos ainda não enviados.</p>
        </div>
        <Link className="btn btn-primario" to="/registrar"><IconeMais />Registrar ocorrência</Link>
      </div>

      {rascunhos.length > 0 && (
        <Painel titulo="Rascunhos neste aparelho">
          <ul className="lista-rascunhos">
            {rascunhos.map((r) => (
              <li key={r.id}>
                <div>
                  <strong>{nomeCategoria(r.fato.categoriaId)}{r.fato.local ? `, ${r.fato.local}` : ''}</strong>
                  <span>Alterado em {dataHoraCurta(r.atualizadoEm)}. Parou na etapa {r.passo} de 3.</span>
                </div>
                <Link className="btn btn-secundario" to={`/registrar/${r.id}`}>
                  Continuar<span className="visualmente-oculto"> rascunho de {nomeCategoria(r.fato.categoriaId)}</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="campo-ajuda">Rascunhos ficam só neste aparelho e não são vistos pela escola até o envio.</p>
        </Painel>
      )}

      <section className="pilha" aria-labelledby="t-enviados">
        <h2 id="t-enviados">Enviados</h2>
        <EstadoDaCarga estado={lista.estado} tentarDeNovo={lista.tentarDeNovo} rotulo="Carregando registros">
          {(dados) => {
            const meus = dados.filter((o) => o.criadoPorId === s.sessao?.usuario.id);
            if (meus.length === 0) {
              return (
                <Vazio titulo="Você ainda não enviou registros nesta escola" acao={<Link className="btn btn-secundario" to="/registrar">Registrar ocorrência</Link>}>
                  Depois de enviado, o registro aparece aqui com o número de protocolo e a situação atual.
                </Vazio>
              );
            }
            const termo = busca.trim().toLowerCase();
            const contagem = (f: Filtro) => (f === 'todas' ? meus.length : meus.filter((o) => grupos[f].includes(o.status)).length);
            const visiveis = meus
              .filter((o) => filtro === 'todas' || grupos[filtro].includes(o.status))
              .filter((o) => !termo || `${o.protocolo} ${nomeCategoria(o.categoriaId)} ${o.local}`.toLowerCase().includes(termo));
            return (
              <>
                <div className="busca-linha">
                  <label htmlFor={`${id}-busca`} className="visualmente-oculto">Buscar nos meus registros</label>
                  <span className="busca-icone" aria-hidden="true"><IconeLupa /></span>
                  <input
                    id={`${id}-busca`}
                    className="entrada"
                    type="search"
                    placeholder="Buscar por protocolo, tipo ou local"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                  />
                </div>
                <div className="filtros" role="group" aria-label="Filtrar por situação">
                  {filtros.map(([f, rotulo]) => (
                    <button key={f} type="button" className="filtro" aria-pressed={filtro === f} onClick={() => setFiltro(f)}>
                      {rotulo} <span className="filtro-num">{contagem(f)}</span>
                    </button>
                  ))}
                </div>
                <p className="visualmente-oculto" role="status">
                  {visiveis.length === 1 ? '1 registro' : `${visiveis.length} registros`}
                </p>
                {visiveis.length === 0 ? (
                  <p className="campo-ajuda">Nenhum registro com esse filtro.</p>
                ) : (
                  <ul className="cartoes-registro">
                    {visiveis.map((o) => {
                      const g = grupoDe(o.status);
                      const Icone = iconeDoGrupo[g];
                      return (
                        <li key={o.id} className={`cartao-registro cartao-${g}`}>
                          <div className="cartao-registro-topo">
                            <span className="cartao-registro-icone" aria-hidden="true"><Icone /></span>
                            <h3>
                              <Link to={`/casos/${o.id}`}>
                                <span className="visualmente-oculto">Protocolo </span>{o.protocolo}
                              </Link>
                            </h3>
                          </div>
                          <dl className="cartao-registro-dados">
                            <div><dt>Tipo</dt><dd>{nomeCategoria(o.categoriaId)}</dd></div>
                            <div><dt>Local</dt><dd>{o.local}</dd></div>
                          </dl>
                          <div className="cartao-registro-rodape">
                            <EtiquetaStatus status={o.status} />
                            <span>Enviado em {dataHoraCurta(o.abertaEm)}</span>
                            <Link className="cartao-registro-abrir" to={`/casos/${o.id}`} aria-hidden="true" tabIndex={-1}>
                              Acompanhar <IconeSeta width={18} height={18} />
                            </Link>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            );
          }}
        </EstadoDaCarga>
      </section>
    </div>
  );
}
