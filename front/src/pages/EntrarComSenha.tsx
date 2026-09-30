import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ErroDaApi, FalhaDeRede } from '../api/client';
import { rotas, type RespostaEntrar, type Usuario } from '../api/contract';
import { Botao, CampoTexto } from '../components/controles';
import { Aviso } from '../components/feedback';
import { useSessao } from '../state/sessao';

type Etapa =
  | { nome: 'credenciais' }
  | { nome: 'segundo_fator' }
  | { nome: 'cadastrar_segundo_fator'; segredo: string; uri: string }
  | { nome: 'trocar_senha'; usuario: Usuario };

const mensagemDoErro = (e: unknown) =>
  e instanceof FalhaDeRede
    ? 'Sem conexão com o servidor. Confira a internet e tente de novo.'
    : e instanceof ErroDaApi
      ? e.message
      : 'Não foi possível entrar. Tente de novo.';

/**
 * Login real: e-mail e senha e, para quem é da gestão, o código do aplicativo
 * autenticador. A sessão fica num cookie que a página não lê.
 */
export function EntrarComSenha() {
  const s = useSessao();
  const navegar = useNavigate();
  const [etapa, setEtapa] = useState<Etapa>({ nome: 'credenciais' });
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [codigo, setCodigo] = useState('');
  const [nova, setNova] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erros, setErros] = useState<{ email?: string; senha?: string; codigo?: string; nova?: string; confirmacao?: string; envio?: string }>({});
  const [enviando, setEnviando] = useState(false);
  const titulo = useRef<HTMLHeadingElement>(null);

  // Ao mudar de etapa, o foco vai para o título: quem usa leitor de tela ouve onde está.
  useEffect(() => {
    if (etapa.nome !== 'credenciais') titulo.current?.focus();
  }, [etapa.nome]);

  function concluir(r: RespostaEntrar) {
    if (r.etapa === 'pronto' && r.trocarSenha) {
      setEtapa({ nome: 'trocar_senha', usuario: r.usuario });
    } else if (r.etapa === 'pronto') {
      setSenha('');
      s.entrarComUsuario(r.usuario);
      navegar('/', { replace: true });
    } else if (r.etapa === 'segundo_fator') {
      setEtapa({ nome: 'segundo_fator' });
    } else {
      setEtapa({ nome: 'cadastrar_segundo_fator', segredo: r.segredo, uri: r.uri });
    }
  }

  async function enviarCredenciais(e: FormEvent) {
    e.preventDefault();
    const novos = {
      email: email.trim() ? undefined : 'Informe seu e-mail.',
      senha: senha ? undefined : 'Informe sua senha.',
    };
    setErros(novos);
    if (novos.email || novos.senha) return;
    setEnviando(true);
    try {
      concluir(await api<RespostaEntrar>(rotas.entrar, { method: 'POST', body: JSON.stringify({ email, senha }) }));
    } catch (err) {
      setErros({ envio: mensagemDoErro(err) });
    } finally {
      setEnviando(false);
    }
  }

  async function enviarCodigo(e: FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(codigo.replace(/\s/g, ''))) {
      setErros({ codigo: 'Digite os 6 números que aparecem no aplicativo.' });
      return;
    }
    setErros({});
    setEnviando(true);
    try {
      concluir(await api<RespostaEntrar>(rotas.segundoFator, { method: 'POST', body: JSON.stringify({ codigo }) }));
    } catch (err) {
      // 401 aqui: a sessão da primeira etapa venceu. Volta ao começo.
      if (err instanceof ErroDaApi && err.status === 401) {
        setEtapa({ nome: 'credenciais' });
        setErros({ envio: 'O tempo para informar o código acabou. Entre de novo.' });
      } else {
        setErros({ envio: mensagemDoErro(err) });
      }
      setCodigo('');
    } finally {
      setEnviando(false);
    }
  }

  async function enviarNovaSenha(e: FormEvent) {
    e.preventDefault();
    if (etapa.nome !== 'trocar_senha') return;
    const novos = {
      nova: nova.length >= 12 ? undefined : 'A senha precisa ter pelo menos 12 caracteres. Uma frase é uma boa senha.',
      confirmacao: nova === confirmacao ? undefined : 'As duas senhas não são iguais.',
    };
    setErros(novos);
    if (novos.nova || novos.confirmacao) return;
    setEnviando(true);
    try {
      await api(rotas.senha, { method: 'POST', body: JSON.stringify({ atual: senha, nova }) });
      setSenha('');
      setNova('');
      setConfirmacao('');
      s.entrarComUsuario(etapa.usuario);
      navegar('/', { replace: true });
    } catch (err) {
      setErros({ envio: mensagemDoErro(err) });
    } finally {
      setEnviando(false);
    }
  }

  if (etapa.nome === 'trocar_senha') {
    return (
      <form className="pagina entrar" onSubmit={enviarNovaSenha} noValidate>
        <div className="pagina-cabeca">
          <h1 ref={titulo} tabIndex={-1}>Criar sua senha</h1>
          <p>A senha que você recebeu era provisória. Escolha uma que só você conheça.</p>
        </div>
        {erros.envio && <Aviso tipo="erro" titulo="Não foi possível trocar a senha">{erros.envio}</Aviso>}
        <CampoTexto
          rotulo="Nova senha" type="password" autoComplete="new-password"
          ajuda="Pelo menos 12 caracteres. Uma frase fácil de lembrar é melhor que uma senha curta com símbolos."
          value={nova} onChange={(e) => setNova(e.target.value)} erro={erros.nova}
        />
        <CampoTexto
          rotulo="Repita a nova senha" type="password" autoComplete="new-password"
          value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} erro={erros.confirmacao}
        />
        <div>
          <Botao type="submit" carregando={enviando}>Salvar e entrar</Botao>
        </div>
      </form>
    );
  }

  if (etapa.nome === 'credenciais') {
    return (
      <form className="pagina entrar" onSubmit={enviarCredenciais} noValidate>
        <div className="pagina-cabeca">
          <h1>Entrar</h1>
          <p>Registro e acompanhamento de ocorrências escolares.</p>
        </div>
        {s.sessaoExpirada && (
          <Aviso tipo="atencao" titulo="Sua sessão expirou">
            Entre de novo para continuar. O que você estava escrevendo ficou salvo como rascunho neste aparelho.
          </Aviso>
        )}
        {erros.envio && <Aviso tipo="erro" titulo="Não foi possível entrar">{erros.envio}</Aviso>}
        <CampoTexto
          rotulo="E-mail" type="email" autoComplete="username" inputMode="email" autoCapitalize="none" spellCheck={false}
          value={email} onChange={(e) => setEmail(e.target.value)} erro={erros.email}
        />
        <CampoTexto
          rotulo="Senha" type="password" autoComplete="current-password"
          value={senha} onChange={(e) => setSenha(e.target.value)} erro={erros.senha}
          ajuda="Esqueceu a senha? Procure a direção da escola ou a secretaria da sua rede."
        />
        <div>
          <Botao type="submit" carregando={enviando}>Entrar</Botao>
        </div>
      </form>
    );
  }

  const cadastro = etapa.nome === 'cadastrar_segundo_fator' ? etapa : null;
  return (
    <form className="pagina entrar" onSubmit={enviarCodigo} noValidate>
      <div className="pagina-cabeca">
        <h1 ref={titulo} tabIndex={-1}>{cadastro ? 'Proteger sua conta' : 'Código de verificação'}</h1>
        <p>
          {cadastro
            ? 'Seu perfil acessa dados sensíveis. Além da senha, o sistema pede um código que muda a cada 30 segundos.'
            : 'Abra o aplicativo autenticador no seu celular e digite o código do Cuidar e Registrar.'}
        </p>
      </div>
      {erros.envio && <Aviso tipo="erro" titulo="Não foi possível confirmar">{erros.envio}</Aviso>}

      {cadastro && (
        <ol className="passos-mfa">
          <li>
            Instale no celular um aplicativo autenticador, como Google Authenticator ou Microsoft Authenticator.
          </li>
          <li>
            No aplicativo, adicione uma conta e escolha digitar a chave. Use esta:
            <output className="segredo-mfa" aria-label="Chave para o aplicativo autenticador">
              {cadastro.segredo.match(/.{1,4}/g)?.join(' ')}
            </output>
            <a href={cadastro.uri}>Se estiver no celular, toque aqui para abrir o aplicativo</a>
          </li>
          <li>Digite abaixo o código de 6 números que o aplicativo mostrar.</li>
        </ol>
      )}

      <CampoTexto
        rotulo="Código de 6 números" inputMode="numeric" autoComplete="one-time-code" maxLength={7} className="entrada entrada-codigo"
        value={codigo} onChange={(e) => setCodigo(e.target.value)} erro={erros.codigo}
      />
      <div className="acoes-linha">
        <Botao type="submit" carregando={enviando}>{cadastro ? 'Confirmar e entrar' : 'Entrar'}</Botao>
        <Botao variante="texto" onClick={() => { setEtapa({ nome: 'credenciais' }); setCodigo(''); setSenha(''); setErros({}); }}>Voltar</Botao>
      </div>
    </form>
  );
}
