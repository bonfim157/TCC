import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { nomeStatus, type Prioridade, type StatusCaso } from '../api/contract';
import type { EstadoCarga } from '../state/useApi';
import { Botao } from './controles';
import { IconeAtencao, IconeErro, IconeInfo, IconeOk, IconeSemConexao } from './icones';

/* ---------- Aviso ---------- */
type TipoAviso = 'info' | 'atencao' | 'erro' | 'sucesso';
const iconeAviso = { info: IconeInfo, atencao: IconeAtencao, erro: IconeErro, sucesso: IconeOk };

export function Aviso({
  tipo = 'info', titulo, children, acoes, icone,
}: { tipo?: TipoAviso; titulo?: string; children?: ReactNode; acoes?: ReactNode; icone?: ReactNode }) {
  const Icone = iconeAviso[tipo];
  // Erros interrompem o leitor de tela; os demais são anunciados com calma.
  return (
    <div className={`aviso aviso-${tipo}`} role={tipo === 'erro' ? 'alert' : 'status'}>
      <span className="aviso-icone">{icone ?? <Icone />}</span>
      <div>
        {titulo && <h4>{titulo}</h4>}
        {typeof children === 'string' ? <p>{children}</p> : children}
      </div>
      {acoes && <div className="aviso-acoes">{acoes}</div>}
    </div>
  );
}

/* ---------- Etiqueta de situação ---------- */
type TipoEtiqueta = 'neutra' | 'info' | 'atencao' | 'urgente' | 'ok';
export function Etiqueta({ tipo = 'neutra', children }: { tipo?: TipoEtiqueta; children: ReactNode }) {
  return <span className={`etiqueta etiqueta-${tipo}`}>{children}</span>;
}

const tipoStatus: Record<StatusCaso, TipoEtiqueta> = {
  rascunho: 'neutra', recebido: 'info', em_triagem: 'atencao', em_acompanhamento: 'info',
  encerrado: 'ok', duplicado: 'neutra', cancelado: 'neutra', encaminhado_rede: 'atencao',
};
export const rotuloStatus = Object.fromEntries(
  (Object.keys(nomeStatus) as StatusCaso[]).map((s) => [s, [nomeStatus[s], tipoStatus[s]]]),
) as Record<StatusCaso, [string, TipoEtiqueta]>;
export const EtiquetaStatus = ({ status }: { status: StatusCaso }) => {
  const [texto, tipo] = rotuloStatus[status];
  return <Etiqueta tipo={tipo}>{texto}</Etiqueta>;
};

export const rotuloPrioridade: Record<Prioridade, [string, TipoEtiqueta]> = {
  urgente: ['Urgente', 'urgente'],
  alta: ['Prioridade alta', 'atencao'],
  media: ['Prioridade média', 'neutra'],
  baixa: ['Prioridade baixa', 'neutra'],
};
export const EtiquetaPrioridade = ({ prioridade }: { prioridade: Prioridade }) => {
  const [texto, tipo] = rotuloPrioridade[prioridade];
  return <Etiqueta tipo={tipo}>{texto}</Etiqueta>;
};

/* ---------- Estado vazio ---------- */
export function Vazio({ titulo, children, acao }: { titulo: string; children?: ReactNode; acao?: ReactNode }) {
  return (
    <div className="vazio">
      <h3>{titulo}</h3>
      {typeof children === 'string' ? <p>{children}</p> : children}
      {acao}
    </div>
  );
}

/* ---------- Carregando ---------- */
export function Esqueleto({ rotulo = 'Carregando' }: { rotulo?: string }) {
  return (
    <div className="esqueleto" role="status" aria-live="polite">
      <span className="visualmente-oculto">{rotulo}…</span>
      <span aria-hidden="true" />
      <span aria-hidden="true" />
      <span aria-hidden="true" />
    </div>
  );
}

/* ---------- Os quatro estados de uma carga ---------- */
export function EstadoDaCarga<T>({
  estado, tentarDeNovo, children, rotulo,
}: { estado: EstadoCarga<T>; tentarDeNovo: () => void; children: (dados: T) => ReactNode; rotulo?: string }) {
  if (estado.tipo === 'carregando') return <Esqueleto rotulo={rotulo} />;
  if (estado.tipo === 'sem-conexao')
    return (
      <Aviso
        tipo="atencao"
        titulo="Sem conexão com o servidor"
        icone={<IconeSemConexao />}
        acoes={<Botao variante="secundario" onClick={tentarDeNovo}>Tentar de novo</Botao>}
      >
        Confira a internet da escola. O que você digitou continua salvo neste aparelho.
      </Aviso>
    );
  if (estado.tipo === 'erro')
    return (
      <Aviso
        tipo="erro"
        titulo={estado.status === 403 ? 'Acesso não permitido' : 'Não foi possível carregar'}
        acoes={estado.status === 403 ? undefined : <Botao variante="secundario" onClick={tentarDeNovo}>Tentar de novo</Botao>}
      >
        {estado.mensagem}
      </Aviso>
    );
  return <>{children(estado.dados)}</>;
}

/* ---------- Notificações ---------- */
type Nota = { id: number; texto: string };
const NotasCtx = createContext<(texto: string) => void>(() => {});

export function NotificacoesProvider({ children }: { children: ReactNode }) {
  const [notas, setNotas] = useState<Nota[]>([]);
  const fechar = (id: number) => setNotas((n) => n.filter((x) => x.id !== id));
  const notificar = useCallback((texto: string) => {
    const id = Date.now() + Math.random();
    setNotas((n) => [...n, { id, texto }]);
    setTimeout(() => fechar(id), 6000);
  }, []);
  return (
    <NotasCtx.Provider value={notificar}>
      {children}
      <div className="notificacoes" aria-live="polite" role="status">
        {notas.map((n) => (
          <div className="notificacao" key={n.id}>
            <span>{n.texto}</span>
            <button type="button" onClick={() => fechar(n.id)}>Fechar</button>
          </div>
        ))}
      </div>
    </NotasCtx.Provider>
  );
}

export const useNotificar = () => useContext(NotasCtx);
