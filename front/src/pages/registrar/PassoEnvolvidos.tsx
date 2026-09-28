import { useEffect, useId, useState } from 'react';
import { api, FalhaDeRede } from '../../api/client';
import { rotas, type Anexo, type Envolvimento, type PapelNoFato, type Pessoa, type TipoPessoa, type Visibilidade } from '../../api/contract';
import { Botao, CampoSelecao, CampoTexto } from '../../components/controles';
import { Aviso, Vazio } from '../../components/feedback';
import type { RascunhoRegistro } from '../../state/rascunhosLocais';
import type { Erros } from './Registrar';

export const nomePapel: Record<PapelNoFato, string> = {
  envolvido_direto: 'Envolvido diretamente',
  afetado: 'Pessoa afetada',
  testemunha: 'Testemunha',
};

export const nomeVisibilidade: Record<Visibilidade, string> = {
  equipe_do_caso: 'Todos que acompanham o caso',
  coordenacao_direcao: 'Coordenação, orientação e direção',
  somente_direcao: 'Somente a direção',
};

export const nomeTipoPessoa: Record<TipoPessoa, string> = {
  estudante: 'Estudante',
  profissional: 'Profissional da escola',
  familiar: 'Familiar ou responsável',
  outro: 'Outra pessoa',
};

export function validarEnvolvidos(r: RascunhoRegistro): Erros {
  const e: Erros = {};
  r.anexos.forEach((a, i) => {
    if (!a.justificativa.trim()) e[`anexo-${i}`] = `Explique por que o anexo “${a.nome}” é necessário.`;
  });
  return e;
}

const visibilidadePadrao = (tipo: TipoPessoa): Visibilidade => (tipo === 'profissional' ? 'equipe_do_caso' : 'coordenacao_direcao');

function BuscaPessoas({ jaIncluidos, aoIncluir, online }: { jaIncluidos: string[]; aoIncluir: (p: Pessoa) => void; online: boolean }) {
  const [busca, setBusca] = useState('');
  const [resultado, setResultado] = useState<{ tipo: 'ok'; lista: Pessoa[] } | { tipo: 'sem-conexao' } | null>(null);
  const idLista = useId();

  useEffect(() => {
    if (busca.trim().length < 2) {
      setResultado(null);
      return;
    }
    let vivo = true;
    const t = setTimeout(() => {
      api<Pessoa[]>(rotas.pessoas(busca))
        .then((lista) => vivo && setResultado({ tipo: 'ok', lista }))
        .catch((e) => vivo && e instanceof FalhaDeRede && setResultado({ tipo: 'sem-conexao' }));
    }, 250);
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, [busca]);

  const disponiveis = resultado?.tipo === 'ok' ? resultado.lista.filter((p) => !jaIncluidos.includes(p.id)) : [];

  return (
    <div className="busca-pessoas">
      <CampoTexto
        rotulo="Buscar pessoa da escola"
        ajuda="Digite ao menos duas letras do nome ou a turma, por exemplo: 7º ano."
        type="search"
        opcional
        autoComplete="off"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        aria-controls={idLista}
      />
      <div id={idLista} aria-live="polite">
        {!online && <p className="campo-ajuda">Sem conexão: a busca volta a funcionar quando a internet voltar. Você pode incluir a pessoa pelo nome abaixo.</p>}
        {resultado?.tipo === 'sem-conexao' && online && <p className="campo-ajuda">Não foi possível buscar agora.</p>}
        {resultado?.tipo === 'ok' && (
          disponiveis.length === 0 ? (
            <p className="campo-ajuda">Ninguém encontrado com “{busca}”.</p>
          ) : (
            <ul className="resultados-busca">
              {disponiveis.map((p) => (
                <li key={p.id}>
                  <span>
                    <strong>{p.nome}</strong>
                    <span>{p.turma ? `${nomeTipoPessoa[p.tipo]}, ${p.turma}` : nomeTipoPessoa[p.tipo]}</span>
                  </span>
                  <Botao variante="secundario" onClick={() => { aoIncluir(p); setBusca(''); }}>
                    Incluir<span className="visualmente-oculto"> {p.nome}</span>
                  </Botao>
                </li>
              ))}
            </ul>
          )
        )}
      </div>
    </div>
  );
}

function PessoaAvulsa({ aoIncluir }: { aoIncluir: (nome: string, tipo: TipoPessoa) => void }) {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<TipoPessoa>('familiar');
  const [erro, setErro] = useState('');
  if (!aberto) return <Botao variante="texto" onClick={() => setAberto(true)}>A pessoa não está na lista</Botao>;
  return (
    <div className="painel pessoa-avulsa">
      <div className="pilha">
        <CampoTexto rotulo="Nome ou forma de identificar" ajuda="Use só o necessário, por exemplo: mãe de Gabriel M." value={nome} onChange={(e) => setNome(e.target.value)} erro={erro} />
        <CampoSelecao rotulo="Quem é" value={tipo} onChange={(e) => setTipo(e.target.value as TipoPessoa)}>
          {(Object.keys(nomeTipoPessoa) as TipoPessoa[]).map((t) => <option key={t} value={t}>{nomeTipoPessoa[t]}</option>)}
        </CampoSelecao>
        <div className="acoes-linha">
          <Botao
            variante="secundario"
            onClick={() => {
              if (nome.trim().length < 2) return setErro('Informe como identificar a pessoa.');
              aoIncluir(nome.trim(), tipo);
              setNome('');
              setErro('');
              setAberto(false);
            }}
          >
            Incluir pessoa
          </Botao>
          <Botao variante="texto" onClick={() => setAberto(false)}>Cancelar</Botao>
        </div>
      </div>
    </div>
  );
}

export function PassoEnvolvidos({ r, erros, atualizar, online }: {
  r: RascunhoRegistro;
  erros: Erros;
  atualizar: (m: Partial<RascunhoRegistro>) => void;
  online: boolean;
}) {
  const incluir = (e: Envolvimento) => atualizar({ envolvidos: [...r.envolvidos, e] });
  const alterar = (i: number, m: Partial<Envolvimento>) =>
    atualizar({ envolvidos: r.envolvidos.map((e, j) => (j === i ? { ...e, ...m } : e)) });
  const remover = (i: number) => atualizar({ envolvidos: r.envolvidos.filter((_, j) => j !== i) });

  const incluirArquivos = (arquivos: FileList | null) => {
    if (!arquivos) return;
    const novos: Anexo[] = [...arquivos].map((f) => ({
      id: `a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      nome: f.name,
      tamanhoKb: Math.max(1, Math.round(f.size / 1024)),
      justificativa: '',
    }));
    atualizar({ anexos: [...r.anexos, ...novos] });
  };

  return (
    <div className="pilha-larga">
      <section className="pilha" aria-labelledby="t-pessoas">
        <h2 id="t-pessoas" className="titulo-bloco">Pessoas no registro</h2>
        {r.envolvidos.length === 0 ? (
          <Vazio titulo="Nenhuma pessoa incluída">
            Se ninguém foi identificado, por exemplo num dano sem autor conhecido, você pode continuar sem incluir pessoas.
          </Vazio>
        ) : (
          <ul className="lista-envolvidos">
            {r.envolvidos.map((e, i) => (
              <li key={e.pessoaId} className="painel">
                <div className="envolvido-cabeca">
                  <div>
                    <h3>{e.nome}</h3>
                    <p>{e.turma ? `${nomeTipoPessoa[e.tipo]}, ${e.turma}` : nomeTipoPessoa[e.tipo]}</p>
                  </div>
                  <Botao variante="texto" onClick={() => remover(i)}>
                    Remover<span className="visualmente-oculto"> {e.nome}</span>
                  </Botao>
                </div>
                <div className="grade-2">
                  <CampoSelecao rotulo="Papel no fato" value={e.papel} onChange={(ev) => alterar(i, { papel: ev.target.value as PapelNoFato })}>
                    {(Object.keys(nomePapel) as PapelNoFato[]).map((p) => <option key={p} value={p}>{nomePapel[p]}</option>)}
                  </CampoSelecao>
                  <CampoSelecao rotulo="Quem pode ver esta pessoa" value={e.visibilidade} onChange={(ev) => alterar(i, { visibilidade: ev.target.value as Visibilidade })}>
                    {(Object.keys(nomeVisibilidade) as Visibilidade[]).map((v) => <option key={v} value={v}>{nomeVisibilidade[v]}</option>)}
                  </CampoSelecao>
                </div>
              </li>
            ))}
          </ul>
        )}

        <BuscaPessoas
          online={online}
          jaIncluidos={r.envolvidos.map((e) => e.pessoaId)}
          aoIncluir={(p) =>
            incluir({ pessoaId: p.id, nome: p.nome, tipo: p.tipo, turma: p.turma, papel: 'envolvido_direto', visibilidade: visibilidadePadrao(p.tipo) })
          }
        />
        <PessoaAvulsa
          aoIncluir={(nome, tipo) =>
            incluir({ pessoaId: `livre-${Date.now().toString(36)}`, nome, tipo, papel: 'envolvido_direto', visibilidade: visibilidadePadrao(tipo) })
          }
        />
      </section>

      <section className="pilha" aria-labelledby="t-anexos">
        <h2 id="t-anexos" className="titulo-bloco">Anexos <span className="campo-opcional">(opcional)</span></h2>
        <p className="campo-ajuda">
          Anexe só o indispensável. Fotos de estudantes, laudos e prints de conversa precisam de uma justificativa e ficam
          visíveis apenas para quem conduz o caso.
        </p>
        {r.anexos.map((a, i) => (
          <div key={a.id} className="painel anexo">
            <div className="envolvido-cabeca">
              <div>
                <h3>{a.nome}</h3>
                <p>{a.tamanhoKb} KB</p>
              </div>
              <Botao variante="texto" onClick={() => atualizar({ anexos: r.anexos.filter((x) => x.id !== a.id) })}>
                Remover<span className="visualmente-oculto"> {a.nome}</span>
              </Botao>
            </div>
            <CampoTexto
              id={`campo-anexo-${i}`}
              rotulo="Por que este anexo é necessário?"
              value={a.justificativa}
              onChange={(e) => atualizar({ anexos: r.anexos.map((x) => (x.id === a.id ? { ...x, justificativa: e.target.value } : x)) })}
              erro={erros[`anexo-${i}`]}
            />
          </div>
        ))}
        <label className="btn btn-secundario seletor-arquivo">
          Escolher arquivo
          <input type="file" accept="image/*,application/pdf" multiple onChange={(e) => { incluirArquivos(e.target.files); e.target.value = ''; }} />
        </label>
        {r.anexos.length > 0 && (
          <Aviso tipo="info">Nesta versão de demonstração só o nome do arquivo é guardado. O envio real depende do armazenamento privado do servidor.</Aviso>
        )}
      </section>
    </div>
  );
}
