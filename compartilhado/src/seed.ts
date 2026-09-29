import type { Categoria, Escola, Evento, Ocorrencia, Pessoa, Rede, Regional, Usuario } from './contrato';
import { gerarProvidencias } from './protocolo';

/*
 * Dados de demonstração.
 *
 * A escola piloto é real: E.E. Irmã Maria de Santo Inocêncio Lima (IMSIL),
 * Jardim Ouro Verde, Limeira, rede estadual de São Paulo. Todas as pessoas,
 * turmas e casos abaixo são fictícios.
 *
 * A "Rede Fictícia de Testes" existe só para provar o isolamento entre redes:
 * tem registros com os mesmos números de protocolo da rede piloto.
 */

export const redes: Rede[] = [
  {
    id: 'rede-sp',
    nome: 'Rede Estadual de Ensino de São Paulo',
    secretaria: 'Secretaria da Educação do Estado de São Paulo',
    municipio: 'São Paulo',
    uf: 'SP',
    esfera: 'estadual',
    sigla: 'SP',
    subdominio: 'sp',
  },
  {
    id: 'rede-teste',
    nome: 'Rede Fictícia de Testes',
    secretaria: 'Secretaria fictícia, usada só para testar o isolamento',
    municipio: 'Cidade Fictícia',
    uf: '',
    esfera: 'municipal',
    sigla: 'RT',
    subdominio: 'teste',
  },
];

export const regionais: Regional[] = [
  { id: 'ure-limeira', redeId: 'rede-sp', nome: 'Unidade Regional de Ensino de Limeira' },
  { id: 'reg-teste', redeId: 'rede-teste', nome: 'Regional Fictícia' },
];

export const escolas: Escola[] = [
  {
    id: 'esc-imsil',
    redeId: 'rede-sp',
    regionalId: 'ure-limeira',
    nome: 'E.E. Irmã Maria de Santo Inocêncio Lima',
    sigla: 'IMSIL',
    municipio: 'Limeira',
    bairro: 'Jardim Ouro Verde',
  },
  {
    id: 'esc-teste',
    redeId: 'rede-teste',
    regionalId: 'reg-teste',
    nome: 'Escola Fictícia de Testes',
    municipio: 'Cidade Fictícia',
    bairro: 'Centro',
  },
  // Segunda escola da regional fictícia: permite testar a visão regional com
  // várias escolas sem inventar escolas reais em Limeira.
  {
    id: 'esc-teste-2',
    redeId: 'rede-teste',
    regionalId: 'reg-teste',
    nome: 'Segunda Escola Fictícia',
    municipio: 'Cidade Fictícia',
    bairro: 'Vila Nova',
  },
];

const cat = (redeId: string, prefixo: string): Categoria[] =>
  [
    'Convivência ou conflito',
    'Bullying ou cyberbullying',
    'Dano ao patrimônio',
    'Discriminação',
    'Saúde ou primeiros cuidados',
    'Frequência ou atraso',
    'Violação de regra',
    'Proteção ou vulnerabilidade',
    'Outro',
  ].map((nome, i) => ({ id: `${prefixo}-cat-${i + 1}`, redeId, nome, ativa: true }));

export const categorias: Categoria[] = [...cat('rede-sp', 'sp'), ...cat('rede-teste', 'rt')];

/** Categorias que sempre pedem atenção da direção, mesmo sem risco imediato marcado. */
export const categoriasSensiveis = ['sp-cat-8', 'rt-cat-8', 'sp-cat-4', 'rt-cat-4'];

export const usuarios: Usuario[] = [
  {
    id: 'u-ana',
    nome: 'Ana Ribeiro',
    vinculos: [
      { redeId: 'rede-sp', perfil: 'professor', escolaIds: ['esc-imsil'] },
      { redeId: 'rede-teste', perfil: 'professor', escolaIds: ['esc-teste'] },
    ],
  },
  { id: 'u-carlos', nome: 'Carlos Mendes', vinculos: [{ redeId: 'rede-sp', perfil: 'coordenacao', escolaIds: ['esc-imsil'] }] },
  { id: 'u-beatriz', nome: 'Beatriz Nunes', vinculos: [{ redeId: 'rede-sp', perfil: 'direcao', escolaIds: ['esc-imsil'] }] },
  { id: 'u-joana', nome: 'Joana Prado', vinculos: [{ redeId: 'rede-sp', perfil: 'referente_protecao', escolaIds: ['esc-imsil'] }] },
  { id: 'u-roberto', nome: 'Roberto Lima', vinculos: [{ redeId: 'rede-sp', perfil: 'apoio', escolaIds: ['esc-imsil'] }] },
  { id: 'u-marta', nome: 'Marta Siqueira', vinculos: [{ redeId: 'rede-sp', perfil: 'diretoria_regional', escolaIds: [], regionalId: 'ure-limeira' }] },
  { id: 'u-paulo', nome: 'Paulo Arantes', vinculos: [{ redeId: 'rede-sp', perfil: 'secretaria', escolaIds: [] }] },
  {
    id: 'u-ti',
    nome: 'Equipe de TI',
    vinculos: [
      { redeId: 'rede-sp', perfil: 'admin_tecnico', escolaIds: [] },
      { redeId: 'rede-teste', perfil: 'admin_tecnico', escolaIds: [] },
    ],
  },
  { id: 'u-luis', nome: 'Luís Farias', vinculos: [{ redeId: 'rede-teste', perfil: 'coordenacao', escolaIds: ['esc-teste'] }] },
  { id: 'u-rita', nome: 'Rita Moraes', vinculos: [{ redeId: 'rede-teste', perfil: 'diretoria_regional', escolaIds: [], regionalId: 'reg-teste' }] },
];

/* Estudantes e profissionais fictícios. Estudantes aparecem com nome e inicial do sobrenome. */
const p = (id: string, escolaId: string, redeId: string, nome: string, tipo: Pessoa['tipo'], turma?: string): Pessoa => ({
  id, escolaId, redeId, nome, tipo, turma,
});
export const pessoas: Pessoa[] = [
  p('p-gabriel', 'esc-imsil', 'rede-sp', 'Gabriel M.', 'estudante', '7º ano B'),
  p('p-lara', 'esc-imsil', 'rede-sp', 'Lara T.', 'estudante', '7º ano B'),
  p('p-davi', 'esc-imsil', 'rede-sp', 'Davi R.', 'estudante', '8º ano A'),
  p('p-sofia', 'esc-imsil', 'rede-sp', 'Sofia L.', 'estudante', '9º ano A'),
  p('p-miguel', 'esc-imsil', 'rede-sp', 'Miguel P.', 'estudante', '1ª série EM'),
  p('p-heloisa', 'esc-imsil', 'rede-sp', 'Heloísa C.', 'estudante', '2ª série EM'),
  p('p-arthur', 'esc-imsil', 'rede-sp', 'Arthur V.', 'estudante', '6º ano A'),
  p('p-valentina', 'esc-imsil', 'rede-sp', 'Valentina S.', 'estudante', '6º ano A'),
  p('p-ana', 'esc-imsil', 'rede-sp', 'Ana Ribeiro', 'profissional'),
  p('p-carlos', 'esc-imsil', 'rede-sp', 'Carlos Mendes', 'profissional'),
  p('p-roberto', 'esc-imsil', 'rede-sp', 'Roberto Lima', 'profissional'),
  p('p-t1', 'esc-teste', 'rede-teste', 'Estudante Fictício 1', 'estudante', 'Turma 1'),
  p('p-t2', 'esc-teste', 'rede-teste', 'Estudante Fictício 2', 'estudante', 'Turma 1'),
];

let seq = 0;
const ev = (tipo: Evento['tipo'], autorNome: string, autorPerfil: Evento['autorPerfil'], em: string, texto: string): Evento => ({
  id: `ev-${++seq}`, tipo, autorNome, autorPerfil, em, texto,
});

/* Mesmos números de protocolo nas duas redes, de propósito. */
type OcorrenciaBase = Omit<Ocorrencia, 'responsavelId' | 'responsavelNome' | 'providencias' | 'encaminhamentos' | 'comunicacoes' | 'encerramento'>;

const base: OcorrenciaBase[] = [
  {
    id: 'oc-sp-482', redeId: 'rede-sp', escolaId: 'esc-imsil', protocolo: '2026-000482', categoriaId: 'sp-cat-1',
    status: 'em_acompanhamento', prioridade: 'media', abertaEm: '2026-09-25T09:52:00-03:00', local: 'Pátio',
    criadoPorId: 'u-ana', criadoPorNome: 'Ana Ribeiro', registroNaRede: 'Conviva 58213',
    fato: {
      categoriaId: 'sp-cat-1', data: '2026-09-25', hora: '09:40', local: 'Pátio', riscoImediato: false,
      relato: 'Durante o intervalo, houve discussão entre dois estudantes do 7º ano B no pátio, com empurrões. Ambos foram separados e acolhidos. Sem lesão relatada.',
      providenciaImediata: 'Separei os estudantes e acompanhei os dois até a coordenação.',
    },
    envolvidos: [
      { pessoaId: 'p-gabriel', nome: 'Gabriel M.', tipo: 'estudante', turma: '7º ano B', papel: 'envolvido_direto', visibilidade: 'coordenacao_direcao' },
      { pessoaId: 'p-lara', nome: 'Lara T.', tipo: 'estudante', turma: '7º ano B', papel: 'envolvido_direto', visibilidade: 'coordenacao_direcao' },
      { pessoaId: 'p-ana', nome: 'Ana Ribeiro', tipo: 'profissional', papel: 'testemunha', visibilidade: 'equipe_do_caso' },
    ],
    anexos: [],
    eventos: [
      ev('registro', 'Ana Ribeiro', 'professor', '2026-09-25T09:52:00-03:00', 'Registro criado com relato do ocorrido no pátio durante o intervalo.'),
      ev('triagem', 'Carlos Mendes', 'coordenacao', '2026-09-25T11:15:00-03:00', 'Classificado como conflito entre pares, sem risco imediato. Prioridade média. Lançado no Conviva SP.'),
      ev('escuta', 'Carlos Mendes', 'coordenacao', '2026-09-26T08:30:00-03:00', 'Conversa individual com os dois estudantes; combinado encontro de mediação.'),
      ev('comunicacao_familia', 'Carlos Mendes', 'coordenacao', '2026-09-26T14:00:00-03:00', 'Famílias comunicadas com o modelo aprovado; ciência confirmada pelas duas.'),
    ],
    plano: [
      { id: 'a1', descricao: 'Mediação de conflito entre os estudantes', responsavel: 'Coordenação', prazo: '2026-10-02', situacao: 'no_prazo' },
      { id: 'a2', descricao: 'Reavaliar convivência na turma', responsavel: 'Orientação de convivência', prazo: '2026-10-09', situacao: 'no_prazo' },
    ],
  },
  {
    id: 'oc-sp-483', redeId: 'rede-sp', escolaId: 'esc-imsil', protocolo: '2026-000483', categoriaId: 'sp-cat-8',
    status: 'em_triagem', prioridade: 'urgente', abertaEm: '2026-09-28T07:40:00-03:00', local: 'Sala 12',
    criadoPorId: 'u-joana', criadoPorNome: 'Joana Prado', registroNaRede: null,
    fato: {
      categoriaId: 'sp-cat-8', data: '2026-09-28', hora: '07:30', local: 'Sala 12', riscoImediato: true,
      relato: 'Estudante chegou com marcas no braço e disse, espontaneamente, que não queria voltar para casa. Foi acolhido pela orientação.',
      providenciaImediata: 'Acolhimento sem perguntas invasivas; direção avisada às 7h35.',
    },
    envolvidos: [
      { pessoaId: 'p-davi', nome: 'Davi R.', tipo: 'estudante', turma: '8º ano A', papel: 'afetado', visibilidade: 'somente_direcao' },
    ],
    anexos: [],
    eventos: [
      ev('registro', 'Joana Prado', 'referente_protecao', '2026-09-28T07:40:00-03:00', 'Registro criado com risco imediato. Direção acionada.'),
    ],
    plano: [],
  },
  {
    id: 'oc-sp-484', redeId: 'rede-sp', escolaId: 'esc-imsil', protocolo: '2026-000484', categoriaId: 'sp-cat-3',
    status: 'recebido', prioridade: 'baixa', abertaEm: '2026-09-28T10:15:00-03:00', local: 'Banheiro do 2º andar',
    criadoPorId: 'u-roberto', criadoPorNome: 'Roberto Lima', registroNaRede: null,
    fato: {
      categoriaId: 'sp-cat-3', data: '2026-09-28', hora: '10:00', local: 'Banheiro do 2º andar', riscoImediato: false,
      relato: 'Torneira da pia arrancada, com vazamento. Não foi possível identificar quem estava no local.',
      providenciaImediata: 'Registro de água fechado e banheiro interditado.',
    },
    envolvidos: [],
    anexos: [],
    eventos: [ev('registro', 'Roberto Lima', 'apoio', '2026-09-28T10:15:00-03:00', 'Registro criado.')],
    plano: [],
  },
  {
    id: 'oc-rt-482', redeId: 'rede-teste', escolaId: 'esc-teste', protocolo: '2026-000482', categoriaId: 'rt-cat-1',
    status: 'em_acompanhamento', prioridade: 'media', abertaEm: '2026-09-25T10:05:00-03:00', local: 'Quadra',
    criadoPorId: 'u-ana', criadoPorNome: 'Ana Ribeiro', registroNaRede: null,
    fato: {
      categoriaId: 'rt-cat-1', data: '2026-09-25', hora: '10:00', local: 'Quadra', riscoImediato: false,
      relato: 'Registro fictício da rede de testes. Se ele aparecer na rede de São Paulo, há vazamento.', providenciaImediata: '',
    },
    envolvidos: [{ pessoaId: 'p-t1', nome: 'Estudante Fictício 1', tipo: 'estudante', turma: 'Turma 1', papel: 'envolvido_direto', visibilidade: 'coordenacao_direcao' }],
    anexos: [],
    eventos: [ev('registro', 'Ana Ribeiro', 'professor', '2026-09-25T10:05:00-03:00', 'Registro fictício de teste.')],
    plano: [],
  },
  {
    id: 'oc-rt-483', redeId: 'rede-teste', escolaId: 'esc-teste', protocolo: '2026-000483', categoriaId: 'rt-cat-2',
    status: 'recebido', prioridade: 'alta', abertaEm: '2026-09-27T14:20:00-03:00', local: 'Grupo de mensagens da turma',
    criadoPorId: 'u-luis', criadoPorNome: 'Luís Farias', registroNaRede: null,
    fato: {
      categoriaId: 'rt-cat-2', data: '2026-09-27', hora: '14:00', local: 'Grupo de mensagens da turma', riscoImediato: false,
      relato: 'Registro fictício da rede de testes.', providenciaImediata: '',
    },
    envolvidos: [],
    anexos: [],
    eventos: [ev('registro', 'Luís Farias', 'coordenacao', '2026-09-27T14:20:00-03:00', 'Registro fictício de teste.')],
    plano: [],
  },
];

/* Caso de infrequência já encaminhado ao Conselho Tutelar, com devolutiva atrasada. */
base.push({
  id: 'oc-sp-481', redeId: 'rede-sp', escolaId: 'esc-imsil', protocolo: '2026-000481', categoriaId: 'sp-cat-6',
  status: 'em_acompanhamento', prioridade: 'alta', abertaEm: '2026-09-08T08:10:00-03:00', local: 'Secretaria escolar',
  criadoPorId: 'u-carlos', criadoPorNome: 'Carlos Mendes', registroNaRede: 'Conviva 57940',
  fato: {
    categoriaId: 'sp-cat-6', data: '2026-09-08', hora: '08:00', local: 'Secretaria escolar', riscoImediato: false,
    relato: 'Estudante da 1ª série EM com 12 faltas seguidas sem justificativa. Três tentativas de contato com a família sem retorno.',
    providenciaImediata: 'Ligações para os dois telefones do cadastro e bilhete enviado por colega da turma.',
  },
  envolvidos: [{ pessoaId: 'p-miguel', nome: 'Miguel P.', tipo: 'estudante', turma: '1ª série EM', papel: 'afetado', visibilidade: 'coordenacao_direcao' }],
  anexos: [],
  eventos: [
    ev('registro', 'Carlos Mendes', 'coordenacao', '2026-09-08T08:10:00-03:00', 'Registro de infrequência depois de três tentativas de contato.'),
    ev('triagem', 'Carlos Mendes', 'coordenacao', '2026-09-08T09:00:00-03:00', 'Prioridade alta. Recursos da escola esgotados.'),
    ev('encaminhamento', 'Beatriz Nunes', 'direcao', '2026-09-10T10:30:00-03:00', 'Ofício ao Conselho Tutelar de Limeira sobre a infrequência.'),
  ],
  plano: [{ id: 'a1', descricao: 'Visita da orientação à família, com o Conselho Tutelar', responsavel: 'Orientação de convivência', prazo: '2026-09-24', situacao: 'atrasada' }],
});

function completar(o: OcorrenciaBase): Ocorrencia {
  return {
    ...o,
    responsavelId: null,
    responsavelNome: null,
    providencias: gerarProvidencias(o.redeId, o.categoriaId, o.fato.riscoImediato),
    encaminhamentos: [],
    comunicacoes: [],
    encerramento: null,
  };
}

export const ocorrencias: Ocorrencia[] = base.map(completar);

/* Ajustes para que a demonstração mostre casos em momentos diferentes. */
const marcar = (id: string, provs: string[], por: string, em: string, obs = '') => {
  const o = ocorrencias.find((x) => x.id === id)!;
  o.providencias = o.providencias.map((p) =>
    provs.some((k) => p.id.endsWith(`-${k}`)) ? { ...p, situacao: 'feita', registradaPor: por, registradaEm: em, observacao: obs } : p,
  );
  return o;
};

{
  const o = marcar('oc-sp-482', ['acolhimento', 'familia', 'conviva'], 'Carlos Mendes', '2026-09-26T14:00:00-03:00');
  o.responsavelId = 'u-carlos';
  o.responsavelNome = 'Carlos Mendes';
  o.comunicacoes = [
    {
      id: 'com-1', tipo: 'familia', destinatario: 'Família de Gabriel M.', em: '2026-09-26T14:00:00-03:00', registradaPor: 'Carlos Mendes',
      texto: 'Prezada família de Gabriel M., informamos que no dia 25 de setembro houve uma discussão no pátio envolvendo Gabriel M. ...',
      linkCiencia: '/ciencia/demo-482-gabriel', ciencia: { em: '2026-09-26T19:12:00-03:00', nome: 'Mãe de Gabriel M.' },
    },
    {
      id: 'com-2', tipo: 'familia', destinatario: 'Família de Lara T.', em: '2026-09-26T14:05:00-03:00', registradaPor: 'Carlos Mendes',
      texto: 'Prezada família de Lara T., informamos que no dia 25 de setembro houve uma discussão no pátio envolvendo Lara T. ...',
      linkCiencia: '/ciencia/demo-482-lara', ciencia: null,
    },
  ];
}
{
  const o = marcar('oc-sp-483', ['acolhimento', 'emergencia'], 'Joana Prado', '2026-09-28T07:35:00-03:00', 'Direção avisada pessoalmente às 7h35; sem necessidade de SAMU.');
  o.responsavelId = 'u-beatriz';
  o.responsavelNome = 'Beatriz Nunes';
}
{
  const o = marcar('oc-sp-481', ['acolhimento', 'familia', 'conviva', 'frequencia'], 'Carlos Mendes', '2026-09-10T10:30:00-03:00');
  o.responsavelId = 'u-carlos';
  o.responsavelNome = 'Carlos Mendes';
  o.encaminhamentos = [
    {
      id: 'enc-1', orgao: 'conselho_tutelar', orgaoNome: 'Conselho Tutelar de Limeira', canal: 'oficio', em: '2026-09-10T10:30:00-03:00',
      protocoloExterno: 'Ofício 14/2026', devolutivaAte: '2026-09-24', devolutiva: null, registradoPor: 'Beatriz Nunes',
    },
  ];
}

/*
 * Histórico fictício de 2026 (casos já encerrados), para que busca e
 * relatórios tenham volume. Gerado de forma determinística: o mesmo em
 * qualquer máquina.
 */
{
  let semente = 20260101;
  const aleatorio = () => ((semente = (semente * 1103515245 + 12345) % 2147483648) / 2147483648);
  const pesos = [18, 7, 6, 2, 5, 9, 8, 2, 3]; // convivência é o mais comum; proteção e discriminação são raros
  const sorteiaCategoria = () => {
    let r = aleatorio() * pesos.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pesos.length; i++) if ((r -= pesos[i]) < 0) return i + 1;
    return 1;
  };
  const locais = ['Pátio', 'Sala de aula', 'Quadra', 'Corredor', 'Entrada ou saída da escola', 'Refeitório', 'Redes sociais ou mensagens'];
  for (let n = 1; n <= 64; n++) {
    const mes = 2 + Math.floor(((n - 1) / 64) * 7); // fevereiro a agosto
    const dia = 1 + Math.floor(aleatorio() * 27);
    const data = `2026-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    const cat = sorteiaCategoria();
    const local = locais[Math.floor(aleatorio() * locais.length)];
    const o = completar({
      id: `oc-sp-h${n}`, redeId: 'rede-sp', escolaId: 'esc-imsil', protocolo: `2026-${String(400 + n).padStart(6, '0')}`,
      categoriaId: `sp-cat-${cat}`, status: 'encerrado', prioridade: cat === 8 ? 'alta' : 'media',
      abertaEm: `${data}T10:00:00-03:00`, local, criadoPorId: 'u-historico', criadoPorNome: 'Registro histórico', registroNaRede: `Conviva ${50000 + n}`,
      fato: { categoriaId: `sp-cat-${cat}`, data, hora: '10:00', local, riscoImediato: false, relato: 'Registro histórico fictício, usado para compor relatórios.', providenciaImediata: '' },
      envolvidos: [], anexos: [], plano: [],
      eventos: [ev('registro', 'Registro histórico', 'coordenacao', `${data}T10:00:00-03:00`, 'Registro histórico fictício.')],
    });
    o.providencias = o.providencias.map((p) => ({ ...p, situacao: 'feita', registradaPor: 'Registro histórico' }));
    o.encerramento = { em: `${data}T18:00:00-03:00`, por: 'Carlos Mendes', justificativa: 'Caso histórico fictício encerrado.', reavaliarEm: null };
    ocorrencias.push(o);
  }

  // Rede de testes: histórico nas duas escolas da regional fictícia (12 e 9 casos),
  // para a regional ver números somados de mais de uma escola.
  for (let n = 1; n <= 21; n++) {
    const escolaId = n <= 12 ? 'esc-teste' : 'esc-teste-2';
    const mes = 3 + (n % 6);
    const data = `2026-${String(mes).padStart(2, '0')}-${String(1 + ((n * 7) % 27)).padStart(2, '0')}`;
    const cat = [1, 1, 2, 3, 6, 7][n % 6];
    const local = locais[n % locais.length];
    const o = completar({
      id: `oc-rt-h${n}`, redeId: 'rede-teste', escolaId, protocolo: `2026-${String(300 + n).padStart(6, '0')}`,
      categoriaId: `rt-cat-${cat}`, status: 'encerrado', prioridade: 'media',
      abertaEm: `${data}T10:00:00-03:00`, local, criadoPorId: 'u-historico', criadoPorNome: 'Registro histórico', registroNaRede: null,
      fato: { categoriaId: `rt-cat-${cat}`, data, hora: '10:00', local, riscoImediato: false, relato: 'Registro histórico fictício da rede de testes.', providenciaImediata: '' },
      envolvidos: [], anexos: [], plano: [],
      eventos: [ev('registro', 'Registro histórico', 'coordenacao', `${data}T10:00:00-03:00`, 'Registro histórico fictício.')],
    });
    o.providencias = o.providencias.map((p) => ({ ...p, situacao: 'feita', registradaPor: 'Registro histórico' }));
    o.encerramento = { em: `${data}T18:00:00-03:00`, por: 'Luís Farias', justificativa: 'Caso histórico fictício encerrado.', reavaliarEm: null };
    ocorrencias.push(o);
  }
}

/** Contatos locais da rede de proteção (fictícios até a escola confirmar; ver Pendências). */
export const contatos: import('./contrato').ContatosLocais[] = [
  { escolaId: 'esc-imsil', conselhoTutelar: 'Conselho Tutelar de Limeira', cras: 'CRAS de referência do Jardim Ouro Verde', creas: 'CREAS de Limeira', delegacia: 'Delegacia de Polícia de Limeira', saude: 'UBS de referência do Jardim Ouro Verde' },
  { escolaId: 'esc-teste', conselhoTutelar: 'Conselho Tutelar Fictício', cras: 'CRAS Fictício', creas: 'CREAS Fictício', delegacia: 'Delegacia Fictícia', saude: 'UBS Fictícia' },
  { escolaId: 'esc-teste-2', conselhoTutelar: 'Conselho Tutelar Fictício', cras: 'CRAS Fictício da Vila Nova', creas: 'CREAS Fictício', delegacia: 'Delegacia Fictícia', saude: 'UBS Fictícia da Vila Nova' },
];
