import { useId, useState } from 'react';
import type { Ocorrencia } from '../../api/contract';
import { Botao } from '../../components/controles';
import { Aviso } from '../../components/feedback';
import { dataHoraCurta, diaPorExtenso } from '../../util/formato';
import type { Dialogo } from './tipos';

type Principal = 'triagem' | 'oficio' | 'escuta';

/**
 * Ações do caso, ou o resultado quando ele já foi encerrado.
 * Uma só ação principal, escolhida pela fase do caso: concluir a triagem, depois o
 * ofício ao Conselho Tutelar se ele estiver pendente, depois registrar a escuta.
 * As comunicações ficam juntas em "Comunicar" quando há mais de uma.
 */
export function AcoesDoCaso({ o, encerrado, emTriagem, temCt, ctPendente, podeEncerrar, abrir }: {
  o: Ocorrencia;
  encerrado: boolean;
  emTriagem: boolean;
  temCt: boolean;
  ctPendente: boolean;
  podeEncerrar: boolean;
  abrir: (d: Dialogo) => void;
}) {
  const [comunicarAberto, setComunicarAberto] = useState(false);
  const idComunicar = useId();

  if (encerrado && o.encerramento) {
    return (
      <Aviso tipo="sucesso" titulo={`Encerrado em ${dataHoraCurta(o.encerramento.em)} por ${o.encerramento.por}`}>
        <p>{o.encerramento.justificativa}</p>
        {o.encerramento.reavaliarEm && <p>Reavaliação marcada para {diaPorExtenso(o.encerramento.reavaliarEm)}.</p>}
      </Aviso>
    );
  }

  const principal: Principal = emTriagem ? 'triagem' : temCt && ctPendente ? 'oficio' : 'escuta';
  const oficioNoMenu = temCt && principal !== 'oficio';
  const escolher = (d: Dialogo) => {
    setComunicarAberto(false);
    abrir(d);
  };

  return (
    <div className="acoes-caso">
      <div className="barra-acoes" role="group" aria-label="Ações do caso">
        {principal === 'triagem' && <Botao onClick={() => abrir({ tipo: 'triagem' })}>Ler e assumir</Botao>}
        {principal === 'oficio' && <Botao onClick={() => abrir({ tipo: 'comunicar', para: 'conselho_tutelar' })}>Ofício ao Conselho Tutelar</Botao>}
        <Botao variante={principal === 'escuta' ? 'primario' : 'secundario'} onClick={() => abrir({ tipo: 'registro' })}>Registrar conversa</Botao>
        {oficioNoMenu ? (
          <Botao
            variante="secundario"
            className="btn-menu"
            aria-expanded={comunicarAberto}
            aria-controls={idComunicar}
            onClick={() => setComunicarAberto((a) => !a)}
          >
            Comunicar
          </Botao>
        ) : (
          <Botao variante="secundario" onClick={() => abrir({ tipo: 'comunicar', para: 'familia' })}>Comunicar família</Botao>
        )}
        <Botao variante="secundario" onClick={() => abrir({ tipo: 'encaminhar' })}>Pedir apoio da rede</Botao>
        {/* O plano de apoio depende da triagem: quem conduz e qual a prioridade. */}
        {!emTriagem && <Botao variante="secundario" onClick={() => abrir({ tipo: 'plano' })}>Incluir no plano</Botao>}
        {podeEncerrar && <Botao variante="texto" onClick={() => abrir({ tipo: 'encerrar' })}>Concluir acompanhamento</Botao>}
      </div>
      {oficioNoMenu && comunicarAberto && (
        <div id={idComunicar} className="barra-acoes barra-acoes-sub" role="group" aria-label="Comunicar">
          <Botao variante="secundario" onClick={() => escolher({ tipo: 'comunicar', para: 'familia' })}>Comunicar família</Botao>
          <Botao variante="secundario" onClick={() => escolher({ tipo: 'comunicar', para: 'conselho_tutelar' })}>Ofício ao Conselho Tutelar</Botao>
        </div>
      )}
    </div>
  );
}
