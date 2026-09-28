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

export type ItemNav = { area: Area; rotulo: string; caminho: string; fase: string; descricao: string };

export const navegacao: ItemNav[] = [
  { area: 'inicio', rotulo: 'Início', caminho: '/', fase: 'F2', descricao: 'Atalhos e prazos próximos.' },
  { area: 'registrar', rotulo: 'Registrar', caminho: '/registrar', fase: 'F2', descricao: 'Registrar uma ocorrência em três passos.' },
  { area: 'meus-registros', rotulo: 'Meus registros', caminho: '/meus-registros', fase: 'F2', descricao: 'Registros enviados e rascunhos.' },
  { area: 'central', rotulo: 'Central de gestão', caminho: '/central', fase: 'F3', descricao: 'Fila, caso, providências e agenda em uma tela.' },
  { area: 'buscar', rotulo: 'Buscar', caminho: '/buscar', fase: 'F4', descricao: 'Encontrar casos por período, tipo e situação.' },
  { area: 'relatorios', rotulo: 'Relatórios', caminho: '/relatorios', fase: 'F4', descricao: 'Números agregados, sem expor casos individuais.' },
  { area: 'administracao', rotulo: 'Administração', caminho: '/administracao', fase: 'F4', descricao: 'Protocolo da rede, escolas, usuários e modelos.' },
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
