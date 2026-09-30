import { handle } from 'hono/vercel';
import { criarApp } from './app';

/*
 * Entrada para a Vercel. Este arquivo é empacotado num só (api/_app.cjs) pelo
 * comando "empacotar", durante o build: a Vercel compila as funções arquivo
 * por arquivo, e os imports entre os módulos do servidor não funcionariam lá.
 */
export const manipulador = handle(criarApp());
