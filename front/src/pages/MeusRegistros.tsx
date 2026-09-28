import { Link } from 'react-router-dom';
import { rotas, type Categoria, type OcorrenciaResumo } from '../api/contract';
import { Painel, Tabela } from '../components/estrutura';
import { EstadoDaCarga, EtiquetaStatus, Vazio } from '../components/feedback';
import { useRascunhosLocais } from '../state/rascunhosLocais';
import { useDono } from '../state/useDono';
import { useSessao } from '../state/sessao';
import { useApi } from '../state/useApi';
import { dataHoraCurta } from '../util/formato';

/** Tela 5: registros enviados pela pessoa e rascunhos guardados neste aparelho. */
export function MeusRegistros() {
  const s = useSessao();
  const dono = useDono();
  const rascunhos = useRascunhosLocais(dono);
  const lista = useApi<OcorrenciaResumo[]>(rotas.ocorrencias, [s.rede?.id, s.escola?.id]);
  const categorias = useApi<Categoria[]>(rotas.categorias, [s.rede?.id]);
  const nomeCategoria = (id: string) =>
    (categorias.estado.tipo === 'ok' && categorias.estado.dados.find((c) => c.id === id)?.nome) || 'Tipo não escolhido';

  return (
    <div className="pagina">
      <div className="pagina-cabeca">
        <h1>Meus registros</h1>
        <p>Ocorrências que você enviou{s.escola ? ` na ${s.escola.sigla ?? s.escola.nome}` : ''} e rascunhos ainda não enviados.</p>
      </div>

      <div><Link className="btn btn-primario" to="/registrar">Registrar ocorrência</Link></div>

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
            return meus.length === 0 ? (
              <Vazio titulo="Você ainda não enviou registros nesta escola" acao={<Link className="btn btn-secundario" to="/registrar">Registrar ocorrência</Link>}>
                Depois de enviado, o registro aparece aqui com o número de protocolo e a situação atual.
              </Vazio>
            ) : (
              <Tabela
                legenda="Registros enviados"
                chaveLinha={(o) => o.id}
                linhas={meus}
                colunas={[
                  { chave: 'p', titulo: 'Protocolo', celula: (o) => <Link to={`/casos/${o.id}`}>{o.protocolo}</Link> },
                  { chave: 't', titulo: 'Tipo', celula: (o) => nomeCategoria(o.categoriaId) },
                  { chave: 'd', titulo: 'Enviado em', celula: (o) => dataHoraCurta(o.abertaEm) },
                  { chave: 's', titulo: 'Situação', celula: (o) => <EtiquetaStatus status={o.status} /> },
                ]}
              />
            );
          }}
        </EstadoDaCarga>
      </section>
    </div>
  );
}
