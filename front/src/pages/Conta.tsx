import { useState, type FormEvent } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { api, apiReal, ErroDaApi, FalhaDeRede } from '../api/client';
import { rotas } from '../api/contract';
import { Botao, CampoTexto } from '../components/controles';
import { Painel } from '../components/estrutura';
import { Aviso, useNotificar } from '../components/feedback';
import { useTrocaDeEscola } from '../layout/BarraDeContexto';
import { iniciais } from '../layout/Estrutura';
import { OpcoesDeAparencia } from '../layout/MenuAparencia';
import { nomePerfil } from '../state/perfis';
import { useSessao } from '../state/sessao';

/**
 * Minha conta: as escolas em que a pessoa atua (e a troca entre elas), senha,
 * segundo fator, aparência, ajuda e sair. Fica sempre no fim do menu.
 */
export function Conta() {
  const s = useSessao();
  const { sair } = useOutletContext<{ sair: () => void }>();
  const { pedir, dialogo } = useTrocaDeEscola();
  const usuario = s.sessao!.usuario;

  // Uma linha por escola: as da rede em uso (já carregadas) e uma por rede das outras.
  const linhas = usuario.vinculos.flatMap((v) => {
    const rede = s.redes.find((r) => r.id === v.redeId);
    if (v.redeId === s.rede?.id && s.escolas.length) {
      return s.escolas.map((e) => ({ chave: e.id, nome: e.nome, lugar: e.municipio, perfil: v.perfil, emUso: e.id === s.escola?.id, trocar: () => pedir({ tipo: 'escola', valor: e.id }) }));
    }
    return [{ chave: v.redeId, nome: rede?.nome ?? v.redeId, lugar: rede?.municipio ?? '', perfil: v.perfil, emUso: v.redeId === s.rede?.id, trocar: () => pedir({ tipo: 'rede', valor: v.redeId }) }];
  });
  const comCodigo = usuario.vinculos.some((v) => v.perfil !== 'professor' && v.perfil !== 'apoio');

  return (
    <div className="pagina pagina-estreita">
      <div className="conta-cabeca">
        <span className="avatar avatar-grande" aria-hidden="true">{iniciais(usuario.nome)}</span>
        <div className="pagina-cabeca">
          <h1>Minha conta</h1>
          <p>{usuario.nome}</p>
        </div>
      </div>

      <Painel titulo="Suas escolas">
        <ul className="lista-linhas">
          {linhas.map((l) => (
            <li key={l.chave}>
              <div>
                <strong>{l.nome}</strong>
                <span>{l.lugar ? `${l.lugar}, ` : ''}como {nomePerfil[l.perfil].toLowerCase()}</span>
              </div>
              {l.emUso ? <span className="em-uso">Em uso agora</span> : <Botao variante="secundario" onClick={l.trocar}>Usar esta escola</Botao>}
            </li>
          ))}
        </ul>
      </Painel>

      <Painel titulo="Segurança">
        <ul className="lista-linhas">
          <li>
            <div>
              <strong>Senha</strong>
              <span>{apiReal && !s.demonstracao ? 'Trocar a senha encerra as outras sessões abertas.' : 'Na demonstração não há senha: a pessoa fictícia entra direto.'}</span>
            </div>
          </li>
          <li>
            <div>
              <strong>Código do celular</strong>
              <span>
                {comCodigo
                  ? 'Ativo. Além da senha, o sistema pede o código do aplicativo autenticador, porque seu perfil vê dados sensíveis.'
                  : 'Professores entram só com a senha. Coordenação e direção também usam o código do celular.'}
              </span>
            </div>
          </li>
        </ul>
        {apiReal && !s.demonstracao && <TrocarSenha />}
      </Painel>

      <Painel titulo="Aparência">
        <div className="pilha"><OpcoesDeAparencia /></div>
      </Painel>

      <Painel titulo="Ajuda">
        <ul className="lista-links">
          <li><Link to="/duvidas">Dúvidas frequentes e telefones de emergência</Link></li>
          <li><Link to="/guia">Como usar o sistema</Link></li>
          <li><Link to="/acessibilidade">Acessibilidade</Link></li>
        </ul>
      </Painel>

      <div className="conta-sair">
        <Botao variante="secundario" className="btn-sair-conta" onClick={sair}>Sair da conta</Botao>
      </div>
      {dialogo}
    </div>
  );
}

function TrocarSenha() {
  const notificar = useNotificar();
  const [aberto, setAberto] = useState(false);
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erros, setErros] = useState<{ nova?: string; confirmacao?: string; envio?: string }>({});
  const [enviando, setEnviando] = useState(false);

  if (!aberto) return <div><Botao variante="secundario" onClick={() => setAberto(true)}>Trocar senha</Botao></div>;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const novos = {
      nova: nova.length >= 12 ? undefined : 'A senha precisa ter pelo menos 12 caracteres. Uma frase é uma boa senha.',
      confirmacao: nova === confirmacao ? undefined : 'As duas senhas não são iguais.',
    };
    setErros(novos);
    if (novos.nova || novos.confirmacao) return;
    setEnviando(true);
    try {
      await api(rotas.senha, { method: 'POST', body: JSON.stringify({ atual, nova }) });
      setAberto(false);
      setAtual(''); setNova(''); setConfirmacao('');
      notificar('Senha trocada.');
    } catch (err) {
      setErros({ envio: err instanceof FalhaDeRede ? 'Sem conexão. Tente de novo.' : err instanceof ErroDaApi ? err.message : 'Não foi possível trocar a senha.' });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className="pilha" onSubmit={enviar} noValidate>
      {erros.envio && <Aviso tipo="erro" titulo="A senha não foi trocada">{erros.envio}</Aviso>}
      <CampoTexto rotulo="Senha atual" type="password" autoComplete="current-password" value={atual} onChange={(e) => setAtual(e.target.value)} />
      <CampoTexto rotulo="Nova senha" type="password" autoComplete="new-password" ajuda="Pelo menos 12 caracteres." value={nova} onChange={(e) => setNova(e.target.value)} erro={erros.nova} />
      <CampoTexto rotulo="Repita a nova senha" type="password" autoComplete="new-password" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} erro={erros.confirmacao} />
      <div className="acoes-linha">
        <Botao type="submit" carregando={enviando}>Trocar senha</Botao>
        <Botao variante="texto" onClick={() => setAberto(false)}>Cancelar</Botao>
      </div>
    </form>
  );
}
