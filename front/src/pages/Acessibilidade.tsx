import { IconeAcessibilidade, IconeLua, IconeOk } from '../components/icones';

const recursos: [string, string][] = [
  ['Tamanho do texto', 'Os botões A+ e A− no topo de todas as telas aumentam e diminuem o texto em três tamanhos. A escolha fica guardada neste aparelho.'],
  ['Claro ou escuro', 'Em “Aparência”, escolha as cores claras, escuras ou iguais às do seu aparelho.'],
  ['Pular para o conteúdo', 'Ao apertar Tab logo depois de abrir uma página, o primeiro link leva direto ao conteúdo, sem passar pelo menu.'],
  ['Teclado', 'Tudo funciona pelo teclado: Tab avança, Shift+Tab volta, Enter e Espaço acionam botões, e as setas trocam de aba. Esc fecha menus e janelas e devolve o foco a quem os abriu.'],
  ['Leitores de tela', 'Campos têm rótulos, erros são anunciados e cada troca de página leva o foco ao conteúdo principal, para quem usa NVDA, JAWS, VoiceOver ou TalkBack.'],
  ['Contraste', 'Todas as cores de texto passam do contraste mínimo da WCAG 2.1, nível AA, nos modos claro e escuro. Isso é conferido automaticamente a cada mudança.'],
  ['Celular', 'As telas funcionam a partir de 360 pixels de largura, mesmo com o texto no tamanho maior, sem rolagem para os lados.'],
];

/** Recursos de acessibilidade, no formato das páginas de portais de serviço público. */
export function Acessibilidade() {
  return (
    <div className="pagina pagina-conteudo">
      <div className="cabeca-centro">
        <h1><IconeAcessibilidade /> Acessibilidade</h1>
        <p>O sistema foi feito para funcionar para todas as pessoas da escola, de qualquer aparelho.</p>
      </div>

      <ul className="lista-recursos">
        {recursos.map(([titulo, texto]) => (
          <li key={titulo}>
            <span className="circulo-icone" aria-hidden="true">{titulo === 'Claro ou escuro' ? <IconeLua /> : <IconeOk />}</span>
            <div>
              <h2>{titulo}</h2>
              <p>{texto}</p>
            </div>
          </li>
        ))}
      </ul>

      <p className="nota-rodape">
        Encontrou uma barreira? Conte à coordenação da sua escola o que tentou fazer e em qual tela. Este é um protótipo
        acadêmico e cada relato ajuda a corrigir.
      </p>
    </div>
  );
}
