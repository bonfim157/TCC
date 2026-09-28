import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ErroDaApi, FalhaDeRede } from '../api/client';
import { rotas, type Usuario } from '../api/contract';
import { Botao, GrupoOpcoes } from '../components/controles';
import { Aviso, Esqueleto } from '../components/feedback';
import { Timbre } from '../layout/Estrutura';
import { MenuAparencia } from '../layout/MenuAparencia';
import { nomePerfil } from '../state/perfis';
import { useSessao } from '../state/sessao';

/**
 * Tela 1: login simulado. A rede vem do endereço (subdomínio ou ?rede=)
 * quando possível; senão a pessoa escolhe. O timbre muda com a escolha.
 */
export function Entrar() {
  const s = useSessao();
  const navegar = useNavigate();
  const [redeId, setRedeId] = useState<string | null>(null);
  // A lista guarda a rede a que pertence: ao trocar de rede, a lista antiga nunca é exibida.
  const [carga, setCarga] = useState<{ redeId: string; lista: Usuario[] } | null>(null);
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [erros, setErros] = useState<{ rede?: string; usuario?: string; envio?: string }>({});
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!redeId && s.redeDoEndereco) setRedeId(s.redeDoEndereco.id);
  }, [s.redeDoEndereco, redeId]);

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

  const redeEscolhida = s.redes.find((r) => r.id === redeId);
  const usuarios = carga?.redeId === redeId ? carga.lista : null;

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
    <div className="tela-avulsa">
      <Timbre>
        <MenuAparencia />
      </Timbre>
      <main id="conteudo">
        <form className="pagina entrar" onSubmit={enviar} noValidate>
          <div className="pagina-cabeca">
            <h1>Entrar</h1>
            <p>Registro e acompanhamento de ocorrências escolares.</p>
          </div>

          <Aviso tipo="atencao" titulo="Ambiente de demonstração">
            Não há senha. Escolha uma rede e uma pessoa fictícia para ver o sistema como ela veria. Na versão real, o
            acesso será pela conta institucional da rede.
          </Aviso>

          {erros.envio && <Aviso tipo="erro" titulo="Não foi possível entrar">{erros.envio}</Aviso>}

          {s.redes.length === 0 ? (
            <Esqueleto rotulo="Carregando redes" />
          ) : (
            <GrupoOpcoes
              rotulo="Qual é a sua rede de ensino?"
              ajuda={
                s.redeDoEndereco
                  ? `Identificamos a rede pelo endereço que você usou. Troque se estiver errada.`
                  : 'Cada rede tem suas próprias escolas, regras e dados.'
              }
              opcoes={s.redes.map((r) => ({ valor: r.id, rotulo: r.nome }))}
              valor={redeId}
              aoMudar={setRedeId}
              erro={erros.rede}
            />
          )}

          {redeId && (
            usuarios === null ? (
              <Esqueleto rotulo="Carregando pessoas" />
            ) : (
              <GrupoOpcoes
                rotulo="Quem está entrando?"
                ajuda={`Pessoas fictícias com vínculo na ${redeEscolhida?.nome ?? 'rede escolhida'}.`}
                opcoes={usuarios.map((u) => {
                  const v = u.vinculos.find((x) => x.redeId === redeId);
                  return { valor: u.id, rotulo: v ? `${u.nome}, ${nomePerfil[v.perfil].toLowerCase()}` : u.nome };
                })}
                valor={usuarioId}
                aoMudar={setUsuarioId}
                erro={erros.usuario}
              />
            )
          )}

          <div>
            <Botao type="submit" carregando={enviando}>Entrar</Botao>
          </div>
        </form>
      </main>
      <footer className="rodape">Protótipo acadêmico (TCC), sem vínculo oficial com a Secretaria da Educação. Pessoas e casos são fictícios.</footer>
    </div>
  );
}
