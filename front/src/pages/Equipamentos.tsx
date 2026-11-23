import { useState, type FormEvent } from 'react';
import { api, ErroDaApi, FalhaDeRede } from '../api/client';
import { rotas, type NovoPedidoDeEquipamento, type PedidoDeEquipamento } from '../api/contract';
import { Botao, CampoAreaTexto, CampoTexto } from '../components/controles';
import { Painel } from '../components/estrutura';
import { Aviso, Etiqueta, EstadoDaCarga, Vazio, useNotificar } from '../components/feedback';
import { useConexao } from '../layout/useConexao';
import { useSessao } from '../state/sessao';
import { useApi } from '../state/useApi';
import { dataHoraCurta } from '../util/formato';

/** Quem responde os pedidos: a coordenação e a direção. */
export const respondeEquipamentos = (perfil?: string | null) => perfil === 'coordenacao' || perfil === 'direcao';

function msgErro(e: unknown, padrao: string) {
  if (e instanceof FalhaDeRede) return 'Sem conexão. Tente de novo quando a conexão voltar.';
  if (e instanceof ErroDaApi) return e.message;
  return padrao;
}

/** Pedido novo: o que está com problema, onde e o que aconteceu. */
function FormPedido({ aoEnviar }: { aoEnviar: () => void }) {
  const [valores, setValores] = useState<NovoPedidoDeEquipamento>({ item: '', local: '', descricao: '' });
  const [erros, setErros] = useState<Partial<Record<keyof NovoPedidoDeEquipamento | 'geral', string>>>({});
  const [enviando, setEnviando] = useState(false);
  const online = useConexao();
  const notificar = useNotificar();

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const novos: typeof erros = {};
    if (!valores.item.trim()) novos.item = 'Diga o que está com problema.';
    if (!valores.local.trim()) novos.local = 'Diga onde fica.';
    if (valores.descricao.trim().length < 5) novos.descricao = 'Descreva o que aconteceu, com pelo menos 5 letras.';
    setErros(novos);
    if (Object.keys(novos).length) return;
    setEnviando(true);
    try {
      await api<PedidoDeEquipamento>(rotas.equipamentos, { method: 'POST', body: JSON.stringify(valores) });
      setValores({ item: '', local: '', descricao: '' });
      notificar('Pedido enviado para a direção.');
      aoEnviar();
    } catch (err) {
      setErros({ geral: msgErro(err, 'Não foi possível enviar o pedido. Tente de novo.') });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className="pilha" onSubmit={enviar} noValidate>
      {erros.geral && <Aviso tipo="erro" titulo="Não foi possível enviar">{erros.geral}</Aviso>}
      <CampoTexto
        id="eq-item"
        rotulo="O que está com problema?"
        ajuda="Por exemplo: controle remoto, entrada HDMI, fechadura."
        value={valores.item}
        maxLength={80}
        onChange={(e) => setValores({ ...valores, item: e.target.value })}
        erro={erros.item}
      />
      <CampoTexto
        id="eq-local"
        rotulo="Onde fica?"
        ajuda="Por exemplo: Sala 12, portaria, banheiro do térreo."
        value={valores.local}
        maxLength={120}
        onChange={(e) => setValores({ ...valores, local: e.target.value })}
        erro={erros.local}
      />
      <CampoAreaTexto
        id="eq-descricao"
        rotulo="O que aconteceu?"
        value={valores.descricao}
        maxLength={1000}
        rows={3}
        onChange={(e) => setValores({ ...valores, descricao: e.target.value })}
        erro={erros.descricao}
      />
      <div><Botao type="submit" carregando={enviando} disabled={!online}>Enviar pedido</Botao></div>
    </form>
  );
}

/** Resposta da gestão: uma anotação que o professor vê no próprio pedido. */
function FormResposta({ id, aoEnviar }: { id: string; aoEnviar: () => void }) {
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const online = useConexao();
  const notificar = useNotificar();

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return setErro('Escreva a resposta antes de registrar.');
    setEnviando(true);
    setErro('');
    try {
      await api<PedidoDeEquipamento>(rotas.anotarEquipamento(id), { method: 'POST', body: JSON.stringify({ texto }) });
      setTexto('');
      notificar('Resposta registrada. O professor vê no pedido dele.');
      aoEnviar();
    } catch (err) {
      setErro(msgErro(err, 'Não foi possível registrar a resposta.'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className="pilha" onSubmit={enviar} noValidate>
      <CampoAreaTexto
        id={`resp-${id}`}
        rotulo="Resposta da direção"
        ajuda="Por exemplo: Foi realizado o pedido de um novo controle remoto."
        value={texto}
        maxLength={1000}
        rows={2}
        onChange={(e) => setTexto(e.target.value)}
        erro={erro}
      />
      <div><Botao type="submit" variante="secundario" carregando={enviando} disabled={!online}>Registrar resposta</Botao></div>
    </form>
  );
}

function CartaoDePedido({ pedido, gestao, aoMudar }: { pedido: PedidoDeEquipamento; gestao: boolean; aoMudar: () => void }) {
  const respondido = pedido.anotacoes.length > 0;
  return (
    <li className="pedido">
      <div className="pedido-cabeca">
        <strong>{pedido.item}</strong>
        <Etiqueta tipo={respondido ? 'ok' : 'atencao'}>{respondido ? 'Respondido' : 'Aguardando resposta'}</Etiqueta>
      </div>
      <p className="campo-ajuda">
        {pedido.local}, pedido por {pedido.criadoPorNome} em {dataHoraCurta(pedido.criadoEm)}
      </p>
      <p>{pedido.descricao}</p>
      {respondido && (
        <ul className="respostas" aria-label="Respostas da direção">
          {pedido.anotacoes.map((a) => (
            <li key={a.id}>
              <span className="campo-ajuda">{a.autorNome}, {dataHoraCurta(a.em)}</span>
              <p>{a.texto}</p>
            </li>
          ))}
        </ul>
      )}
      {gestao && <FormResposta id={pedido.id} aoEnviar={aoMudar} />}
    </li>
  );
}

/** Pedidos de equipamento: quem pede vê os seus; a gestão vê os da escola e responde. */
export function Equipamentos() {
  const s = useSessao();
  const gestao = respondeEquipamentos(s.perfil);
  const lista = useApi<PedidoDeEquipamento[]>(rotas.equipamentos, [s.rede?.id, s.escola?.id]);

  return (
    <div className="pagina">
      <div className="pagina-cabeca">
        <h1>Equipamentos</h1>
        <p>
          {gestao
            ? 'Pedidos de conserto e reposição da escola. Responda cada um: o professor vê a resposta no próprio pedido.'
            : 'Avise quando um equipamento ou o espaço apresentar problema. A direção recebe o pedido e responde aqui.'}
        </p>
      </div>

      <Painel titulo="Informar um problema">
        <FormPedido aoEnviar={lista.tentarDeNovo} />
      </Painel>

      <Painel titulo={gestao ? 'Pedidos da escola' : 'Seus pedidos'}>
        <EstadoDaCarga estado={lista.estado} tentarDeNovo={lista.tentarDeNovo} rotulo="Carregando pedidos">
          {(dados) =>
            dados.length === 0 ? (
              <Vazio titulo="Nenhum pedido ainda." />
            ) : (
              <ul className="pedidos">
                {dados.map((p) => (
                  <CartaoDePedido key={p.id} pedido={p} gestao={gestao} aoMudar={lista.tentarDeNovo} />
                ))}
              </ul>
            )
          }
        </EstadoDaCarga>
      </Painel>
    </div>
  );
}
