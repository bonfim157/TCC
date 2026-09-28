import type { Categoria, DadosDoFato } from '../../api/contract';
import { CampoAreaTexto, CampoTexto, GrupoOpcoes } from '../../components/controles';
import { Aviso } from '../../components/feedback';
import type { RascunhoRegistro } from '../../state/rascunhosLocais';
import { hojeISO } from '../../util/formato';
import type { Erros } from './Registrar';

const locais = ['Sala de aula', 'Pátio', 'Quadra', 'Corredor', 'Banheiro', 'Refeitório', 'Entrada ou saída da escola', 'Redes sociais ou mensagens', 'Fora da escola'];

export function validarFato(r: RascunhoRegistro): Erros {
  const f = r.fato;
  const e: Erros = {};
  if (!f.categoriaId) e.categoria = 'Escolha o tipo de ocorrência.';
  if (!f.data) e.data = 'Informe a data do fato.';
  else if (f.data > hojeISO()) e.data = 'A data não pode estar no futuro.';
  if (!f.hora) e.hora = 'Informe o horário aproximado.';
  if (!f.local.trim()) e.local = 'Informe onde aconteceu.';
  if (f.relato.trim().length < 20) e.relato = f.relato.trim() ? 'Conte um pouco mais: o relato precisa ter pelo menos 20 caracteres.' : 'Escreva o relato do que aconteceu.';
  if (!r.risco) e.risco = 'Responda se alguém corre risco agora.';
  return e;
}

const eSensivel = (nome?: string) => !!nome && /prote|vulnerab|discrimina/i.test(nome);

export function PassoFato({ r, categorias, erros, atualizar }: {
  r: RascunhoRegistro;
  categorias: Categoria[];
  erros: Erros;
  atualizar: (m: Partial<RascunhoRegistro>) => void;
}) {
  const f = r.fato;
  const muda = (m: Partial<DadosDoFato>) => atualizar({ fato: { ...f, ...m } });
  const categoria = categorias.find((c) => c.id === f.categoriaId);

  return (
    <div className="pilha-larga">
      <GrupoOpcoes
        id="campo-categoria"
        rotulo="Tipo de ocorrência"
        opcoes={categorias.filter((c) => c.ativa).map((c) => ({ valor: c.id, rotulo: c.nome }))}
        valor={f.categoriaId || null}
        aoMudar={(v) => muda({ categoriaId: v })}
        erro={erros.categoria}
      />

      {eSensivel(categoria?.nome) && (
        <Aviso tipo="info" titulo="Situação de proteção">
          <p>
            Acolha o estudante sem fazer perguntas invasivas e registre só o que viu ou ouviu. Suspeita de violência contra
            criança ou adolescente é comunicada ao Conselho Tutelar pela direção, a partir deste registro (ECA, art. 13).
          </p>
        </Aviso>
      )}

      <div className="grade-2">
        <CampoTexto id="campo-data" rotulo="Data" type="date" max={hojeISO()} value={f.data} onChange={(e) => muda({ data: e.target.value })} erro={erros.data} />
        <CampoTexto id="campo-hora" rotulo="Horário aproximado" type="time" value={f.hora} onChange={(e) => muda({ hora: e.target.value })} erro={erros.hora} />
      </div>

      <CampoTexto
        id="campo-local"
        rotulo="Local"
        ajuda="Escolha uma sugestão ou escreva, por exemplo: sala 12, quadra."
        list="sugestoes-local"
        autoComplete="off"
        value={f.local}
        onChange={(e) => muda({ local: e.target.value })}
        erro={erros.local}
      />
      <datalist id="sugestoes-local">{locais.map((l) => <option key={l} value={l} />)}</datalist>

      <CampoAreaTexto
        id="campo-relato"
        rotulo="Relato do que aconteceu"
        ajuda={
          <>
            Conte o que você viu ou ouviu: o que aconteceu, quem estava e o que foi dito. Descreva o fato, não a pessoa:
            prefira “empurrou o colega” a “é agressivo”.
          </>
        }
        value={f.relato}
        maxLength={2000}
        rows={7}
        onChange={(e) => muda({ relato: e.target.value })}
        erro={erros.relato}
      />

      <CampoAreaTexto
        id="campo-providencia"
        rotulo="O que já foi feito no momento"
        opcional
        ajuda="Por exemplo: separou os estudantes, levou à coordenação, chamou a família."
        value={f.providenciaImediata}
        maxLength={600}
        rows={3}
        onChange={(e) => muda({ providenciaImediata: e.target.value })}
      />

      <div className="bloco-risco">
        <GrupoOpcoes
          id="campo-risco"
          rotulo="Alguém corre risco agora?"
          ajuda="Por exemplo: ferimento, ameaça, estudante que não pode voltar para casa."
          estilo="sim-nao"
          opcoes={[{ valor: 'sim', rotulo: 'Sim' }, { valor: 'nao', rotulo: 'Não' }]}
          valor={r.risco}
          aoMudar={(v) => atualizar({ risco: v as 'sim' | 'nao' })}
          erro={erros.risco}
        />
        {r.risco === 'sim' && (
          <Aviso tipo="erro" titulo="Aja antes de terminar o registro">
            <ul className="lista-compacta">
              <li>Se há perigo agora, ligue <strong>190</strong> (Polícia), <strong>192</strong> (SAMU) ou <strong>193</strong> (Bombeiros).</li>
              <li>Avise a direção pessoalmente, sem esperar o sistema.</li>
              <li>Este registro avisa a direção, mas não substitui esses serviços.</li>
            </ul>
          </Aviso>
        )}
      </div>
    </div>
  );
}
