import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, apiReal, ErroDaApi, FalhaDeRede } from '../api/client';
import { rotas, type Usuario } from '../api/contract';
import { Botao, GrupoOpcoes } from '../components/controles';
import { Aviso, Esqueleto } from '../components/feedback';
import { IconeCasa, IconeCarta } from '../components/icones';
import { Marca, Rodape } from '../layout/Estrutura';
import { ControlesDeAcessibilidade } from '../layout/MenuAparencia';
import type { Perfil } from '../api/contract';
import { nomePerfil } from '../state/perfis';
import { useSessao } from '../state/sessao';
import { EntrarComSenha } from './EntrarComSenha';

/**
 * Tela 1: entrar. Com a API simulada, e no servidor real fora de produção, a
 * pessoa escolhe alguém fictício (demonstração). No servidor real, o login é
 * por e-mail e senha; em ambiente de demonstração ele fica em /entrar?modo=senha.
 */
export function Entrar() {
  const s = useSessao();
  const [parametros] = useSearchParams();
  const porSenha = apiReal && (!s.demonstracao || parametros.get('modo') === 'senha');
  return (
    <div className="tela-acesso">
      <LousaDeAcesso />
      <div className="acesso-conteudo">
        <div className="acesso-topo"><ControlesDeAcessibilidade /></div>
        <main id="conteudo" className="acesso-coluna">
          {s.conferindoSessao ? (
            <div className="pagina entrar"><Esqueleto rotulo="Conferindo seu acesso" /></div>
          ) : porSenha ? (
            <EntrarComSenha />
          ) : (
            <EntrarDemonstracao />
          )}
          <div className="acesso-portas">
            <div className="acesso-porta">
              <IconeCarta width={24} height={24} aria-hidden="true" />
              <div>
                <h2>Recebeu um convite?</h2>
                <p>Abra o link que a escola mandou para você. Lá você cria a sua senha. Se você já tem conta, a escola nova aparece junto das outras.</p>
              </div>
            </div>
            <div className="acesso-porta">
              <IconeCasa width={24} height={24} aria-hidden="true" />
              <div>
                <h2>Sua escola ainda não usa?</h2>
                <p>A direção cadastra a escola com o código INEP e depois convida os professores.</p>
                <Link className="btn btn-secundario" to="/cadastrar-escola">Cadastrar minha escola</Link>
              </div>
            </div>
          </div>
          <Rodape />
        </main>
      </div>
    </div>
  );
}

/** Lousa pautada das telas de acesso: o nome do sistema e para que ele serve. */
export function LousaDeAcesso({ children }: { children?: ReactNode }) {
  return (
    <section className="acesso-lousa" aria-label="Sobre o sistema">
      <Marca />
      <div className="acesso-lousa-frase">
        {children ?? (
          <>
            <p>O que acontece na escola, anotado para cuidar de quem estava lá.</p>
            <p>Professores registram em poucos minutos. A coordenação acompanha cada caso até o fim, com a família e a rede de apoio.</p>
          </>
        )}
      </div>
      <p className="acesso-lousa-nota">Protótipo acadêmico (TCC). Sem vínculo oficial com a Secretaria da Educação.</p>
    </section>
  );
}

/** Perfis que aparecem logo de cara na demonstração: quem está no dia a dia da escola. */
const principais: Perfil[] = ['professor', 'coordenacao', 'direcao'];

/**
 * Login de demonstração. A rede vem do endereço (subdomínio ou ?rede=) ou é a
 * primeira da lista. Aparecem só três pessoas (professora, coordenação e
 * direção); os outros perfis de teste e a troca de rede ficam recolhidos.
 */
function EntrarDemonstracao() {
  const s = useSessao();
  const navegar = useNavigate();
  const [redeId, setRedeId] = useState<string | null>(null);
  // A lista guarda a rede a que pertence: ao trocar de rede, a lista antiga nunca é exibida.
  const [carga, setCarga] = useState<{ redeId: string; lista: Usuario[] } | null>(null);
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [erros, setErros] = useState<{ rede?: string; usuario?: string; envio?: string }>({});
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!redeId && (s.redeDoEndereco || s.redes[0])) setRedeId((s.redeDoEndereco ?? s.redes[0]).id);
  }, [s.redeDoEndereco, s.redes, redeId]);

  const { definirRedePrevia } = s;
  useEffect(() => {
    definirRedePrevia(redeId);
  }, [redeId, definirRedePrevia]);

  useEffect(() => {
    if (!redeId) return;
    setUsuarioId(null);
    api<Usuario[]>(rotas.usuariosDemo(redeId))
      .then((lista) => setCarga({ redeId, lista }))
      .catch(() => setCarga({ redeId, lista: [] }));
  }, [redeId]);

  const usuarios = carga?.redeId === redeId ? carga.lista : null;
  const perfilNaRede = (u: Usuario) => u.vinculos.find((x) => x.redeId === redeId)?.perfil;
  const opcao = (u: Usuario) => {
    const perfil = perfilNaRede(u);
    return { valor: u.id, rotulo: perfil ? `${u.nome}, ${nomePerfil[perfil].toLowerCase()}` : u.nome };
  };
  const doDiaADia = (usuarios ?? []).filter((u) => principais.includes(perfilNaRede(u)!));
  const outros = (usuarios ?? []).filter((u) => !principais.includes(perfilNaRede(u)!));
  const escolhidoEmOutros = outros.some((u) => u.id === usuarioId);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const novos = {
      rede: redeId ? undefined : 'Escolha a rede em que você trabalha.',
      usuario: usuarioId ? undefined : 'Escolha quem está entrando.',
    };
    setErros(novos);
    if (novos.rede || novos.usuario) return;
    setEnviando(true);
    try {
      await s.entrar(redeId!, usuarioId!);
      navegar('/', { replace: true });
    } catch (err) {
      setErros({
        envio:
          err instanceof FalhaDeRede
            ? 'Sem conexão com o servidor. Confira a internet e tente de novo.'
            : err instanceof ErroDaApi
              ? err.message
              : 'Não foi possível entrar. Tente de novo.',
      });
    } finally {
      setEnviando(false);
    }
  }

  return (
        <form className="pagina entrar" onSubmit={enviar} noValidate>
          <div className="pagina-cabeca">
            <h1>Entrar</h1>
            <p>Demonstração sem senha: escolha uma pessoa fictícia para ver o sistema como ela veria.</p>
          </div>

          {s.sessaoExpirada && (
            <Aviso tipo="atencao" titulo="Sua sessão expirou">
              Entre de novo para continuar. O que você estava escrevendo ficou salvo como rascunho neste aparelho.
            </Aviso>
          )}
          {erros.envio && <Aviso tipo="erro" titulo="Não foi possível entrar">{erros.envio}</Aviso>}

          {!redeId || usuarios === null ? (
            <Esqueleto rotulo="Carregando pessoas" />
          ) : (
            <>
              <GrupoOpcoes
                rotulo="Quem está entrando?"
                nome="pessoa"
                opcoes={doDiaADia.map(opcao)}
                valor={usuarioId}
                aoMudar={setUsuarioId}
                erro={erros.usuario}
              />
              <details className="entrar-mais" open={escolhidoEmOutros || (s.redes.length > 1 && redeId !== s.redes[0]?.id) || undefined}>
                <summary>Outros perfis e redes de teste</summary>
                <div className="entrar-mais-conteudo">
                  {outros.length > 0 && (
                    <GrupoOpcoes
                      rotulo="Outros perfis"
                      nome="pessoa"
                      opcoes={outros.map(opcao)}
                      valor={usuarioId}
                      aoMudar={setUsuarioId}
                    />
                  )}
                  {s.redes.length > 1 && (
                    <GrupoOpcoes
                      rotulo="Rede de ensino"
                      ajuda="Cada rede tem suas próprias escolas, regras e dados."
                      opcoes={s.redes.map((r) => ({ valor: r.id, rotulo: r.nome }))}
                      valor={redeId}
                      aoMudar={setRedeId}
                      erro={erros.rede}
                    />
                  )}
                </div>
              </details>
            </>
          )}

          <Botao type="submit" carregando={enviando} className="btn-largo">Entrar</Botao>
          {apiReal && (
            <p className="nota-rodape"><Link to="/entrar?modo=senha">Entrar com e-mail e senha</Link></p>
          )}
        </form>
  );
}
