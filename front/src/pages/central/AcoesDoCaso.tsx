import type { Ocorrencia } from '../../api/contract';
import { Botao } from '../../components/controles';
import { Aviso } from '../../components/feedback';
import { dataHoraCurta, diaPorExtenso } from '../../util/formato';
import type { Dialogo } from './tipos';

/** Ações do caso, ou o resultado quando ele já foi encerrado. */
export function AcoesDoCaso({ o, encerrado, emTriagem, temCt, podeEncerrar, abrir }: {
  o: Ocorrencia;
  encerrado: boolean;
  emTriagem: boolean;
  temCt: boolean;
  podeEncerrar: boolean;
  abrir: (d: Dialogo) => void;
}) {
  return (
    encerrado && o.encerramento ? (
      <Aviso tipo="sucesso" titulo={`Encerrado em ${dataHoraCurta(o.encerramento.em)} por ${o.encerramento.por}`}>
        <p>{o.encerramento.justificativa}</p>
        {o.encerramento.reavaliarEm && <p>Reavaliação marcada para {diaPorExtenso(o.encerramento.reavaliarEm)}.</p>}
      </Aviso>
    ) : (
      <div className="barra-acoes" role="group" aria-label="Ações do caso">
        {emTriagem && <Botao onClick={() => abrir({ tipo: 'triagem' })}>Concluir triagem</Botao>}
        <Botao variante="secundario" onClick={() => abrir({ tipo: 'registro' })}>Registrar escuta</Botao>
        <Botao variante="secundario" onClick={() => abrir({ tipo: 'comunicar', para: 'familia' })}>Comunicar família</Botao>
        {temCt && <Botao variante="secundario" onClick={() => abrir({ tipo: 'comunicar', para: 'conselho_tutelar' })}>Ofício ao Conselho Tutelar</Botao>}
        <Botao variante="secundario" onClick={() => abrir({ tipo: 'encaminhar' })}>Encaminhar</Botao>
        <Botao variante="secundario" onClick={() => abrir({ tipo: 'plano' })}>Incluir no plano</Botao>
        {podeEncerrar && <Botao variante="texto" onClick={() => abrir({ tipo: 'encerrar' })}>Encerrar caso</Botao>}
      </div>
    )
  );
}
