import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

/* Tela 2: estados do sistema. */

export function SemPermissao() {
  return (
    <div className="pagina pagina-estreita">
      <div className="pagina-cabeca">
        <h1>Esta área não está disponível para o seu perfil</h1>
        <p>O acesso segue a matriz definida pela sua rede. Se você precisa dela para o seu trabalho, peça à direção da escola.</p>
      </div>
      <div><Link className="btn btn-primario" to="/">Voltar ao início</Link></div>
    </div>
  );
}

export function NaoEncontrada() {
  return (
    <div className="pagina pagina-estreita">
      <div className="pagina-cabeca">
        <h1>Página não encontrada</h1>
        <p>O endereço pode ter sido digitado errado ou a página mudou de lugar.</p>
      </div>
      <div><Link className="btn btn-primario" to="/">Ir para o início</Link></div>
    </div>
  );
}

export function ErroGeral({ aoTentar }: { aoTentar?: () => void }) {
  return (
    <div className="pagina pagina-estreita">
      <div className="pagina-cabeca">
        <h1>O sistema encontrou um erro</h1>
        <p>
          A tela não pôde ser exibida. O que já foi enviado continua salvo. Recarregue a página; se o erro continuar,
          avise a equipe técnica da rede.
        </p>
      </div>
      <div className="acoes-linha">
        <button type="button" className="btn btn-primario" onClick={aoTentar ?? (() => location.reload())}>Recarregar a página</button>
        <a className="btn btn-secundario" href="/">Ir para o início</a>
      </div>
    </div>
  );
}

/** Captura erros de renderização para não deixar a tela em branco. */
export class LimiteDeErro extends Component<{ children: ReactNode }, { erro: boolean }> {
  state = { erro: false };
  static getDerivedStateFromError() {
    return { erro: true };
  }
  componentDidCatch(erro: Error, info: ErrorInfo) {
    console.error('[Cuidar e Registrar]', erro, info.componentStack);
  }
  render() {
    return this.state.erro ? <ErroGeral aoTentar={() => this.setState({ erro: false })} /> : this.props.children;
  }
}
