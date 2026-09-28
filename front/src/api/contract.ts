/**
 * Contrato de dados entre front e backend.
 *
 * A API simulada (src/mocks) implementa exatamente estes tipos. Quando o
 * backend real existir, ele deve responder no mesmo formato.
 *
 * Toda requisição autenticada envia:
 *   Authorization: Bearer <token>
 *   X-Rede-Id:     rede ativa (inquilino)
 *   X-Escola-Id:   escola ativa, quando houver
 * O servidor filtra tudo pela rede do cabeçalho e responde 403 a qualquer
 * recurso de outra rede, mesmo que o id exista.
 */

export type RedeId = string;
export type EscolaId = string;

export type Esfera = 'municipal' | 'estadual';

/** Dados públicos da rede, usados antes do login (timbre, tema). */
export type Rede = {
  id: RedeId;
  nome: string;             // "Rede Estadual de Ensino de São Paulo"
  secretaria: string;       // "Secretaria da Educação do Estado de São Paulo"
  municipio: string;
  uf: string;
  esfera: Esfera;
  sigla: string;            // usada no brasão
  subdominio: string;       // "sp"
};

export type Regional = { id: string; redeId: RedeId; nome: string };

export type Escola = {
  id: EscolaId;
  redeId: RedeId;
  regionalId: string;
  nome: string;
  sigla?: string;            // como a comunidade chama a escola (ex.: IMSIL)
  municipio: string;
  bairro: string;
};

export type Perfil =
  | 'professor'
  | 'apoio'
  | 'coordenacao'
  | 'direcao'
  | 'referente_protecao'
  | 'diretoria_regional'
  | 'secretaria'
  | 'admin_tecnico';

/** Vínculo de uma pessoa com uma rede. Uma pessoa pode ter vínculos em redes diferentes. */
export type Vinculo = {
  redeId: RedeId;
  perfil: Perfil;
  escolaIds: EscolaId[];     // vazio para perfis de rede (secretaria, regional)
  regionalId?: string;
};

export type Usuario = {
  id: string;
  nome: string;
  vinculos: Vinculo[];
};

export type NovaSessao = { redeId: RedeId; usuarioId: string };
export type Sessao = { token: string; usuario: Usuario };

export type StatusCaso =
  | 'rascunho'
  | 'recebido'
  | 'em_triagem'
  | 'em_acompanhamento'
  | 'encerrado'
  | 'duplicado'
  | 'cancelado'
  | 'encaminhado_rede';

export type Prioridade = 'urgente' | 'alta' | 'media' | 'baixa';

export type Categoria = { id: string; redeId: RedeId; nome: string; ativa: boolean };

export type OcorrenciaResumo = {
  id: string;
  redeId: RedeId;
  escolaId: EscolaId;
  protocolo: string;
  categoriaId: string;
  status: StatusCaso;
  prioridade: Prioridade;
  abertaEm: string;          // ISO 8601
  local: string;
  criadoPorId: string;
};

/* ---------- Registro completo (F2) ---------- */

export type TipoPessoa = 'estudante' | 'profissional' | 'familiar' | 'outro';

/** Pessoa da escola que pode ser citada num registro. */
export type Pessoa = {
  id: string;
  redeId: RedeId;
  escolaId: EscolaId;
  nome: string;
  tipo: TipoPessoa;
  turma?: string;
};

export type PapelNoFato = 'envolvido_direto' | 'afetado' | 'testemunha';

/** Quem pode ver esta pessoa dentro do registro. */
export type Visibilidade = 'equipe_do_caso' | 'coordenacao_direcao' | 'somente_direcao';

export type Envolvimento = {
  pessoaId: string;
  nome: string;              // o servidor troca por "Pessoa com visibilidade restrita" quando o perfil não pode ver
  tipo: TipoPessoa;
  turma?: string;
  papel: PapelNoFato;
  visibilidade: Visibilidade;
  restrito?: boolean;        // true quando o nome foi ocultado para quem consulta
};

/** Anexo: nesta fase só os metadados; o arquivo em si depende do armazenamento privado do backend. */
export type Anexo = { id: string; nome: string; tamanhoKb: number; justificativa: string };

export type DadosDoFato = {
  categoriaId: string;
  data: string;              // AAAA-MM-DD
  hora: string;              // HH:MM
  local: string;
  relato: string;
  riscoImediato: boolean;
  providenciaImediata: string; // o que já foi feito no momento
};

export type NovaOcorrencia = {
  escolaId: EscolaId;
  fato: DadosDoFato;
  envolvidos: Envolvimento[];
  anexos: Anexo[];
};

export type TipoEvento =
  | 'registro'
  | 'triagem'
  | 'escuta'
  | 'comunicacao_familia'
  | 'encaminhamento'
  | 'adendo'
  | 'reavaliacao'
  | 'providencia'
  | 'encerramento';

/** Evento da linha do tempo. Nunca é editado nem apagado; correções entram como adendo. */
export type Evento = {
  id: string;
  tipo: TipoEvento;
  autorNome: string;
  autorPerfil: Perfil;
  em: string;                // ISO 8601
  texto: string;
};

export type AcaoDoPlano = {
  id: string;
  descricao: string;
  responsavel: string;
  prazo: string;             // AAAA-MM-DD
  situacao: 'no_prazo' | 'atrasada' | 'concluida';
};

/* ---------- Gestão do caso (F3) ---------- */

/**
 * Providência que o protocolo da rede exige ou recomenda para o tipo de caso.
 * O sistema sugere; quem conduz decide. Obrigatórias só são dispensadas com justificativa.
 */
export type Providencia = {
  id: string;
  descricao: string;
  base: string;              // de onde vem a exigência, ex.: "ECA, art. 13"
  obrigatoria: boolean;
  situacao: 'pendente' | 'feita' | 'dispensada';
  registradaPor?: string;
  registradaEm?: string;
  observacao?: string;       // o que foi feito, ou a justificativa da dispensa
};

export type Orgao = 'conselho_tutelar' | 'policia' | 'samu' | 'cras' | 'creas' | 'saude' | 'outro';
export type Canal = 'oficio' | 'telefone' | 'email' | 'presencial' | 'sistema';

/** Encaminhamento a um órgão externo. Toda saída espera uma devolutiva. */
export type Encaminhamento = {
  id: string;
  orgao: Orgao;
  orgaoNome: string;
  canal: Canal;
  em: string;                        // ISO 8601
  protocoloExterno: string;
  devolutivaAte: string;             // AAAA-MM-DD
  devolutiva: { em: string; texto: string } | null;
  registradoPor: string;
};

export type TipoComunicacao = 'familia' | 'conselho_tutelar';

/** Comunicação gerada a partir de um modelo aprovado. */
export type Comunicacao = {
  id: string;
  tipo: TipoComunicacao;
  destinatario: string;
  texto: string;
  em: string;
  registradaPor: string;
  /** Para a família: link de ciência e a confirmação, quando houver. */
  linkCiencia: string | null;
  ciencia: { em: string; nome: string } | null;
};

export type Encerramento = { em: string; por: string; justificativa: string; reavaliarEm: string | null };

export type Ocorrencia = OcorrenciaResumo & {
  fato: DadosDoFato;
  envolvidos: Envolvimento[];
  anexos: Anexo[];
  eventos: Evento[];
  plano: AcaoDoPlano[];
  criadoPorNome: string;
  /** Código do registro no sistema oficial da rede (ex.: Conviva SP), quando já lançado. */
  registroNaRede: string | null;
  responsavelId: string | null;
  responsavelNome: string | null;
  providencias: Providencia[];
  encaminhamentos: Encaminhamento[];
  comunicacoes: Comunicacao[];
  encerramento: Encerramento | null;
};

/** Linha da fila da Central: o resumo mais o que pede atenção. */
export type ItemDaFila = OcorrenciaResumo & {
  responsavelNome: string | null;
  obrigatoriasPendentes: number;
  ctPendente: boolean;               // comunicação ao Conselho Tutelar exigida e ainda não feita
  devolutivasAtrasadas: number;
  proximoPrazo: string | null;       // AAAA-MM-DD
};

export type PessoaDaEquipe = { id: string; nome: string; perfil: Perfil };

export type ModeloDeComunicacao = {
  id: string;
  redeId: RedeId;
  tipo: TipoComunicacao;
  nome: string;
  /** Campos: {estudante}, {escola}, {data}, {resumo}, {responsavel}, {protocolo} */
  texto: string;
};

export type ItemDaAgenda = {
  data: string;                      // AAAA-MM-DD
  tipo: 'prazo_plano' | 'devolutiva' | 'reavaliacao';
  descricao: string;
  ocorrenciaId: string;
  protocolo: string;
};

/* Pedidos de ação sobre o caso */
export type PedidoTriagem = { prioridade: Prioridade; responsavelId: string; categoriaId: string; observacao: string };
export type PedidoProvidencia = { situacao: 'feita' | 'dispensada' | 'pendente'; observacao: string };
export type PedidoEncaminhamento = Pick<Encaminhamento, 'orgao' | 'orgaoNome' | 'canal' | 'protocoloExterno' | 'devolutivaAte'>;
export type PedidoDevolutiva = { texto: string };
export type PedidoRegistroEscola = { tipo: 'escuta' | 'reavaliacao'; texto: string };
export type PedidoAcaoPlano = Pick<AcaoDoPlano, 'descricao' | 'responsavel' | 'prazo'>;
export type PedidoComunicacao = { tipo: TipoComunicacao; destinatario: string; texto: string };
export type PedidoRegistroRede = { codigo: string };
export type PedidoEncerramento = { justificativa: string; reavaliarEm: string | null };

/**
 * Regra do protocolo da rede: para certos tipos de caso, qual providência
 * sugerir. Configurada pela secretaria (Administração, F4).
 */
export type RegraDoProtocolo = {
  id: string;
  redeId: RedeId;
  categoriaIds: string[] | 'todas';
  somenteComRisco: boolean;          // vale só quando houve risco imediato
  descricao: string;
  base: string;
  obrigatoria: boolean;
};

/** O que a família vê pelo link de ciência. Sem nada além da própria comunicação. */
export type CienciaPublica = {
  escola: string;
  rede: string;
  redeId: RedeId;
  destinatario: string;
  texto: string;
  enviadaEm: string;
  ciencia: { em: string; nome: string } | null;
};

/* ---------- Gestão e administração (F4) ---------- */

export type FiltrosDeBusca = {
  de: string;                // AAAA-MM-DD, opcional ('' = sem limite)
  ate: string;
  categoriaId: string;
  status: string;
  prioridade: string;
  texto: string;             // protocolo ou local
};

/** Resultado de busca: só o resumo; abrir o caso segue as regras de acesso. */
export type ResultadoDeBusca = OcorrenciaResumo & { podeAbrir: boolean; escolaNome: string };

/** Contagem que pode vir suprimida (null) quando o grupo é pequeno demais. */
export type Contagem = { chave: string; rotulo: string; total: number | null };

export type Relatorio = {
  limiteMinimo: number;      // grupos com menos casos que isso aparecem como null
  periodo: { de: string; ate: string };
  escopo: string;            // "E.E. ..." ou "Unidade Regional de Ensino de Limeira"
  total: number;
  porCategoria: Contagem[];
  porMes: Contagem[];
  porSituacao: Contagem[];
};

export type PedidoExportacao = { motivo: string; de: string; ate: string; escolaId: string; somenteCategoriaId: string };
export type Exportacao = { nomeArquivo: string; conteudoCsv: string };

export type AcaoAuditada = 'login' | 'consulta' | 'criacao' | 'alteracao' | 'busca' | 'exportacao' | 'administracao' | 'negado';

/** Trilha de auditoria: quem fez o quê, quando, em qual recurso. Sem conteúdo sensível. */
export type RegistroDeAuditoria = {
  id: string;
  em: string;
  ator: string;
  perfil: Perfil | null;
  redeId: RedeId;
  acao: AcaoAuditada;
  recurso: string;           // ex.: "caso 2026-000482", "relatório agregado"
  resultado: 'permitido' | 'negado';
  detalhe?: string;          // motivo da exportação, código do erro
};

/** Contatos locais da rede de proteção, por escola. */
export type ContatosLocais = {
  escolaId: EscolaId;
  conselhoTutelar: string;
  cras: string;
  creas: string;
  delegacia: string;
  saude: string;
};

export type UsuarioDaRede = { id: string; nome: string; perfil: Perfil; escolas: string[] };

export type PedidoNovaPessoa = Pick<Pessoa, 'nome' | 'tipo' | 'turma'>;

export type NovoAdendo = { texto: string };

/** Ação de plano de apoio com prazo, dos casos que a pessoa pode abrir. */
export type PrazoProximo = AcaoDoPlano & { ocorrenciaId: string; protocolo: string };

export type OcorrenciaSemelhante = Pick<OcorrenciaResumo, 'id' | 'protocolo' | 'abertaEm' | 'local' | 'categoriaId'>;

export type ApiErro = {
  codigo: 'nao_autenticado' | 'sem_permissao' | 'nao_encontrado' | 'rede_divergente' | 'erro_interno' | 'validacao' | 'conflito';
  mensagem: string;
};

/** Rotas da API. */
export const rotas = {
  redes: '/api/redes',
  usuariosDemo: (redeId: RedeId) => `/api/redes/${redeId}/usuarios-demo`,
  sessoes: '/api/sessoes',
  escolas: '/api/escolas',
  categorias: '/api/categorias',
  ocorrencias: '/api/ocorrencias',
  ocorrencia: (id: string) => `/api/ocorrencias/${id}`,
  adendos: (id: string) => `/api/ocorrencias/${id}/adendos`,
  semelhantes: (q: { data: string; categoriaId: string }) =>
    `/api/ocorrencias-semelhantes?data=${encodeURIComponent(q.data)}&categoriaId=${encodeURIComponent(q.categoriaId)}`,
  pessoas: (busca: string) => `/api/pessoas?busca=${encodeURIComponent(busca)}`,
  prazos: '/api/prazos',
  fila: '/api/central/fila',
  agenda: '/api/central/agenda',
  equipe: '/api/equipe',
  modelos: '/api/modelos',
  acao: (id: string, acao: string) => `/api/ocorrencias/${id}/${acao}`,
  ciencia: (token: string) => `/api/ciencia/${token}`,
  busca: (f: FiltrosDeBusca) => `/api/busca?${new URLSearchParams(f).toString()}`,
  relatorio: (q: { de: string; ate: string; escolaId: string; categoriaId: string }) => `/api/relatorios?${new URLSearchParams(q).toString()}`,
  exportacoes: '/api/exportacoes',
  auditoria: '/api/auditoria',
  admin: {
    regras: '/api/admin/regras',
    regra: (id: string) => `/api/admin/regras/${id}`,
    categoria: (id: string) => `/api/admin/categorias/${id}`,
    modelo: (id: string) => `/api/admin/modelos/${id}`,
    contatos: '/api/admin/contatos',
    pessoas: '/api/admin/pessoas',
    usuarios: '/api/admin/usuarios',
  },
  falhaSimulada: '/api/diagnostico/falha',
} as const;
