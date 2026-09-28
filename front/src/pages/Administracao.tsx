import { useEffect, useState } from 'react';
import { api, ErroDaApi, FalhaDeRede } from '../api/client';
import {
  rotas, type AcaoAuditada, type Categoria, type ContatosLocais, type ModeloDeComunicacao, type Perfil, type Pessoa,
  type RegistroDeAuditoria, type RegraDoProtocolo, type TipoPessoa, type UsuarioDaRede,
} from '../api/contract';
import { Botao, CaixaMarcar, CampoAreaTexto, CampoSelecao, CampoTexto } from '../components/controles';
import { Abas, DialogoFormulario, Painel, Tabela } from '../components/estrutura';
import { Aviso, Etiqueta, EstadoDaCarga, useNotificar } from '../components/feedback';
import { acesso, navegacao, nomePerfil } from '../state/perfis';
import { useSessao } from '../state/sessao';
import { useApi } from '../state/useApi';
import { dataHoraCurta } from '../util/formato';
import { nomeTipoPessoa } from './registrar/PassoEnvolvidos';

/** Envia uma alteração e devolve a mensagem de erro, se houver. */
async function salvar(caminho: string, metodo: 'PUT' | 'POST', corpo: unknown): Promise<string | null> {
  try {
    await api(caminho, { method: metodo, body: JSON.stringify(corpo) });
    return null;
  } catch (e) {
    return e instanceof FalhaDeRede ? 'Sem conexão. Nada foi salvo.' : e instanceof ErroDaApi ? e.message : 'Não foi possível salvar.';
  }
}

function AvisoSomenteLeitura({ quem }: { quem: string }) {
  return <Aviso tipo="info">Você pode consultar. Só {quem} altera esta parte.</Aviso>;
}

/* ---------- Nível da rede ---------- */
function Protocolo({ edita }: { edita: boolean }) {
  const s = useSessao();
  const notificar = useNotificar();
  const [versao, setVersao] = useState(0);
  const regras = useApi<RegraDoProtocolo[]>(rotas.admin.regras, [s.rede?.id, versao], { manterAoAtualizar: true });
  const categorias = useApi<Categoria[]>(rotas.categorias, [s.rede?.id]);
  const [editando, setEditando] = useState<RegraDoProtocolo | null>(null);
  const [form, setForm] = useState({ descricao: '', base: '' });
  const [erro, setErro] = useState<string | null>(null);
  const cats = categorias.estado.tipo === 'ok' ? categorias.estado.dados : [];

  const alterar = async (r: RegraDoProtocolo, mudanca: Partial<RegraDoProtocolo>) => {
    const e = await salvar(rotas.admin.regra(r.id), 'PUT', mudanca);
    if (e) return e;
    setVersao((v) => v + 1);
    notificar('Protocolo atualizado. Vale para novos casos em todas as escolas da rede.');
    return null;
  };

  return (
    <div className="pilha">
      <p>
        Providências que o sistema sugere para cada tipo de caso, em todas as escolas da rede. Casos já abertos mantêm as
        providências que tinham. Proposta inicial baseada na legislação; precisa de validação da rede e do jurídico.
      </p>
      {!edita && <AvisoSomenteLeitura quem="a secretaria da rede" />}
      <EstadoDaCarga estado={regras.estado} tentarDeNovo={regras.tentarDeNovo} rotulo="Carregando protocolo">
        {(lista) => (
          <Tabela
            legenda="Regras do protocolo da rede"
            chaveLinha={(r) => r.id}
            linhas={lista}
            colunas={[
              { chave: 'd', titulo: 'Providência', celula: (r) => <><strong>{r.descricao}</strong><br /><small>{r.base}</small></> },
              {
                chave: 'q', titulo: 'Quando',
                celula: (r) => (r.categoriaIds === 'todas' ? 'Todos os tipos' : r.categoriaIds.map((id) => cats.find((c) => c.id === id)?.nome ?? id).join(', ')) + (r.somenteComRisco ? ', com risco imediato' : ''),
              },
              {
                chave: 'o', titulo: 'Obrigatória',
                celula: (r) => edita ? (
                  <CaixaMarcar rotulo={r.obrigatoria ? 'Sim' : 'Não'} checked={r.obrigatoria} onChange={(e) => alterar(r, { obrigatoria: e.target.checked })} aria-label={`Obrigatória: ${r.descricao}`} />
                ) : r.obrigatoria ? 'Sim' : 'Não',
              },
              ...(edita ? [{
                chave: 'a', titulo: 'Ação',
                celula: (r: RegraDoProtocolo) => <Botao variante="texto" onClick={() => { setErro(null); setForm({ descricao: r.descricao, base: r.base }); setEditando(r); }}>Editar<span className="visualmente-oculto"> {r.descricao}</span></Botao>,
              }] : []),
            ]}
          />
        )}
      </EstadoDaCarga>
      <DialogoFormulario
        aberto={!!editando}
        titulo="Editar providência"
        enviar="Salvar"
        erro={erro}
        aoCancelar={() => setEditando(null)}
        aoEnviar={async () => {
          if (!editando) return;
          const e = await alterar(editando, form);
          if (e) setErro(e);
          else setEditando(null);
        }}
      >
        <CampoAreaTexto rotulo="Descrição" rows={3} value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} />
        <CampoTexto rotulo="Base legal ou normativa" value={form.base} onChange={(e) => setForm((f) => ({ ...f, base: e.target.value }))} />
      </DialogoFormulario>
    </div>
  );
}

function Tipos({ edita }: { edita: boolean }) {
  const s = useSessao();
  const notificar = useNotificar();
  const [versao, setVersao] = useState(0);
  const categorias = useApi<Categoria[]>(rotas.categorias, [s.rede?.id, versao], { manterAoAtualizar: true });
  const [erro, setErro] = useState<string | null>(null);
  return (
    <div className="pilha">
      <p>Tipos que aparecem no registro. Desativar um tipo tira ele de novos registros; os casos antigos continuam com ele.</p>
      {!edita && <AvisoSomenteLeitura quem="a secretaria da rede" />}
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <EstadoDaCarga estado={categorias.estado} tentarDeNovo={categorias.tentarDeNovo} rotulo="Carregando tipos">
        {(lista) => (
          <ul className="lista-simples">
            {lista.map((c) => (
              <li key={c.id}>
                {edita ? (
                  <CaixaMarcar
                    rotulo={c.nome}
                    ajuda={c.ativa ? 'Ativo' : 'Desativado'}
                    checked={c.ativa}
                    onChange={async (e) => {
                      const r = await salvar(rotas.admin.categoria(c.id), 'PUT', { ativa: e.target.checked });
                      setErro(r);
                      if (!r) { setVersao((v) => v + 1); notificar(`${c.nome}: ${e.target.checked ? 'ativado' : 'desativado'}.`); }
                    }}
                  />
                ) : (
                  <p>{c.nome} <Etiqueta tipo={c.ativa ? 'ok' : 'neutra'}>{c.ativa ? 'Ativo' : 'Desativado'}</Etiqueta></p>
                )}
              </li>
            ))}
          </ul>
        )}
      </EstadoDaCarga>
    </div>
  );
}

function Modelos({ edita }: { edita: boolean }) {
  const s = useSessao();
  const notificar = useNotificar();
  const [versao, setVersao] = useState(0);
  const modelos = useApi<ModeloDeComunicacao[]>(rotas.modelos, [s.rede?.id, versao], { manterAoAtualizar: true });
  const [editando, setEditando] = useState<ModeloDeComunicacao | null>(null);
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  return (
    <div className="pilha">
      <p>Textos aprovados pela rede para comunicar famílias e o Conselho Tutelar. Campos entre chaves são preenchidos pelo sistema: {'{estudante}'}, {'{escola}'}, {'{data}'}, {'{protocolo}'}, {'{resumo}'}, {'{responsavel}'}.</p>
      {!edita && <AvisoSomenteLeitura quem="a secretaria da rede" />}
      <EstadoDaCarga estado={modelos.estado} tentarDeNovo={modelos.tentarDeNovo} rotulo="Carregando modelos">
        {(lista) => (
          <div className="grade-2">
            {lista.map((m) => (
              <Painel key={m.id} titulo={m.nome} acao={edita ? <Botao variante="texto" onClick={() => { setErro(null); setTexto(m.texto); setEditando(m); }}>Editar<span className="visualmente-oculto"> {m.nome}</span></Botao> : undefined}>
                <p className="texto-relato modelo-texto">{m.texto}</p>
              </Painel>
            ))}
          </div>
        )}
      </EstadoDaCarga>
      <DialogoFormulario
        aberto={!!editando}
        largo
        titulo={`Editar: ${editando?.nome ?? ''}`}
        enviar="Salvar modelo"
        erro={erro}
        aoCancelar={() => setEditando(null)}
        aoEnviar={async () => {
          if (!editando) return;
          const e = await salvar(rotas.admin.modelo(editando.id), 'PUT', { texto });
          if (e) return setErro(e);
          setEditando(null);
          setVersao((v) => v + 1);
          notificar('Modelo salvo.');
        }}
      >
        <CampoAreaTexto rotulo="Texto do modelo" rows={14} value={texto} onChange={(e) => setTexto(e.target.value)} />
      </DialogoFormulario>
    </div>
  );
}

/* ---------- Nível da escola ---------- */
function Contatos({ edita }: { edita: boolean }) {
  const s = useSessao();
  const notificar = useNotificar();
  const carga = useApi<ContatosLocais>(rotas.admin.contatos, [s.escola?.id]);
  const [form, setForm] = useState<ContatosLocais | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => { if (carga.estado.tipo === 'ok') setForm(carga.estado.dados); }, [carga.estado]);
  const campos: [keyof ContatosLocais, string][] = [
    ['conselhoTutelar', 'Conselho Tutelar'], ['cras', 'CRAS'], ['creas', 'CREAS'], ['delegacia', 'Delegacia'], ['saude', 'Serviço de saúde de referência'],
  ];
  return (
    <div className="pilha">
      <p>Unidades da rede de proteção que atendem {s.escola?.nome}. Aparecem já preenchidas nos encaminhamentos e ofícios.</p>
      {!edita && <AvisoSomenteLeitura quem="a direção da escola" />}
      <EstadoDaCarga estado={carga.estado} tentarDeNovo={carga.tentarDeNovo} rotulo="Carregando contatos">
        {() => form && (
          <form className="pilha" onSubmit={async (e) => {
            e.preventDefault();
            const r = await salvar(rotas.admin.contatos, 'PUT', form);
            setErro(r);
            if (!r) notificar('Contatos da escola salvos.');
          }}>
            <div className="grade-2">
              {campos.map(([k, rotulo]) => (
                <CampoTexto key={k} rotulo={rotulo} value={form[k]} disabled={!edita} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
              ))}
            </div>
            {erro && <Aviso tipo="erro">{erro}</Aviso>}
            {edita && <div><Botao type="submit">Salvar contatos</Botao></div>}
          </form>
        )}
      </EstadoDaCarga>
    </div>
  );
}

function Pessoas({ edita }: { edita: boolean }) {
  const s = useSessao();
  const notificar = useNotificar();
  const [versao, setVersao] = useState(0);
  const lista = useApi<Pessoa[]>(rotas.admin.pessoas, [s.escola?.id, versao], { manterAoAtualizar: true });
  const [nova, setNova] = useState({ nome: '', tipo: 'estudante' as TipoPessoa, turma: '' });
  const [erro, setErro] = useState<string | null>(null);
  return (
    <div className="pilha">
      <p>Estudantes e profissionais que podem ser citados em registros. Na versão real, virão da Secretaria Escolar Digital.</p>
      {edita && (
        <form className="painel filtros-busca" onSubmit={async (e) => {
          e.preventDefault();
          const r = await salvar(rotas.admin.pessoas, 'POST', nova);
          setErro(r);
          if (!r) { setNova({ nome: '', tipo: nova.tipo, turma: '' }); setVersao((v) => v + 1); notificar('Pessoa cadastrada.'); }
        }}>
          <CampoTexto rotulo="Nome" ajuda="Estudantes: nome e inicial do sobrenome." value={nova.nome} onChange={(e) => setNova({ ...nova, nome: e.target.value })} />
          <CampoSelecao rotulo="Tipo" value={nova.tipo} onChange={(e) => setNova({ ...nova, tipo: e.target.value as TipoPessoa })}>
            <option value="estudante">Estudante</option>
            <option value="profissional">Profissional da escola</option>
          </CampoSelecao>
          {nova.tipo === 'estudante' && <CampoTexto rotulo="Turma" value={nova.turma} onChange={(e) => setNova({ ...nova, turma: e.target.value })} />}
          <div className="filtros-acoes"><Botao type="submit" variante="secundario">Cadastrar</Botao></div>
          {erro && <Aviso tipo="erro">{erro}</Aviso>}
        </form>
      )}
      <EstadoDaCarga estado={lista.estado} tentarDeNovo={lista.tentarDeNovo} rotulo="Carregando pessoas">
        {(pessoas) => (
          <Tabela
            legenda="Pessoas da escola"
            chaveLinha={(p) => p.id}
            linhas={pessoas}
            colunas={[
              { chave: 'n', titulo: 'Nome', celula: (p) => p.nome },
              { chave: 't', titulo: 'Tipo', celula: (p) => nomeTipoPessoa[p.tipo] },
              { chave: 'u', titulo: 'Turma', celula: (p) => p.turma ?? '' },
            ]}
          />
        )}
      </EstadoDaCarga>
    </div>
  );
}

function Usuarios() {
  const s = useSessao();
  const lista = useApi<UsuarioDaRede[]>(rotas.admin.usuarios, [s.rede?.id, s.escola?.id]);
  return (
    <div className="pilha">
      <p>Quem tem acesso e com qual perfil. Na versão real, o vínculo vem do cadastro de servidores da rede.</p>
      <EstadoDaCarga estado={lista.estado} tentarDeNovo={lista.tentarDeNovo} rotulo="Carregando usuários">
        {(us) => (
          <Tabela
            legenda="Usuários"
            chaveLinha={(u) => `${u.id}-${u.perfil}`}
            linhas={us}
            colunas={[
              { chave: 'n', titulo: 'Nome', celula: (u) => u.nome },
              { chave: 'p', titulo: 'Perfil', celula: (u) => nomePerfil[u.perfil] },
              { chave: 'e', titulo: 'Escolas', celula: (u) => (u.escolas.length ? u.escolas.join(', ') : 'Toda a rede ou regional') },
            ]}
          />
        )}
      </EstadoDaCarga>
    </div>
  );
}

function Permissoes() {
  const perfis = Object.keys(nomePerfil) as Perfil[];
  const areas = navegacao.filter((n) => n.area !== 'inicio');
  return (
    <div className="pilha">
      <p>Que áreas cada perfil abre. O servidor aplica, além disso, regras por escola, por autor do registro e por visibilidade de cada pessoa citada.</p>
      <Aviso tipo="info">
        Nesta versão a matriz é só para consulta. A edição depende do backend, porque mudar permissões na tela não muda o que o servidor entrega.
      </Aviso>
      <div className="tabela-rolagem" tabIndex={0} role="region" aria-label="Matriz de permissões">
        <table className="tabela matriz">
          <caption className="visualmente-oculto">Matriz de permissões por perfil e área</caption>
          <thead>
            <tr><th scope="col">Perfil</th>{areas.map((a) => <th key={a.area} scope="col">{a.rotulo}</th>)}</tr>
          </thead>
          <tbody>
            {perfis.map((p) => (
              <tr key={p}>
                <th scope="row">{nomePerfil[p]}</th>
                {areas.map((a) => {
                  const pode = acesso[p].includes(a.area);
                  return <td key={a.area} className={pode ? 'matriz-sim' : 'matriz-nao'}>{pode ? 'Sim' : 'Não'}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const nomeAcao: Record<AcaoAuditada, string> = {
  login: 'Entrada', consulta: 'Consulta', criacao: 'Criação', alteracao: 'Alteração', busca: 'Busca',
  exportacao: 'Exportação', administracao: 'Administração', negado: 'Acesso negado',
};

function Auditoria() {
  const s = useSessao();
  const [versao, setVersao] = useState(0);
  const lista = useApi<RegistroDeAuditoria[]>(rotas.auditoria, [s.rede?.id, versao], { manterAoAtualizar: true });
  const [acao, setAcao] = useState('');
  return (
    <div className="pilha">
      <p>Quem fez o quê e quando. O conteúdo dos casos não é copiado para cá. Tentativas de acesso negadas também aparecem.</p>
      <div className="acoes-linha">
        <CampoSelecao rotulo="Tipo de ação" value={acao} onChange={(e) => setAcao(e.target.value)}>
          <option value="">Todas</option>
          {(Object.keys(nomeAcao) as AcaoAuditada[]).map((a) => <option key={a} value={a}>{nomeAcao[a]}</option>)}
        </CampoSelecao>
        <Botao variante="secundario" onClick={() => setVersao((v) => v + 1)}>Atualizar</Botao>
      </div>
      <EstadoDaCarga estado={lista.estado} tentarDeNovo={lista.tentarDeNovo} rotulo="Carregando auditoria">
        {(registros) => {
          const visiveis = registros.filter((r) => !acao || r.acao === acao);
          return visiveis.length === 0 ? <p>Nenhum registro.</p> : (
            <Tabela
              legenda="Registros de auditoria"
              chaveLinha={(r) => r.id}
              linhas={visiveis.slice(0, 100)}
              colunas={[
                { chave: 'q', titulo: 'Quando', celula: (r) => dataHoraCurta(r.em) },
                { chave: 'a', titulo: 'Quem', celula: (r) => <>{r.ator}{r.perfil && <><br /><small>{nomePerfil[r.perfil]}</small></>}</> },
                { chave: 'c', titulo: 'Ação', celula: (r) => r.resultado === 'negado' ? <Etiqueta tipo="urgente">{nomeAcao[r.acao]}</Etiqueta> : nomeAcao[r.acao] },
                { chave: 'r', titulo: 'Recurso', celula: (r) => r.recurso },
                { chave: 'd', titulo: 'Detalhe', celula: (r) => r.detalhe ?? '' },
              ]}
            />
          );
        }}
      </EstadoDaCarga>
    </div>
  );
}

/** Telas 13 a 15: administração em dois níveis, permissões e auditoria. */
export function Administracao() {
  const s = useSessao();
  const rede = s.perfil === 'secretaria' || s.perfil === 'admin_tecnico';
  const escola = s.perfil === 'direcao';
  return (
    <div className="pagina">
      <div className="pagina-cabeca">
        <h1>Administração</h1>
        <p>
          {rede ? `Configuração da ${s.rede?.nome}, válida para todas as escolas.` : `Configuração da ${s.escola?.nome}. O protocolo, os tipos e os modelos vêm da rede.`}
        </p>
      </div>
      <Abas
        rotulo="Áreas da administração"
        abas={[
          { id: 'protocolo', titulo: 'Protocolo da rede', conteudo: <Protocolo edita={rede} /> },
          { id: 'tipos', titulo: 'Tipos de ocorrência', conteudo: <Tipos edita={rede} /> },
          { id: 'modelos', titulo: 'Modelos', conteudo: <Modelos edita={rede} /> },
          { id: 'contatos', titulo: 'Contatos da escola', conteudo: <Contatos edita={escola} /> },
          { id: 'pessoas', titulo: 'Pessoas e turmas', conteudo: <Pessoas edita={escola} /> },
          { id: 'usuarios', titulo: 'Usuários', conteudo: <Usuarios /> },
          { id: 'permissoes', titulo: 'Permissões', conteudo: <Permissoes /> },
          { id: 'auditoria', titulo: 'Auditoria', conteudo: <Auditoria /> },
        ]}
      />
    </div>
  );
}
