import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import type { OcorrenciaResumo } from '@tcc/compartilhado/contrato';
import { prepararAmbiente } from './preparar';

/* O caso abre também pelo número de protocolo, não só pelo id interno. */

let amb: Awaited<ReturnType<typeof prepararAmbiente>>;
let ana: Record<string, string>, carlos: Record<string, string>;
beforeAll(async () => {
  amb = await prepararAmbiente();
  ana = await amb.entrar('u-ana', 'rede-sp', 'esc-imsil');
  carlos = await amb.entrar('u-carlos', 'rede-sp', 'esc-imsil');
}, 120_000);
afterAll(async () => {
  await amb?.encerrar();
});

describe('abrir caso pelo protocolo', () => {
  test('mesmo caso pelo protocolo e pelo id; protocolo de outra rede não abre', async () => {
    const lista = (await (await amb.pedir('/ocorrencias', { cabecalhos: ana })).json()) as OcorrenciaResumo[];
    const alvo = lista[0];
    const pelo = await amb.pedir(`/ocorrencias/${alvo.protocolo}`, { cabecalhos: ana });
    expect(pelo.status).toBe(200);
    expect(((await pelo.json()) as { id: string }).id).toBe(alvo.id);

    const outraRede = await amb.entrar('u-ana', 'rede-teste', 'esc-teste');
    // A rede de testes tem protocolos com os mesmos números: o protocolo só abre um caso dela.
    const outro = await amb.pedir(`/ocorrencias/${alvo.protocolo}`, { cabecalhos: outraRede });
    if (outro.status === 200) expect(((await outro.json()) as { id: string }).id).not.toBe(alvo.id);
  });

  test('protocolo inexistente responde 404', async () => {
    expect((await amb.pedir('/ocorrencias/2099-999999', { cabecalhos: carlos })).status).toBe(404);
  });
});
