import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ErroDaApi, FalhaDeRede } from '../api/client';
import { rotas, type ConvitePublico, type Usuario } from '../api/contract';
import { Botao, CampoTexto } from '../components/controles';
import { Aviso, EstadoDaCarga } from '../components/feedback';
import { ControlesDeAcessibilidade } from '../layout/MenuAparencia';
import { nomePerfil } from '../state/perfis';
import { useSessao } from '../state/sessao';
import { useApi } from '../state/useApi';
import { dataHoraPorExtenso } from '../util/formato';
import { LousaDeAcesso } from './Entrar';

const mensagem = (e: unknown) =>
  e instanceof FalhaDeRede ? 'Sem conexão. Confira a internet e tente de novo.' : e instanceof ErroDaApi ? e.message : 'Não foi possível aceitar o convite.';

/**
 * Página do link do convite. Sem conta para o e-mail: nome e senha criam a conta.
 * Com conta: a pessoa entra com ela e aceita; o convite só acrescenta a escola.
 */
export function AceitarConvite() {
  const { token = '' } = useParams();
  const carga = useApi<ConvitePublico>(rotas.convite(token), [token]);
  return (
    <div className="tela-acesso">
      {carga.estado.tipo === 'ok' ? (
        <LousaDeAcesso>
          <p>{carga.estado.dados.escola} convidou você.</p>
          <p>Para registrar e acompanhar ocorrências como {nomePerfil[carga.estado.dados.perfil].toLowerCase()}.</p>
        </LousaDeAcesso>
      ) : <LousaDeAcesso />}
      <div className="acesso-conteudo">
        <div className="acesso-topo"><ControlesDeAcessibilidade /></div>
        <main id="conteudo" className="acesso-coluna">
          <EstadoDaCarga estado={carga.estado} tentarDeNovo={carga.tentarDeNovo} rotulo="Carregando o convite">
            {(c) => <Convite c={c} token={token} />}
          </EstadoDaCarga>
        </main>
      </div>
    </div>
  );
}

function Convite({ c, token }: { c: ConvitePublico; token: string }) {
  const s = useSessao();
  const navegar = useNavigate();
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [erros, setErros] = useState<{ nome?: string; senha?: string; envio?: string }>({});
  const [enviando, setEnviando] = useState(false);
  const [contaCriada, setContaCriada] = useState(false);

  if (c.situacao !== 'pendente') {
    const texto = {
      aceito: 'Este convite já foi aceito. Entre com o seu e-mail e senha.',
      cancelado: 'Este convite foi cancelado ou recusado. Fale com a direção da escola.',
      vencido: 'Este convite venceu. Peça um link novo à direção da escola.',
    }[c.situacao];
    return (
      <div className="pagina">
        <Aviso tipo="atencao" titulo="Este convite não vale mais">{texto}</Aviso>
        <div><Link className="btn btn-secundario" to="/entrar">Ir para entrar</Link></div>
      </div>
    );
  }

  if (contaCriada) {
    return (
      <div className="pagina" role="status">
        <div className="pagina-cabeca">
          <h1>Conta criada</h1>
          <p>Entre com {c.email} e a senha que você criou.</p>
        </div>
        <div><Link className="btn btn-primario" to="/entrar?modo=senha">Entrar</Link></div>
      </div>
    );
  }

  async function aceitar(corpo: object) {
    setEnviando(true);
    try {
      const r = await api<{ novaConta: boolean }>(rotas.aceitarConvite(token), { method: 'POST', body: JSON.stringify(corpo) });
      if (r.novaConta) return setContaCriada(true);
      // Conta que já existia: busca de novo os vínculos, agora com a escola nova.
      const { usuario } = await api<{ usuario: Usuario }>(rotas.sessao);
      s.entrarComUsuario(usuario);
      navegar('/', { replace: true });
    } catch (e) {
      setErros({ envio: mensagem(e) });
    } finally {
      setEnviando(false);
    }
  }

  async function criarConta(e: FormEvent) {
    e.preventDefault();
    const novos = {
      nome: nome.trim().length >= 3 ? undefined : 'Informe seu nome completo.',
      senha: senha.length >= 12 ? undefined : 'A senha precisa ter pelo menos 12 caracteres. Uma frase é uma boa senha.',
    };
    setErros(novos);
    if (!novos.nome && !novos.senha) await aceitar({ nome, senha });
  }

  const cabeca = (
    <div className="pagina-cabeca">
      <h1>{c.temConta ? 'Aceitar convite' : 'Criar sua conta'}</h1>
      <p>O convite foi para <strong>{c.email}</strong>. Ele vale até {dataHoraPorExtenso(c.expiraEm)}.</p>
    </div>
  );

  if (c.temConta) {
    return (
      <div className="pagina">
        {cabeca}
        {erros.envio && <Aviso tipo="erro" titulo="O convite não foi aceito">{erros.envio}</Aviso>}
        {s.sessao ? (
          <>
            <p>Você está como <strong>{s.sessao.usuario.nome}</strong>. Ao aceitar, {c.escola} aparece junto das suas outras escolas.</p>
            <div><Botao carregando={enviando} onClick={() => aceitar({})}>Aceitar convite</Botao></div>
          </>
        ) : (
          <>
            <p>Este e-mail já tem conta, por exemplo porque você já usa o sistema em outra escola. Entre com ela e abra este link de novo.</p>
            <div><Link className="btn btn-primario" to="/entrar?modo=senha" state={{ de: `/convite/${token}` }}>Entrar com a minha conta</Link></div>
          </>
        )}
      </div>
    );
  }

  return (
    <form className="pagina" onSubmit={criarConta} noValidate>
      {cabeca}
      {erros.envio && <Aviso tipo="erro" titulo="O convite não foi aceito">{erros.envio}</Aviso>}
      <CampoTexto rotulo="Seu nome completo" autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} erro={erros.nome} />
      <CampoTexto
        rotulo="Crie uma senha" type="password" autoComplete="new-password" ajuda="Pelo menos 12 caracteres. Uma frase fácil de lembrar funciona bem."
        value={senha} onChange={(e) => setSenha(e.target.value)} erro={erros.senha}
      />
      <div><Botao type="submit" carregando={enviando}>Aceitar convite e criar a conta</Botao></div>
    </form>
  );
}
