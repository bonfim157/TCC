import { useId, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { IconeAjuda, IconeLupa } from '../components/icones';
import { IlustracaoEscola } from '../components/ilustracoes';

type Duvida = { pergunta: string; resposta: ReactNode; texto: string };

const duvida = (pergunta: string, texto: string, resposta?: ReactNode): Duvida => ({ pergunta, texto, resposta: resposta ?? <p>{texto}</p> });

const duvidas: Duvida[] = [
  duvida(
    'Alguém corre risco agora. Registro primeiro ou ligo primeiro?',
    'Ligue primeiro. Acolha o estudante, chame a direção e acione o 190 (Polícia Militar) ou o 192 (SAMU). O registro vem depois, e nele você informa o que já foi feito no momento.',
  ),
  duvida(
    'Quem vai ver o que eu escrever?',
    'Você, a coordenação, a orientação de convivência e a direção da escola, conforme a matriz de acesso da rede. Pessoas marcadas como “somente a direção” não aparecem para os demais. O registro não é compartilhado com famílias nem com outras escolas.',
  ),
  duvida(
    'Comecei um registro e precisei parar. Perdi o que escrevi?',
    'Não. Tudo o que você escreve fica salvo como rascunho neste aparelho até o envio. Os rascunhos aparecem em “Meus registros” e não são vistos pela escola enquanto não forem enviados.',
  ),
  duvida(
    'Enviei com um erro. Como corrijo?',
    'Abra o caso e use “Acrescentar ou corrigir informação”. A correção entra como um adendo com seu nome e horário, sem apagar o que foi escrito antes. Assim o histórico do caso fica completo.',
  ),
  duvida(
    'Como descrevo o que aconteceu?',
    'Conte o que você viu ou ouviu: o que aconteceu, quem estava e o que foi dito. Descreva o fato, não a pessoa: prefira “empurrou o colega” a “é agressivo”.',
  ),
  duvida(
    'Suspeito de violência contra um estudante. Quem avisa o Conselho Tutelar?',
    'Registre o que viu ou ouviu, sem fazer perguntas invasivas ao estudante. A comunicação ao Conselho Tutelar é feita pela direção a partir do seu registro, como determina o Estatuto da Criança e do Adolescente (art. 13).',
  ),
  duvida(
    'Como acompanho o que aconteceu depois?',
    'Em “Meus registros”, cada ocorrência mostra o número de protocolo e a situação atual: em análise, em acompanhamento ou encerrada. Ao abrir o caso, você vê a linha do tempo do que pode acompanhar.',
  ),
  duvida(
    'A família fica sabendo?',
    'Quando a escola decide comunicar a família, ela recebe uma mensagem com um link para confirmar que leu. Confirmar a leitura não significa concordar; é só para a escola saber que a mensagem chegou.',
  ),
  duvida(
    'O sistema substitui o Conviva SP (Placon)?',
    'Não. A escola continua lançando a ocorrência no Conviva SP. O caso guarda o código do lançamento, para que nada fique de fora.',
  ),
];

/** Dúvidas frequentes, com busca. Pública: serve também para quem ainda não entrou. */
export function Duvidas() {
  const id = useId();
  const [busca, setBusca] = useState('');
  const termo = busca.trim().toLowerCase();
  const visiveis = duvidas.filter((d) => !termo || `${d.pergunta} ${d.texto}`.toLowerCase().includes(termo));

  return (
    <div className="pagina pagina-conteudo">
      <div className="cabeca-centro">
        <h1><IconeAjuda /> Dúvidas frequentes</h1>
        <p>O que mais perguntam sobre registrar e acompanhar ocorrências.</p>
      </div>

      <form className="busca-linha busca-centro" role="search" onSubmit={(e) => e.preventDefault()}>
        <label htmlFor={`${id}-busca`} className="visualmente-oculto">Buscar nas dúvidas</label>
        <span className="busca-icone" aria-hidden="true"><IconeLupa /></span>
        <input id={`${id}-busca`} className="entrada" type="search" placeholder="Digite aqui o que procura" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </form>
      <p className="visualmente-oculto" role="status">{termo ? `${visiveis.length} dúvidas encontradas` : ''}</p>

      {visiveis.length === 0 ? (
        <div className="vazio vazio-centro">
          <IlustracaoEscola largura={160} />
          <h2>Nada encontrado para “{busca}”</h2>
          <p>Tente outra palavra ou veja o <Link to="/guia">guia da interface</Link>.</p>
        </div>
      ) : (
        <div className="sanfona">
          {visiveis.map((d) => (
            <details key={d.pergunta}>
              <summary>{d.pergunta}</summary>
              <div className="sanfona-corpo">{d.resposta}</div>
            </details>
          ))}
        </div>
      )}

      <section className="faixa-duvida" aria-labelledby="t-mais-ajuda">
        <IlustracaoEscola largura={170} />
        <div>
          <h2 id="t-mais-ajuda">Ficou alguma dúvida?</h2>
          <p>Procure a coordenação da sua escola ou veja o passo a passo de cada tela.</p>
          <Link className="link-seta" to="/guia">Abrir o guia da interface</Link>
        </div>
      </section>
    </div>
  );
}
