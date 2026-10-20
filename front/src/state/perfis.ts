import type { Perfil } from '../api/contract';

export const nomePerfil: Record<Perfil, string> = {
  professor: 'Professor(a)',
  apoio: 'Apoio ou portaria',
  coordenacao: 'Coordenação',
  direcao: 'Direção',
  referente_protecao: 'Referente de proteção',
  diretoria_regional: 'Diretoria regional',
  secretaria: 'Secretaria de Educação',
  admin_tecnico: 'Administração técnica',
};

/** Perfis que atuam em uma escola; os demais atuam na rede inteira. */
export const perfisDeEscola: Perfil[] = ['professor', 'apoio', 'coordenacao', 'direcao', 'referente_protecao'];

export type Area =
  | 'inicio'
  | 'registrar'
  | 'meus-registros'
  | 'central'
  | 'buscar'
  | 'relatorios'
  | 'administracao';

export type ItemNav = { area: Area; rotulo: string; curto?: string; caminho: string; descricao: string };

export const navegacao: ItemNav[] = [
  { area: 'inicio', rotulo: 'Início', caminho: '/', descricao: 'Atalhos e prazos próximos.' },
  { area: 'registrar', rotulo: 'Registrar', caminho: '/registrar', descricao: 'Registrar uma ocorrência em três passos.' },
  { area: 'meus-registros', rotulo: 'Meus registros', caminho: '/meus-registros', descricao: 'Registros enviados e rascunhos.' },
  { area: 'central', rotulo: 'Acompanhamentos', curto: 'Acompanhar', caminho: '/central', descricao: 'Os registros da escola, do que chegou agora ao que já foi concluído.' },
  { area: 'buscar', rotulo: 'Buscar', caminho: '/buscar', descricao: 'Encontrar casos por período, tipo e situação.' },
  { area: 'relatorios', rotulo: 'Relatórios', caminho: '/relatorios', descricao: 'Números agregados, sem expor casos individuais.' },
  { area: 'administracao', rotulo: 'Escola', caminho: '/administracao', descricao: 'Alunos, equipe, tipos de ocorrência, próximos passos e modelos.' },
];

/** Matriz de acesso do front. O backend aplica a mesma regra; esconder na tela não é segurança. */
export const acesso: Record<Perfil, Area[]> = {
  professor: ['inicio', 'registrar', 'meus-registros'],
  apoio: ['inicio', 'registrar', 'meus-registros'],
  coordenacao: ['inicio', 'registrar', 'meus-registros', 'central', 'buscar'],
  direcao: ['inicio', 'registrar', 'central', 'buscar', 'relatorios', 'administracao'],
  referente_protecao: ['inicio', 'registrar', 'central', 'buscar'],
  diretoria_regional: ['inicio', 'buscar', 'relatorios'],
  secretaria: ['inicio', 'relatorios', 'administracao'],
  admin_tecnico: ['inicio', 'administracao'],
};

export const podeAcessar = (perfil: Perfil, area: Area) => acesso[perfil].includes(area);
