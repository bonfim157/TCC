/**
 * Recursos de demonstração (login escolhendo uma pessoa fictícia, restaurar o
 * seed, link de ciência visível na tela). Só existem em desenvolvimento e
 * previews, para os roteiros do front rodarem contra o servidor real; em
 * produção as rotas nem respondem.
 */
export const loginDemoAtivo = () => process.env.TCC_LOGIN_DEMO === '1' && process.env.VERCEL_ENV !== 'production';
