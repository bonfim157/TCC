import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { api, ErroDaApi, FalhaDeRede } from '../api/client';
import { rotas, type Escola, type OcorrenciaResumo } from '../api/contract';
import { Botao, CaixaMarcar, CampoAreaTexto, CampoSelecao, CampoTexto, GrupoOpcoes } from '../components/controles';
import { Abas, Brasao, DialogoConfirmacao, Etapas, Painel, Tabela } from '../components/estrutura';
import { Aviso, Esqueleto, Etiqueta, EtiquetaPrioridade, EtiquetaStatus, EstadoDaCarga, useNotificar, Vazio } from '../components/feedback';
import { contraste } from '../design/contraste';
import { base, redeThemes } from '../design/themes';
import { definirSemConexaoSimulada, semConexaoSimuladaAtiva, useConexao } from '../layout/useConexao';
import { LimiteDeErro } from './Estados';
import { usePreferencias } from '../state/preferencias';
import { useRascunho } from '../state/rascunhos';
import { useSessao } from '../state/sessao';
import { useApi } from '../state/useApi';

/*
 * Guia da interface: o artefato que a gestão aprova ao fim da F1.
 * Tudo aqui usa os componentes reais do sistema, não imagens.
 */

const secoes = [
  ['cores', 'Cores'],
  ['tipografia', 'Tipografia'],
  ['espaco', 'Espaço e forma'],
  ['componentes', 'Componentes'],
  ['rascunho', 'Guarda de rascunho'],
  ['estados', 'Estados do sistema'],
  ['isolamento', 'Isolamento entre redes'],
] as const;

function Secao({ id, titulo, children, intro }: { id: string; titulo: string; intro?: string; children: ReactNode }) {
  return (
    <section className="guia-secao" aria-labelledby={`g-${id}`} id={id}>
      <div className="pagina-cabeca">
        <h2 id={`g-${id}`}>{titulo}</h2>
        {intro && <p>{intro}</p>}
      </div>
      {children}
    </section>
  );
}

function Exemplo({ nome, children, nota }: { nome: string; nota?: string; children: ReactNode }) {
  return (
    <div className="guia-exemplo">
      <div className="guia-exemplo-nome">
        <h3>{nome}</h3>
        {nota && <p>{nota}</p>}
      </div>
      <div className="guia-exemplo-palco">{children}</div>
    </div>
  );
}

/* ---------- Cores ---------- */
function Amostra({ nome, cor, sobre, uso }: { nome: string; cor: string; sobre: string; uso: string }) {
  const r = contraste(cor, sobre);
  return (
    <li className="amostra">
      <span className="amostra-cor" style={{ background: cor }} aria-hidden="true" />
      <span className="amostra-texto">
        <strong>{nome}</strong>
        <span>{uso}</span>
        <span className="amostra-dados">{cor.toUpperCase()}, contraste {r.toFixed(1).replace('.', ',')}:1</span>
      </span>
    </li>
  );
}

function Cores() {
  const { modoEfetivo } = usePreferencias();
  const { rede } = useSessao();
  const b = base[modoEfetivo];
  const p = (redeThemes[rede?.id ?? ''] ?? redeThemes['rede-sp'])[modoEfetivo];
  return (
    <Secao
      id="cores"
      titulo="Cores"
      intro={`A base neutra é a mesma em todas as redes. O acento vem da rede ativa (${rede?.nome}). Contrastes medidos no modo ${modoEfetivo === 'dark' ? 'escuro' : 'claro'}; troque em Aparência para conferir o outro.`}
    >
      <div className="guia-colunas">
        <Painel titulo="Base">
          <ul className="amostras">
            <Amostra nome="Tinta" cor={b.ink} sobre={b.paper} uso="Texto principal, sobre o papel" />
            <Amostra nome="Tinta suave" cor={b.inkSoft} sobre={b.surface} uso="Textos de apoio, sobre a superfície" />
            <Amostra nome="Borda de controle" cor={b.lineStrong} sobre={b.surface} uso="Contorno de campos (mínimo 3:1)" />
            <Amostra nome="Papel" cor={b.paper} sobre={b.ink} uso="Fundo da página" />
          </ul>
        </Painel>
        <Painel titulo="Acento da rede">
          <ul className="amostras">
            <Amostra nome="Acento" cor={p.accent} sobre={p.onAccent} uso="Botão principal, com seu texto" />
            <Amostra nome="Acento como texto" cor={p.accentInk} sobre={b.surface} uso="Links e item ativo" />
            <Amostra nome="Acento suave" cor={p.accentSoft} sobre={b.ink} uso="Fundo de seleção, com tinta por cima" />
          </ul>
        </Painel>
        <Painel titulo="Situações">
          <ul className="amostras">
            <Amostra nome="Urgente" cor={b.urgent} sobre={b.urgentSoft} uso="Risco imediato, erro" />
            <Amostra nome="Atenção" cor={b.warn} sobre={b.warnSoft} uso="Prazo próximo, triagem" />
            <Amostra nome="Concluído" cor={b.ok} sobre={b.okSoft} uso="Encerrado, enviado" />
            <Amostra nome="Neutro" cor={b.neutral} sobre={b.neutralSoft} uso="Rascunho, informativo" />
          </ul>
        </Painel>
      </div>
      <p className="guia-nota">
        Cor nunca aparece sozinha: toda etiqueta tem texto, e urgente também muda o formato do marcador. O script
        <code> npm run contrast </code> confere todos os pares das duas redes nos dois modos.
      </p>
    </Secao>
  );
}

/* ---------- Tipografia e espaço ---------- */
function Tipografia() {
  return (
    <Secao id="tipografia" titulo="Tipografia" intro="Serifada nos títulos, com o tom de documento oficial; sem serifa em toda a interface. O texto-base tem 17px e cresce com a opção de tamanho em Aparência.">
      <Painel>
        <dl className="escala">
          <div><dt>Título de página, Source Serif 4, 36px</dt><dd><span style={{ fontFamily: 'var(--titulo)', fontWeight: 600, fontSize: 'var(--t-h1)' }}>Registro de ocorrência</span></dd></div>
          <div><dt>Título de seção, Source Serif 4, 28px</dt><dd><span style={{ fontFamily: 'var(--titulo)', fontWeight: 600, fontSize: 'var(--t-h2)' }}>Quem esteve envolvido?</span></dd></div>
          <div><dt>Subtítulo, Source Serif 4, 22px</dt><dd><span style={{ fontFamily: 'var(--titulo)', fontWeight: 600, fontSize: 'var(--t-h3)' }}>Plano de apoio</span></dd></div>
          <div><dt>Destaque, Source Sans 3, 20px</dt><dd><span style={{ fontSize: 'var(--t-destaque)' }}>Descreva o fato, não a pessoa.</span></dd></div>
          <div><dt>Corpo, Source Sans 3, 17px</dt><dd>Durante o intervalo, houve discussão entre dois estudantes no pátio; ambos foram separados e acolhidos.</dd></div>
          <div><dt>Apoio, Source Sans 3, 14px</dt><dd><small>Registrado por Coordenação, 25 de setembro, 11h15</small></dd></div>
        </dl>
      </Painel>
    </Secao>
  );
}

function Espaco() {
  return (
    <Secao id="espaco" titulo="Espaço e forma" intro="Espaçamento em múltiplos de 4px. Controles têm pelo menos 48px de altura para facilitar o toque.">
      <div className="guia-colunas">
        <Painel titulo="Espaçamento">
          <ul className="reguas">
            {[4, 8, 12, 16, 24, 32, 48, 64].map((n) => (
              <li key={n}><span style={{ width: n }} aria-hidden="true" />{n}px</li>
            ))}
          </ul>
        </Painel>
        <Painel titulo="Cantos e bordas">
          <ul className="formas">
            <li><span style={{ borderRadius: 'var(--r-controle)' }} aria-hidden="true" />Controles: 6px</li>
            <li><span style={{ borderRadius: 'var(--r-superficie)' }} aria-hidden="true" />Superfícies: 10px</li>
            <li><span style={{ borderRadius: 999 }} aria-hidden="true" />Etiquetas: arredondadas</li>
          </ul>
        </Painel>
      </div>
    </Secao>
  );
}

/* ---------- Componentes ---------- */
function Componentes() {
  const notificar = useNotificar();
  const [texto, setTexto] = useState('Pátio');
  const [relato, setRelato] = useState('Durante o intervalo, houve discussão entre dois estudantes no pátio.');
  const [categoria, setCategoria] = useState<string | null>('conflito');
  const [urgente, setUrgente] = useState<string | null>('nao');
  const [dialogo, setDialogo] = useState(false);
  const [etapa, setEtapa] = useState(2);
  const { rede } = useSessao();

  return (
    <Secao id="componentes" titulo="Componentes" intro="Estados mostrados lado a lado. Passe o mouse ou use a tecla Tab para ver os estados de foco e de cursor.">
      <Exemplo nome="Botão" nota="Um só botão principal por tela. O texto diz exatamente o que acontece.">
        <div className="acoes-linha">
          <Botao>Enviar para triagem</Botao>
          <Botao variante="secundario">Salvar rascunho</Botao>
          <Botao variante="perigo">Descartar registro</Botao>
          <Botao variante="texto">Ver histórico</Botao>
        </div>
        <div className="acoes-linha">
          <Botao disabled>Desativado</Botao>
          <Botao carregando>Enviando</Botao>
        </div>
      </Exemplo>

      <Exemplo nome="Campo de texto" nota="Rótulo sempre visível; o texto de exemplo nunca substitui o rótulo.">
        <div className="guia-grade">
          <CampoTexto rotulo="Local" value={texto} onChange={(e) => setTexto(e.target.value)} ajuda="Ex.: pátio, sala 12, quadra." />
          <CampoTexto rotulo="Horário" defaultValue="" erro="Informe o horário aproximado." />
          <CampoTexto rotulo="Turma" opcional defaultValue="" />
          <CampoTexto rotulo="Escola" value="E.E. Irmã Maria de Santo Inocêncio Lima" disabled readOnly />
        </div>
      </Exemplo>

      <Exemplo nome="Área de texto" nota="Conta caracteres e anuncia o total ao leitor de tela.">
        <CampoAreaTexto
          rotulo="Relato factual"
          ajuda="Descreva o que foi observado. Evite rótulos sobre a pessoa."
          value={relato}
          maxLength={1500}
          onChange={(e) => setRelato(e.target.value)}
        />
      </Exemplo>

      <Exemplo nome="Lista de seleção">
        <div className="guia-grade">
          <CampoSelecao rotulo="Papel no fato" defaultValue="direto">
            <option value="direto">Envolvido direto</option>
            <option value="testemunha">Testemunha</option>
          </CampoSelecao>
          <CampoSelecao rotulo="Visibilidade" defaultValue="" erro="Escolha quem poderá ver esta pessoa no registro.">
            <option value="" disabled>Escolha</option>
            <option>Coordenação e direção</option>
          </CampoSelecao>
        </div>
      </Exemplo>

      <Exemplo nome="Grupo de opções" nota="Rádio com marcador visível: a seleção não depende só da cor.">
        <GrupoOpcoes
          rotulo="Categoria"
          opcoes={[
            { valor: 'conflito', rotulo: 'Convivência ou conflito' },
            { valor: 'bullying', rotulo: 'Bullying ou cyberbullying' },
            { valor: 'protecao', rotulo: 'Proteção ou vulnerabilidade' },
            { valor: 'arquivada', rotulo: 'Categoria desativada', desativada: true },
          ]}
          valor={categoria}
          aoMudar={setCategoria}
        />
      </Exemplo>

      <Exemplo nome="Sim ou não" nota="Substitui o interruptor do protótipo: duas escolhas nomeadas, fáceis de acertar.">
        <GrupoOpcoes
          rotulo="Alguém corre risco agora?"
          ajuda="Se marcar sim, a direção é avisada imediatamente."
          estilo="sim-nao"
          opcoes={[{ valor: 'sim', rotulo: 'Sim' }, { valor: 'nao', rotulo: 'Não' }]}
          valor={urgente}
          aoMudar={setUrgente}
        />
      </Exemplo>

      <Exemplo nome="Caixa de marcar">
        <CaixaMarcar rotulo="Confirmo que o relato descreve fatos observados" ajuda="Correções depois do envio viram adendo identificado." />
      </Exemplo>

      <Exemplo nome="Etiquetas de situação">
        <div className="acoes-linha">
          <EtiquetaStatus status="rascunho" />
          <EtiquetaStatus status="recebido" />
          <EtiquetaStatus status="em_triagem" />
          <EtiquetaStatus status="em_acompanhamento" />
          <EtiquetaStatus status="encerrado" />
        </div>
        <div className="acoes-linha">
          <EtiquetaPrioridade prioridade="urgente" />
          <EtiquetaPrioridade prioridade="alta" />
          <EtiquetaPrioridade prioridade="media" />
          <Etiqueta tipo="info">Confidencial</Etiqueta>
        </div>
      </Exemplo>

      <Exemplo nome="Avisos">
        <div className="pilha">
          <Aviso tipo="info" titulo="Visível só para coordenação e direção">Conforme a matriz de acesso da sua escola.</Aviso>
          <Aviso tipo="atencao" titulo="Prazo de devolutiva amanhã">O Conselho Tutelar ainda não respondeu ao ofício de 25 de setembro.</Aviso>
          <Aviso tipo="erro" titulo="Não foi possível enviar">O servidor não respondeu. Seu texto continua salvo neste aparelho.</Aviso>
          <Aviso tipo="sucesso" titulo="Registro enviado para triagem">Protocolo 2026-000482.</Aviso>
        </div>
      </Exemplo>

      <Exemplo nome="Painel">
        <Painel titulo="Plano de apoio" acao={<Botao variante="texto">Editar</Botao>}>
          <p>Mediação de conflito com a coordenação pedagógica até 2 de outubro.</p>
        </Painel>
      </Exemplo>

      <Exemplo nome="Tabela" nota="Rola na horizontal dentro do próprio quadro no celular; a página nunca rola de lado.">
        <Tabela
          legenda="Exemplo de ocorrências"
          chaveLinha={(l) => l.p}
          linhas={[
            { p: '2026-000483', c: 'Proteção ou vulnerabilidade', s: 'em_triagem' as const, pr: 'urgente' as const },
            { p: '2026-000482', c: 'Convivência ou conflito', s: 'em_acompanhamento' as const, pr: 'media' as const },
          ]}
          colunas={[
            { chave: 'p', titulo: 'Protocolo', celula: (l) => l.p },
            { chave: 'c', titulo: 'Categoria', celula: (l) => l.c },
            { chave: 's', titulo: 'Situação', celula: (l) => <EtiquetaStatus status={l.s} /> },
            { chave: 'pr', titulo: 'Prioridade', celula: (l) => <EtiquetaPrioridade prioridade={l.pr} /> },
          ]}
        />
      </Exemplo>

      <Exemplo nome="Abas" nota="Setas do teclado trocam de aba.">
        <Abas
          rotulo="Detalhes do caso"
          abas={[
            { id: 'linha', titulo: 'Linha do tempo', conteudo: <p>Registro criado por Professor(a), 25 de setembro, 9h52.</p> },
            { id: 'plano', titulo: 'Plano de apoio', conteudo: <p>Mediação de conflito, responsável: coordenação.</p> },
            { id: 'enc', titulo: 'Encaminhamentos', conteudo: <p>Nenhum encaminhamento externo.</p> },
          ]}
        />
      </Exemplo>

      <Exemplo nome="Etapas">
        <Etapas etapas={['O fato', 'Envolvidos', 'Revisão']} atual={etapa} />
        <div className="acoes-linha">
          <Botao variante="secundario" onClick={() => setEtapa((e) => Math.max(1, e - 1))}>Etapa anterior</Botao>
          <Botao variante="secundario" onClick={() => setEtapa((e) => Math.min(4, e + 1))}>Próxima etapa</Botao>
        </div>
      </Exemplo>

      <Exemplo nome="Diálogo de confirmação" nota="Prende o foco, fecha com Esc e devolve o foco ao botão que abriu.">
        <Botao variante="secundario" onClick={() => setDialogo(true)}>Encerrar caso</Botao>
        <DialogoConfirmacao
          aberto={dialogo}
          titulo="Encerrar o caso 2026-000482?"
          confirmar="Encerrar caso"
          aoCancelar={() => setDialogo(false)}
          aoConfirmar={() => { setDialogo(false); notificar('Caso 2026-000482 encerrado.'); }}
        >
          O histórico continua disponível para quem tem acesso. Uma reavaliação pode ser agendada depois.
        </DialogoConfirmacao>
      </Exemplo>

      <Exemplo nome="Notificação" nota="Confirma uma ação sem interromper; o leitor de tela anuncia.">
        <Botao variante="secundario" onClick={() => notificar('Rascunho salvo às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + '.')}>
          Salvar rascunho
        </Botao>
      </Exemplo>

      <Exemplo nome="Estado vazio" nota="Diz o que fazer em seguida.">
        <Vazio titulo="Nenhuma ocorrência na fila" acao={<Botao variante="secundario">Registrar ocorrência</Botao>}>
          Quando alguém registrar uma ocorrência nesta escola, ela aparece aqui.
        </Vazio>
      </Exemplo>

      <Exemplo nome="Carregando">
        <Esqueleto rotulo="Carregando exemplo" />
      </Exemplo>

      <Exemplo nome="Brasão da rede" nota="Gerado a partir da sigla e da cor da rede; a secretaria poderá enviar o próprio.">
        <div className="acoes-linha"><Brasao sigla={rede?.sigla ?? 'SP'} tamanho={56} /><Brasao sigla={rede?.sigla ?? 'SP'} tamanho={32} /></div>
      </Exemplo>

      <Exemplo nome="Barra de contexto e aparência" nota="Rede e escola ativas ficam sempre no topo. Aparência ajusta tamanho do texto e cores.">
        <p>Veja no alto desta página.</p>
      </Exemplo>
    </Secao>
  );
}

/* ---------- Guarda de rascunho ---------- */
function TesteRascunho() {
  const [texto, setTexto] = useState('');
  useRascunho(texto.trim().length > 0);
  return (
    <Secao id="rascunho" titulo="Guarda de rascunho" intro="Escreva algo abaixo e tente trocar de escola, de rede ou sair. O sistema pede confirmação antes de descartar.">
      <Painel>
        <div className="pilha">
          <CampoAreaTexto rotulo="Anotação de teste" opcional value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={300} />
          <p className="guia-nota">
            {texto.trim() ? 'Há alterações não enviadas. A troca de contexto agora pede confirmação.' : 'Sem alterações: a troca de contexto acontece direto.'}
          </p>
        </div>
      </Painel>
    </Secao>
  );
}

/* ---------- Estados ---------- */
function Quebra(): ReactNode {
  throw new Error('Erro de tela simulado no guia');
}

function Estados() {
  const online = useConexao();
  const [simulando, setSimulando] = useState(semConexaoSimuladaAtiva());
  const [pedirFalha, setPedirFalha] = useState(0);
  const [quebrar, setQuebrar] = useState(false);
  const [restaurar, setRestaurar] = useState(false);
  const falha = useApi<unknown>(pedirFalha ? rotas.falhaSimulada : null, [pedirFalha]);

  return (
    <Secao id="estados" titulo="Estados do sistema" intro="Toda tela trata carregando, vazio, sem conexão, erro e falta de permissão.">
      <div className="guia-colunas">
        <Painel titulo="Sem conexão">
          <div className="pilha">
            <CaixaMarcar
              rotulo="Simular falta de conexão"
              checked={simulando}
              onChange={(e) => { setSimulando(e.target.checked); definirSemConexaoSimulada(e.target.checked); }}
              ajuda="Mostra a faixa de aviso no topo e bloqueia chamadas ao servidor."
            />
            <p className="guia-nota">Situação agora: {online ? 'conectado' : 'sem conexão'}.</p>
          </div>
        </Painel>
        <Painel titulo="Erro do servidor">
          <div className="pilha">
            <Botao variante="secundario" onClick={() => setPedirFalha((n) => n + 1)}>Pedir dado que falha</Botao>
            {pedirFalha > 0 && (
              <EstadoDaCarga estado={falha.estado} tentarDeNovo={falha.tentarDeNovo}>{() => null}</EstadoDaCarga>
            )}
          </div>
        </Painel>
        <Painel titulo="Erro de tela">
          <div className="pilha">
            <Botao variante="secundario" onClick={() => setQuebrar(true)}>Quebrar este quadro</Botao>
            <LimiteDeErro>{quebrar ? <Quebra /> : <p className="guia-nota">O erro fica contido e a tela oferece saída.</p>}</LimiteDeErro>
          </div>
        </Painel>
        <Painel titulo="Dados de demonstração">
          <div className="pilha">
            <p className="guia-nota">
              O que foi registrado nas demonstrações fica guardado neste navegador, compartilhado entre abas. Restaurar
              volta aos dados fictícios iniciais.
            </p>
            <div><Botao variante="secundario" onClick={() => setRestaurar(true)}>Restaurar dados de demonstração</Botao></div>
            <DialogoConfirmacao
              aberto={restaurar}
              titulo="Restaurar os dados de demonstração?"
              confirmar="Restaurar"
              perigoso
              aoCancelar={() => setRestaurar(false)}
              aoConfirmar={() => {
                try {
                  // Apaga todas as versões do banco da demonstração (chave em src/mocks/base.ts).
                  Object.keys(localStorage).filter((k) => k.startsWith('demo.banco')).forEach((k) => localStorage.removeItem(k));
                } catch {
                  /* sem armazenamento: nada a apagar */
                }
                location.reload();
              }}
            >
              Casos, comunicações, auditoria e configurações criados nas demonstrações serão apagados deste navegador.
            </DialogoConfirmacao>
          </div>
        </Painel>
        <Painel titulo="Páginas de estado">
          <ul className="lista-links">
            <li><Link to="/pagina-que-nao-existe">Página não encontrada</Link></li>
            <li><Link to="/administracao">Área sem permissão</Link> <small>(para perfis sem acesso)</small></li>
            <li><Link to="/erro">Erro geral</Link></li>
          </ul>
        </Painel>
      </div>
    </Secao>
  );
}

/* ---------- Isolamento ---------- */
function Isolamento() {
  const s = useSessao();
  const lista = useApi<OcorrenciaResumo[]>(rotas.ocorrencias, [s.rede?.id, s.escola?.id]);
  const [tentativa, setTentativa] = useState<{ tipo: 'ok' | 'bloqueado' | 'erro'; texto: string } | null>(null);
  const outra = s.redes.find((r) => r.id !== s.rede?.id);
  const idAlheio = outra?.id === 'rede-teste' ? 'oc-rt-482' : 'oc-sp-482';
  const nomeEscola = (id: string, escolas: Escola[]) => escolas.find((e) => e.id === id)?.nome ?? id;

  async function tentar() {
    try {
      await api(rotas.ocorrencia(idAlheio));
      setTentativa({ tipo: 'ok', texto: 'O servidor entregou o registro. Isso seria um vazamento.' });
    } catch (e) {
      if (e instanceof ErroDaApi) setTentativa({ tipo: 'bloqueado', texto: `Resposta ${e.status}: ${e.message}` });
      else if (e instanceof FalhaDeRede) setTentativa({ tipo: 'erro', texto: 'Sem conexão para fazer o teste.' });
    }
  }

  return (
    <Secao
      id="isolamento"
      titulo="Isolamento entre redes"
      intro="As duas redes de demonstração têm registros com os mesmos números de protocolo. Se houvesse mistura, ela apareceria aqui."
    >
      <div className="guia-colunas">
        <Painel titulo={`Registros visíveis em ${s.rede?.nome}`}>
          <EstadoDaCarga estado={lista.estado} tentarDeNovo={lista.tentarDeNovo} rotulo="Carregando registros">
            {(dados) =>
              dados.length === 0 ? (
                <p>Nenhum registro visível para este perfil nesta escola.</p>
              ) : (
                <ul className="lista-registros">
                  {dados.map((o) => (
                    <li key={o.id}>
                      <strong>{o.protocolo}</strong> <span>{nomeEscola(o.escolaId, s.escolas)}</span> <EtiquetaStatus status={o.status} />
                    </li>
                  ))}
                </ul>
              )
            }
          </EstadoDaCarga>
        </Painel>
        <Painel titulo="Tentar abrir um registro da outra rede">
          <div className="pilha">
            <p>Pede ao servidor o registro 2026-000482 de {outra?.nome}, usando o identificador interno dele.</p>
            <div><Botao variante="secundario" onClick={tentar}>Tentar abrir</Botao></div>
            {tentativa && (
              <Aviso tipo={tentativa.tipo === 'bloqueado' ? 'sucesso' : 'erro'} titulo={tentativa.tipo === 'bloqueado' ? 'Bloqueado pelo servidor' : 'Atenção'}>
                {tentativa.texto}
              </Aviso>
            )}
          </div>
        </Painel>
      </div>
    </Secao>
  );
}

export function Guia() {
  return (
    <div className="pagina guia">
      <div className="pagina-cabeca">
        <h1>Guia da interface</h1>
        <p>Padrões visuais e componentes do sistema, para aprovação da gestão ao fim da fase F1.</p>
      </div>
      <nav aria-label="Seções do guia" className="guia-indice">
        <ul>
          {secoes.map(([id, t]) => <li key={id}><a href={`#${id}`}>{t}</a></li>)}
        </ul>
      </nav>
      <Cores />
      <Tipografia />
      <Espaco />
      <Componentes />
      <TesteRascunho />
      <Estados />
      <Isolamento />
    </div>
  );
}
