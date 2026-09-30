import { parseArgs } from 'node:util';
import type { Perfil } from '@tcc/compartilhado/contrato';
import { cargaInicial, criarConta } from './administrar';
import { configurarBanco, fecharBanco } from './banco/conexao';
import { migrar } from './banco/migrar';

/*
 * Administração pela linha de comando, como dono do banco. Precisa de
 * DATABASE_URL (a da aplicação) e DATABASE_URL_DONO (a do dono).
 *
 *   npm run cli -w servidor -- migrar
 *   npm run cli -w servidor -- carga-inicial --rede rede-sp
 *   npm run cli -w servidor -- conta --nome "Nome Completo" --email pessoa@escola.sp.gov.br \
 *       --rede rede-sp --perfil direcao --escola esc-imsil
 */
const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    rede: { type: 'string' }, nome: { type: 'string' }, email: { type: 'string' }, perfil: { type: 'string' },
    escola: { type: 'string', multiple: true }, regional: { type: 'string' },
  },
});

const url = process.env.DATABASE_URL;
const urlDono = process.env.DATABASE_URL_DONO;
if (!url || !urlDono) {
  console.error('Defina DATABASE_URL e DATABASE_URL_DONO antes de usar este comando.');
  process.exit(1);
}
configurarBanco(url, { urlDono });

try {
  switch (positionals[0]) {
    case 'migrar':
      await migrar(console.log);
      console.log('Migrações em dia.');
      break;
    case 'carga-inicial':
      console.log(await cargaInicial(values.rede ?? ''));
      break;
    case 'conta': {
      const r = await criarConta({
        nome: values.nome ?? '', email: values.email ?? '', redeId: values.rede ?? '', perfil: values.perfil as Perfil,
        escolaIds: values.escola, regionalId: values.regional,
      });
      console.log(r.senhaTemporaria
        ? `Conta criada. Senha temporária (entregue em mãos; a pessoa troca no primeiro acesso): ${r.senhaTemporaria}`
        : 'A pessoa já tinha conta; o vínculo com a rede foi acrescentado e a senha não mudou.');
      break;
    }
    default:
      console.error('Comandos: migrar | carga-inicial --rede <id> | conta --nome --email --rede --perfil [--escola ...] [--regional]');
      process.exitCode = 1;
  }
} catch (e) {
  console.error((e as Error).message);
  process.exitCode = 1;
} finally {
  await fecharBanco();
}
