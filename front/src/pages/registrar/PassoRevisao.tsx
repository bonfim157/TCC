import { rotas, type Categoria, type OcorrenciaSemelhante } from '../../api/contract';
import { Botao, CaixaMarcar } from '../../components/controles';
import { Aviso } from '../../components/feedback';
import { IconeCadeado } from '../../components/icones';
import type { RascunhoRegistro } from '../../state/rascunhosLocais';
import { useApi } from '../../state/useApi';
import { dataHoraCurta, diaPorExtenso, horaLegivel } from '../../util/formato';
import { nomePapel, nomeVisibilidade } from './PassoEnvolvidos';

function Bloco({ titulo, passo, irPara, children }: { titulo: string; passo: number; irPara: (p: number) => void; children: React.ReactNode }) {
  return (
    <section className="revisao-bloco" aria-labelledby={`rev-${passo}-${titulo}`}>
      <div className="revisao-cabeca">
        <h2 id={`rev-${passo}-${titulo}`} className="titulo-bloco">{titulo}</h2>
        <Botao variante="texto" onClick={() => irPara(passo)}>
          Alterar<span className="visualmente-oculto"> {titulo.toLowerCase()}</span>
        </Botao>
      </div>
      {children}
    </section>
  );
}

export function PassoRevisao({ r, categorias, irPara, confirmado, setConfirmado, erroConfirmacao }: {
  r: RascunhoRegistro;
  categorias: Categoria[];
  irPara: (p: number) => void;
  confirmado: boolean;
  setConfirmado: (v: boolean) => void;
  erroConfirmacao?: string;
}) {
  const f = r.fato;
  const semelhantes = useApi<OcorrenciaSemelhante[]>(rotas.semelhantes({ data: f.data, categoriaId: f.categoriaId }), [f.data, f.categoriaId]);
  const categoria = categorias.find((c) => c.id === f.categoriaId)?.nome ?? 'Não informado';
  const restritos = r.envolvidos.filter((e) => e.visibilidade === 'somente_direcao').length;

  return (
    <div className="pilha-larga">
      {semelhantes.estado.tipo === 'ok' && semelhantes.estado.dados.length > 0 && (
        <Aviso tipo="atencao" titulo="Pode já existir um registro deste fato">
          <p>Na mesma data e com o mesmo tipo, a escola já recebeu:</p>
          <ul className="lista-compacta">
            {semelhantes.estado.dados.map((o) => (
              <li key={o.id}>Protocolo {o.protocolo}, {o.local}, registrado em {dataHoraCurta(o.abertaEm)}</li>
            ))}
          </ul>
          <p>Se for o mesmo acontecimento, fale com a coordenação antes de enviar. Se for outro, pode enviar normalmente.</p>
        </Aviso>
      )}

      <div className="painel revisao">
        <Bloco titulo="O fato" passo={1} irPara={irPara}>
          <dl className="resumo">
            <div><dt>Tipo</dt><dd>{categoria}</dd></div>
            <div><dt>Quando</dt><dd>{f.data ? diaPorExtenso(f.data) : 'Não informado'}{f.hora ? `, ${horaLegivel(f.hora)}` : ''}</dd></div>
            <div><dt>Onde</dt><dd>{f.local || 'Não informado'}</dd></div>
            <div><dt>Relato</dt><dd className="texto-relato">{f.relato || 'Não informado'}</dd></div>
            {f.providenciaImediata && <div><dt>O que já foi feito</dt><dd className="texto-relato">{f.providenciaImediata}</dd></div>}
            <div><dt>Risco agora</dt><dd>{r.risco === 'sim' ? <strong>Sim, a direção será avisada ao enviar</strong> : 'Não'}</dd></div>
          </dl>
        </Bloco>

        <Bloco titulo="Envolvidos e anexos" passo={2} irPara={irPara}>
          {r.envolvidos.length === 0 ? (
            <p>Nenhuma pessoa incluída.</p>
          ) : (
            <ul className="lista-revisao">
              {r.envolvidos.map((e) => (
                <li key={e.pessoaId}>
                  <p><strong>{e.nome}</strong>{e.turma ? `, ${e.turma}` : ''}</p>
                  <span>{nomePapel[e.papel]}. Visível para: {nomeVisibilidade[e.visibilidade].toLowerCase()}.</span>
                </li>
              ))}
            </ul>
          )}
          {r.anexos.length > 0 && (
            <ul className="lista-revisao">
              {r.anexos.map((a) => (
                <li key={a.id}><strong>{a.nome}</strong><span>{a.justificativa}</span></li>
              ))}
            </ul>
          )}
        </Bloco>
      </div>

      <Aviso tipo="info" titulo="Quem verá este registro" icone={<IconeCadeado />}>
        <p>
          Você, a coordenação, a orientação de convivência e a direção da escola, conforme a matriz de acesso da rede.
          {restritos > 0 && ` ${restritos === 1 ? '1 pessoa marcada' : `${restritos} pessoas marcadas`} como “somente a direção” não aparecerá para os demais.`}
          {' '}O registro não é compartilhado com famílias nem com outras escolas.
        </p>
      </Aviso>

      <div id="campo-confirmacao" tabIndex={-1} className={erroConfirmacao ? 'confirmacao com-erro' : 'confirmacao'}>
        <CaixaMarcar
          rotulo="Confirmo que o relato descreve fatos que observei ou que me foram contados, sem julgamentos sobre as pessoas."
          checked={confirmado}
          onChange={(e) => setConfirmado(e.target.checked)}
          aria-invalid={erroConfirmacao ? true : undefined}
        />
        {erroConfirmacao && <p className="campo-erro">{erroConfirmacao}</p>}
      </div>
    </div>
  );
}
