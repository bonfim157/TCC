import type { Ocorrencia } from '../../api/contract';
import { Botao } from '../../components/controles';
import { Painel } from '../../components/estrutura';
import { Etiqueta } from '../../components/feedback';
import { dataHoraCurta } from '../../util/formato';
import type { Dialogo } from './tipos';

/** Providências sugeridas pelo protocolo da rede, com as ações de cada uma. */
export function Providencias({ o, pedir, pode }: { o: Ocorrencia; pedir: (d: Dialogo) => void; pode: boolean }) {
  const pendentes = o.providencias.filter((p) => p.obrigatoria && p.situacao === 'pendente').length;
  return (
    <Painel titulo="Próximos passos" className="providencias">
      <p className="campo-ajuda">
        Sugeridas pelo protocolo da rede para este tipo de caso. O sistema sugere; quem conduz decide.
        {pendentes > 0 && <strong> {pendentes} {pendentes === 1 ? 'obrigatória pendente' : 'obrigatórias pendentes'}.</strong>}
      </p>
      <ul className="lista-providencias">
        {o.providencias.map((p) => (
          <li key={p.id} className={`providencia providencia-${p.situacao}`}>
            <div className="providencia-texto">
              {/* A situação vem escrita: um quadrado vazio parecia caixa de marcar, mas não era clicável. */}
              <p className="providencia-titulo">
                <strong>{p.descricao}</strong>
                {p.situacao === 'feita' ? <Etiqueta tipo="ok">Cumprida</Etiqueta>
                  : p.situacao === 'dispensada' ? <Etiqueta tipo="neutra">Não se aplica</Etiqueta>
                    : p.obrigatoria ? <Etiqueta tipo="atencao">Pendente</Etiqueta> : <Etiqueta tipo="neutra">Pendente</Etiqueta>}
              </p>
              <p className="providencia-base">
                {p.obrigatoria ? 'Obrigatória' : 'Recomendada'}. {p.base}
              </p>
              {p.situacao !== 'pendente' && (
                <p className="providencia-registro">
                  {p.situacao === 'feita' ? 'Cumprida' : 'Dispensada'} por {p.registradaPor}{p.registradaEm ? `, ${dataHoraCurta(p.registradaEm)}` : ''}.
                  {p.observacao ? ` ${p.observacao}` : ''}
                </p>
              )}
              {pode && (
                <div className="acoes-linha">
                  {p.situacao === 'pendente' ? (
                    <>
                      <Botao variante="secundario" onClick={() => pedir({ tipo: 'providencia', prov: p, acao: 'feita' })}>
                        Marcar como cumprida<span className="visualmente-oculto">: {p.descricao}</span>
                      </Botao>
                      <Botao variante="texto" onClick={() => pedir({ tipo: 'providencia', prov: p, acao: 'dispensada' })}>
                        Não se aplica<span className="visualmente-oculto">: {p.descricao}</span>
                      </Botao>
                    </>
                  ) : (
                    <Botao variante="texto" onClick={() => pedir({ tipo: 'providencia', prov: p, acao: 'pendente' })}>
                      Reabrir<span className="visualmente-oculto">: {p.descricao}</span>
                    </Botao>
                  )}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Painel>
  );
}
