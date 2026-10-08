import { useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { api, ErroDaApi, FalhaDeRede } from '../api/client';
import { rotas, type CienciaPublica } from '../api/contract';
import { Botao, CampoTexto } from '../components/controles';
import { Aviso, EstadoDaCarga } from '../components/feedback';
import { Rodape, Timbre } from '../layout/Estrutura';
import { ControlesDeAcessibilidade } from '../layout/MenuAparencia';
import { useSessao } from '../state/sessao';
import { useApi } from '../state/useApi';
import { dataHoraPorExtenso } from '../util/formato';

/**
 * Tela 10: ciência do responsável. Página pública, aberta pelo link que a
 * família recebe. Mostra só a própria comunicação, sem login.
 */
export function Ciencia() {
  const { token = '' } = useParams();
  const carga = useApi<CienciaPublica>(rotas.ciencia(token), [token]);
  const { definirRedePrevia } = useSessao();
  const [nome, setNome] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [confirmada, setConfirmada] = useState<{ em: string; nome: string } | null>(null);

  useEffect(() => {
    if (carga.estado.tipo === 'ok') {
      definirRedePrevia(carga.estado.dados.redeId);
      setConfirmada(carga.estado.dados.ciencia);
    }
  }, [carga.estado, definirRedePrevia]);

  async function confirmar(e: FormEvent) {
    e.preventDefault();
    if (nome.trim().length < 3) return setErro('Escreva seu nome para confirmar.');
    setEnviando(true);
    setErro('');
    try {
      await api(rotas.ciencia(token), { method: 'POST', body: JSON.stringify({ nome }) });
      setConfirmada({ em: new Date().toISOString(), nome: nome.trim() });
    } catch (err) {
      setErro(err instanceof FalhaDeRede ? 'Sem conexão. Tente de novo quando a internet voltar.' : err instanceof ErroDaApi ? err.message : 'Não foi possível confirmar.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="tela-avulsa">
      <Timbre esquerda={<ControlesDeAcessibilidade />} />
      <main id="conteudo">
        <div className="pagina ciencia">
          <EstadoDaCarga estado={carga.estado} tentarDeNovo={carga.tentarDeNovo} rotulo="Carregando a comunicação">
            {(c) => (
              <>
                <div className="pagina-cabeca">
                  <h1>Comunicação da escola</h1>
                  <p>{c.escola}</p>
                </div>
                <article className="painel carta">
                  <p className="campo-ajuda">Para: {c.destinatario}. Enviada em {dataHoraPorExtenso(c.enviadaEm)}.</p>
                  <p className="texto-relato">{c.texto}</p>
                </article>
                {confirmada ? (
                  <Aviso tipo="sucesso" titulo="Ciência confirmada">
                    Confirmado por {confirmada.nome} em {dataHoraPorExtenso(confirmada.em)}. A escola foi avisada. Se quiser conversar, procure a coordenação.
                  </Aviso>
                ) : (
                  <form className="pilha" onSubmit={confirmar} noValidate>
                    <CampoTexto rotulo="Seu nome" autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} erro={erro} />
                    <div><Botao type="submit" carregando={enviando}>Confirmo que li esta comunicação</Botao></div>
                    <p className="campo-ajuda">Confirmar a leitura não significa concordar. É só para a escola saber que a mensagem chegou.</p>
                  </form>
                )}
              </>
            )}
          </EstadoDaCarga>
        </div>
      </main>
      <Rodape links={false} />
    </div>
  );
}
