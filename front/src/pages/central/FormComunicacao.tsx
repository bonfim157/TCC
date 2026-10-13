import { useEffect } from 'react';
import type { ModeloDeComunicacao, Ocorrencia, TipoComunicacao } from '../../api/contract';
import { CampoAreaTexto, CampoSelecao, CampoTexto } from '../../components/controles';
import { Aviso } from '../../components/feedback';
import { diaPorExtenso } from '../../util/formato';

/** Comunicação à família ou ofício, montado a partir do modelo aprovado da rede. */
export function FormComunicacao({ o, para, modelos, escola, autor, valor, setValor }: {
  o: Ocorrencia;
  para: TipoComunicacao;
  modelos: ModeloDeComunicacao[];
  escola: string;
  autor: string;
  valor: { estudanteId: string; destinatario: string; resumo: string; texto: string };
  setValor: (v: { estudanteId: string; destinatario: string; resumo: string; texto: string }) => void;
}) {
  const estudantes = o.envolvidos.filter((e) => e.tipo === 'estudante' && !e.restrito);
  const modelo = modelos.find((m) => m.tipo === para);
  const estudante = estudantes.find((e) => e.pessoaId === valor.estudanteId);

  // Monta o texto a partir do modelo sempre que estudante ou resumo mudam.
  useEffect(() => {
    if (!modelo) return;
    const [a, m, d] = o.fato.data.split('-').map(Number);
    const texto = modelo.texto
      .replaceAll('{estudante}', estudante?.nome ?? '[estudante]')
      .replaceAll('{escola}', escola)
      .replaceAll('{data}', diaPorExtenso(`${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`))
      .replaceAll('{protocolo}', o.protocolo)
      .replaceAll('{resumo}', valor.resumo.trim() || '[resumo do que aconteceu]')
      .replaceAll('{responsavel}', autor);
    if (texto !== valor.texto) setValor({ ...valor, texto });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor.estudanteId, valor.resumo, modelo]);

  const outros = o.envolvidos.filter((e) => e.pessoaId !== valor.estudanteId && !e.restrito && e.tipo === 'estudante');
  const vazados = outros.filter((e) => valor.texto.includes(e.nome));

  return (
    <div className="pilha">
      {!modelo && <Aviso tipo="atencao">A rede ainda não cadastrou um modelo para esta comunicação.</Aviso>}
      <CampoSelecao
        rotulo={para === 'familia' ? 'Família de qual estudante' : 'Estudante a que o ofício se refere'}
        value={valor.estudanteId}
        onChange={(e) => {
          const est = estudantes.find((x) => x.pessoaId === e.target.value);
          setValor({ ...valor, estudanteId: e.target.value, destinatario: para === 'familia' ? `Família de ${est?.nome ?? ''}` : valor.destinatario });
        }}
      >
        <option value="" disabled>Escolha</option>
        {estudantes.map((e) => <option key={e.pessoaId} value={e.pessoaId}>{e.nome}{e.turma ? `, ${e.turma}` : ''}</option>)}
      </CampoSelecao>
      <CampoTexto rotulo="Destinatário" value={valor.destinatario} onChange={(e) => setValor({ ...valor, destinatario: e.target.value })} />
      <CampoAreaTexto
        rotulo="Resumo do que aconteceu"
        ajuda={para === 'familia' ? 'Escreva só o que diz respeito a este estudante. Não cite outros estudantes nem detalhes que a família não precisa saber.' : 'Descreva os fatos observados que motivam a comunicação.'}
        value={valor.resumo}
        rows={3}
        maxLength={800}
        onChange={(e) => setValor({ ...valor, resumo: e.target.value })}
      />
      <CampoAreaTexto
        rotulo={para === 'familia' ? 'Texto que a família vai receber' : 'Texto do ofício'}
        ajuda="Gerado pelo modelo aprovado da rede. Você pode ajustar antes de enviar."
        value={valor.texto}
        rows={10}
        onChange={(e) => setValor({ ...valor, texto: e.target.value })}
      />
      {vazados.length > 0 && (
        <Aviso tipo="erro" titulo="O texto cita outro estudante">
          Retire {vazados.map((v) => v.nome).join(' e ')} antes de enviar. Cada família só recebe o que diz respeito ao próprio filho ou filha.
        </Aviso>
      )}
    </div>
  );
}
