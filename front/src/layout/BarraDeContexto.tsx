import { useId, useState } from 'react';
import type { Perfil } from '../api/contract';
import { DialogoConfirmacao } from '../components/estrutura';
import { nomePerfil } from '../state/perfis';
import { useGuardaDeRascunho } from '../state/rascunhos';
import { useSessao } from '../state/sessao';

type Troca = { tipo: 'rede' | 'escola'; valor: string } | null;

/**
 * Rede e escola ativas, sempre visíveis. Trocar de contexto com um
 * formulário alterado pede confirmação antes.
 */
export function BarraDeContexto() {
  const s = useSessao();
  const { haRascunho } = useGuardaDeRascunho();
  const [pendente, setPendente] = useState<Troca>(null);
  const id = useId();

  if (!s.sessao || !s.rede) return null;

  const redesDoUsuario = s.redes.filter((r) => s.sessao!.usuario.vinculos.some((v) => v.redeId === r.id));
  const aplicar = (t: NonNullable<Troca>) => (t.tipo === 'rede' ? s.trocarRede(t.valor) : s.trocarEscola(t.valor));
  const pedir = (t: NonNullable<Troca>) => (haRascunho ? setPendente(t) : aplicar(t));

  const nomeDestino =
    pendente?.tipo === 'rede'
      ? s.redes.find((r) => r.id === pendente.valor)?.nome
      : s.escolas.find((e) => e.id === pendente?.valor)?.nome;

  return (
    <div className="contexto" role="group" aria-label="Onde você está atuando">
      {redesDoUsuario.length > 1 ? (
        <div className="contexto-item">
          <label htmlFor={`${id}-rede`}>Rede</label>
          <select id={`${id}-rede`} className="entrada" value={s.rede.id} onChange={(e) => pedir({ tipo: 'rede', valor: e.target.value })}>
            {redesDoUsuario.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
          </select>
        </div>
      ) : null}

      {s.escolas.length > 0 && (
        <div className="contexto-item contexto-escola">
          <label htmlFor={`${id}-escola`}>Escola</label>
          {s.escolas.length > 1 ? (
            <select id={`${id}-escola`} className="entrada" value={s.escola?.id ?? ''} onChange={(e) => pedir({ tipo: 'escola', valor: e.target.value })}>
              {s.escolas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          ) : (
            <output id={`${id}-escola`} className="contexto-fixo">{s.escola?.nome}</output>
          )}
        </div>
      )}

      {s.demonstracao && (
      <div className="contexto-item contexto-demo">
        <label htmlFor={`${id}-perfil`}>Ver como (demonstração)</label>
        <select
          id={`${id}-perfil`}
          className="entrada"
          value={s.perfil ?? ''}
          onChange={(e) => s.definirPerfilDemo(e.target.value === s.vinculo?.perfil ? null : (e.target.value as Perfil))}
        >
          {(Object.keys(nomePerfil) as Perfil[]).map((p) => (
            <option key={p} value={p}>{nomePerfil[p]}{p === s.vinculo?.perfil ? ' (perfil real)' : ''}</option>
          ))}
        </select>
      </div>
      )}

      <DialogoConfirmacao
        aberto={pendente !== null}
        titulo={pendente?.tipo === 'rede' ? 'Trocar de rede?' : 'Trocar de escola?'}
        confirmar="Descartar e trocar"
        cancelar="Continuar editando"
        perigoso
        aoCancelar={() => setPendente(null)}
        aoConfirmar={() => {
          if (pendente) aplicar(pendente);
          setPendente(null);
        }}
      >
        <p>
          Há um formulário com alterações não enviadas. Se você for para <strong>{nomeDestino}</strong> agora, essas
          alterações serão descartadas.
        </p>
      </DialogoConfirmacao>
    </div>
  );
}
