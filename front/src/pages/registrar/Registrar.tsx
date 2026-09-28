import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ErroDaApi, FalhaDeRede } from '../../api/client';
import { rotas, type Categoria, type NovaOcorrencia, type Ocorrencia } from '../../api/contract';
import { Botao } from '../../components/controles';
import { DialogoConfirmacao, Etapas } from '../../components/estrutura';
import { Aviso, EstadoDaCarga } from '../../components/feedback';
import { useConexao } from '../../layout/useConexao';
import {
  apagarRascunho, novoIdRascunho, obterRascunho, salvarRascunho, type RascunhoRegistro,
} from '../../state/rascunhosLocais';
import { useDono } from '../../state/useDono';
import { useSessao } from '../../state/sessao';
import { useApi } from '../../state/useApi';
import { hojeISO } from '../../util/formato';
import { PassoEnvolvidos, validarEnvolvidos } from './PassoEnvolvidos';
import { PassoFato, validarFato } from './PassoFato';
import { PassoRevisao } from './PassoRevisao';
import { Enviado } from './Enviado';

export type Erros = Record<string, string>;

const etapas = ['O fato', 'Envolvidos', 'Revisão'];
const titulos = ['O que aconteceu?', 'Quem esteve envolvido?', 'Revise e envie'];

function novoRascunho(): RascunhoRegistro {
  return {
    id: novoIdRascunho(),
    atualizadoEm: new Date().toISOString(),
    passo: 1,
    fato: { categoriaId: '', data: hojeISO(), hora: '', local: '', relato: '', riscoImediato: false, providenciaImediata: '' },
    risco: null,
    envolvidos: [],
    anexos: [],
  };
}

const temConteudo = (r: RascunhoRegistro) =>
  Boolean(r.fato.categoriaId || r.fato.local.trim() || r.fato.relato.trim() || r.envolvidos.length || r.anexos.length);

/**
 * Tela 4: novo registro em três passos. Cada alteração é salva neste
 * aparelho; o envio só acontece na revisão, com confirmação explícita.
 */
export function Registrar() {
  const { rascunhoId } = useParams();
  const navegar = useNavigate();
  const dono = useDono();
  const s = useSessao();
  const online = useConexao();
  const categorias = useApi<Categoria[]>(rotas.categorias, [s.rede?.id]);

  const [r, setR] = useState<RascunhoRegistro>(() => (dono && rascunhoId && obterRascunho(dono, rascunhoId)) || novoRascunho());
  const [salvoEm, setSalvoEm] = useState<Date | null>(null);
  const [falhaAoSalvar, setFalhaAoSalvar] = useState(false);
  const [erros, setErros] = useState<Erros>({});
  const [confirmado, setConfirmado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<{ tipo: 'erro' | 'atencao'; texto: string } | null>(null);
  const [enviado, setEnviado] = useState<Ocorrencia | null>(null);
  const [descartar, setDescartar] = useState(false);
  const titulo = useRef<HTMLHeadingElement>(null);
  const resumoErros = useRef<HTMLDivElement>(null);
  const primeiraRender = useRef(true);

  // Salva a cada alteração, e fixa o id do rascunho no endereço para sobreviver a um recarregamento.
  useEffect(() => {
    if (!dono || enviado || !temConteudo(r)) return;
    const ok = salvarRascunho(dono, r);
    setFalhaAoSalvar(!ok);
    if (ok) setSalvoEm(new Date());
    if (rascunhoId !== r.id) navegar(`/registrar/${r.id}`, { replace: true });
  }, [r, dono, enviado, rascunhoId, navegar]);

  // A cada troca de passo, o foco vai para o título, e o leitor de tela anuncia onde a pessoa está.
  useEffect(() => {
    if (primeiraRender.current) {
      primeiraRender.current = false;
      return;
    }
    titulo.current?.focus();
  }, [r.passo]);

  if (!dono) {
    return (
      <div className="pagina pagina-estreita">
        <Aviso tipo="atencao" titulo="Escolha uma escola">Para registrar, selecione a escola no alto da página.</Aviso>
      </div>
    );
  }

  if (enviado) {
    return (
      <Enviado
        ocorrencia={enviado}
        aoNovo={() => {
          setEnviado(null);
          setR(novoRascunho());
          setConfirmado(false);
          navegar('/registrar', { replace: true });
        }}
      />
    );
  }

  const atualizar = (mudanca: Partial<RascunhoRegistro>) => setR((atual) => ({ ...atual, ...mudanca }));

  const irPara = (passo: number) => {
    setErros({});
    setErroEnvio(null);
    atualizar({ passo });
  };

  const mostrarErros = (e: Erros) => {
    setErros(e);
    requestAnimationFrame(() => resumoErros.current?.focus());
  };

  const continuar = () => {
    const e = r.passo === 1 ? validarFato(r) : validarEnvolvidos(r);
    if (Object.keys(e).length) return mostrarErros(e);
    irPara(r.passo + 1);
  };

  async function enviar() {
    if (!confirmado) return mostrarErros({ confirmacao: 'Confirme que o relato descreve fatos antes de enviar.' });
    const erroFato = validarFato(r);
    if (Object.keys(erroFato).length) return irPara(1);
    setEnviando(true);
    setErroEnvio(null);
    const corpo: NovaOcorrencia = {
      escolaId: dono!.escolaId,
      fato: { ...r.fato, riscoImediato: r.risco === 'sim' },
      envolvidos: r.envolvidos,
      anexos: r.anexos,
    };
    try {
      const criada = await api<Ocorrencia>(rotas.ocorrencias, { method: 'POST', body: JSON.stringify(corpo) });
      apagarRascunho(dono!, r.id);
      setEnviado(criada);
    } catch (e) {
      setErroEnvio(
        e instanceof FalhaDeRede
          ? { tipo: 'atencao', texto: 'Sem conexão com o servidor. O registro não foi enviado, mas continua salvo neste aparelho. Tente de novo quando a conexão voltar.' }
          : { tipo: 'erro', texto: e instanceof ErroDaApi ? e.message : 'O servidor não conseguiu receber o registro. Ele continua salvo neste aparelho.' },
      );
    } finally {
      setEnviando(false);
    }
  }

  const listaErros = Object.entries(erros);

  return (
    <div className="pagina pagina-estreita registrar">
      <div className="registrar-topo">
        <p className="registrar-escola">Registro em {s.escola?.sigla ?? s.escola?.nome}</p>
        <Etapas etapas={etapas} atual={r.passo} />
      </div>

      <div className="pagina-cabeca">
        <h1 ref={titulo} tabIndex={-1}>{titulos[r.passo - 1]}</h1>
        {r.passo === 1 && <p>Descreva o fato de forma objetiva. Tudo o que você escrever fica salvo neste aparelho até o envio.</p>}
        {r.passo === 2 && <p>Inclua apenas quem é necessário para entender o fato. Cada pessoa tem um nível de visibilidade.</p>}
        {r.passo === 3 && <p>Confira antes de enviar. Depois do envio, correções entram como adendo identificado, sem apagar o que foi escrito.</p>}
      </div>

      {listaErros.length > 0 && (
        <div ref={resumoErros} tabIndex={-1} className="resumo-erros">
          <Aviso tipo="erro" titulo={listaErros.length === 1 ? 'Falta corrigir 1 campo' : `Faltam corrigir ${listaErros.length} campos`}>
            <ul>
              {listaErros.map(([campo, msg]) => (
                <li key={campo}><a href={`#campo-${campo}`}>{msg}</a></li>
              ))}
            </ul>
          </Aviso>
        </div>
      )}

      <EstadoDaCarga estado={categorias.estado} tentarDeNovo={categorias.tentarDeNovo} rotulo="Carregando tipos de ocorrência">
        {(cats) => (
          <>
            {r.passo === 1 && <PassoFato r={r} categorias={cats} erros={erros} atualizar={atualizar} />}
            {r.passo === 2 && <PassoEnvolvidos r={r} erros={erros} atualizar={atualizar} online={online} />}
            {r.passo === 3 && (
              <PassoRevisao
                r={r}
                categorias={cats}
                irPara={irPara}
                confirmado={confirmado}
                setConfirmado={(v) => { setConfirmado(v); if (v) setErros({}); }}
                erroConfirmacao={erros.confirmacao}
              />
            )}
          </>
        )}
      </EstadoDaCarga>

      {erroEnvio && <Aviso tipo={erroEnvio.tipo} titulo="O registro não foi enviado">{erroEnvio.texto}</Aviso>}
      {r.passo === 3 && !online && (
        <Aviso tipo="atencao" titulo="Sem conexão">O envio fica disponível quando a conexão voltar. Seu registro está salvo neste aparelho.</Aviso>
      )}

      <div className="registrar-acoes">
        <div className="acoes-linha">
          {r.passo > 1 && <Botao variante="secundario" onClick={() => irPara(r.passo - 1)}>Voltar</Botao>}
          {r.passo < 3 && <Botao onClick={continuar}>Continuar</Botao>}
          {r.passo === 3 && (
            <Botao onClick={enviar} carregando={enviando} disabled={!online}>
              {r.risco === 'sim' ? 'Enviar e avisar a direção' : 'Enviar para triagem'}
            </Botao>
          )}
        </div>
        <div className="registrar-salvo">
          <p aria-live="polite">
            {falhaAoSalvar
              ? 'Não foi possível salvar neste aparelho. Não feche a página antes de enviar.'
              : salvoEm
                ? `Rascunho salvo às ${salvoEm.getHours()}h${String(salvoEm.getMinutes()).padStart(2, '0')} neste aparelho.`
                : ''}
          </p>
          {temConteudo(r) && <Botao variante="texto" onClick={() => setDescartar(true)}>Descartar rascunho</Botao>}
        </div>
      </div>

      <DialogoConfirmacao
        aberto={descartar}
        titulo="Descartar este rascunho?"
        confirmar="Descartar rascunho"
        cancelar="Manter rascunho"
        perigoso
        aoCancelar={() => setDescartar(false)}
        aoConfirmar={() => {
          apagarRascunho(dono, r.id);
          setDescartar(false);
          setR(novoRascunho());
          setSalvoEm(null);
          navegar('/registrar', { replace: true });
        }}
      >
        O que foi escrito será apagado deste aparelho. Nada foi enviado à escola.
      </DialogoConfirmacao>

      <p className="nota-fase">
        <Link to="/meus-registros">Ver meus registros e rascunhos</Link>
      </p>
    </div>
  );
}
