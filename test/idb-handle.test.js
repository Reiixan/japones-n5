import { describe, it, assert, assertEqual } from './runner.js';

describe('idb-handle round-trip', () => {
  it('guarda, lee y borra un valor', async () => {
    const mod = await import('../js/idb-handle.js?c=i1');
    await mod.clearHandle();
    assert((await mod.loadHandle()) === null, 'empieza vacío');
    await mod.saveHandle({ marca: 'test-handle' });
    const got = await mod.loadHandle();
    assertEqual(got.marca, 'test-handle');
    await mod.clearHandle();
    assert((await mod.loadHandle()) === null, 'queda vacío tras borrar');
  });
});
