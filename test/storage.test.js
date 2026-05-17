import { describe, it, assertEqual, assert } from './runner.js';

describe('storage v2 - migrateV1ToV2', () => {
  it('migra todas las claves v1 a v2 preservando la caja', async () => {
    // Limpiar
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('jp_n5_v1.') || k.startsWith('jp_n5_v2.') || k === 'jp_n5_v2_migrated')) {
        localStorage.removeItem(k);
      }
    }
    // Sembrar v1
    localStorage.setItem('jp_n5_v1.vocab.v_inu', JSON.stringify({ box: 2, lastSeen: 1700000000000, correct: 5, wrong: 1 }));
    localStorage.setItem('jp_n5_v1.kanji.k_hi', JSON.stringify({ box: 0, lastSeen: null, correct: 0, wrong: 3 }));
    localStorage.setItem('jp_n5_v1.verbs.vb_taberu', JSON.stringify({ box: 4, lastSeen: 1700000000000, correct: 20, wrong: 0 }));

    const { migrateV1ToV2 } = await import('../js/storage.js?c=m1');
    const migrated = migrateV1ToV2(1800000000000);  // now fijado

    assertEqual(migrated, 3);
    // v1 claves borradas
    assertEqual(localStorage.getItem('jp_n5_v1.vocab.v_inu'), null);
    assertEqual(localStorage.getItem('jp_n5_v1.kanji.k_hi'), null);
    // v2 claves creadas
    const v2_vocab = JSON.parse(localStorage.getItem('jp_n5_v2.vocab.v_inu'));
    assertEqual(v2_vocab.box, 2);
    assertEqual(v2_vocab.correct, 5);
    assertEqual(v2_vocab.wrong, 1);
    assertEqual(v2_vocab.lastSeen, 1700000000000);
    // dueAt = lastSeen + intervalo(box=2) = 1700000000000 + 3 días
    assertEqual(v2_vocab.dueAt, 1700000000000 + 3 * 24 * 60 * 60 * 1000);
    // Para kanji con lastSeen null, dueAt = now + intervalo(0) = 1800000000000 + 10min
    const v2_kanji = JSON.parse(localStorage.getItem('jp_n5_v2.kanji.k_hi'));
    assertEqual(v2_kanji.dueAt, 1800000000000 + 10 * 60 * 1000);
    // Flag marcado
    assertEqual(localStorage.getItem('jp_n5_v2_migrated'), '1');
    // Cleanup
    localStorage.removeItem('jp_n5_v2.vocab.v_inu');
    localStorage.removeItem('jp_n5_v2.kanji.k_hi');
    localStorage.removeItem('jp_n5_v2.verbs.vb_taberu');
    localStorage.removeItem('jp_n5_v2_migrated');
  });

  it('no migra si ya está marcado como migrado', async () => {
    localStorage.setItem('jp_n5_v2_migrated', '1');
    localStorage.setItem('jp_n5_v1.vocab.v_x', JSON.stringify({ box: 1, lastSeen: 1, correct: 1, wrong: 0 }));
    const { migrateV1ToV2 } = await import('../js/storage.js?c=m2');
    const migrated = migrateV1ToV2(Date.now());
    assertEqual(migrated, 0);
    assert(!localStorage.getItem('jp_n5_v2.vocab.v_x'), 'no debe crear v2');
    localStorage.removeItem('jp_n5_v2_migrated');
    localStorage.removeItem('jp_n5_v1.vocab.v_x');
  });
});

describe('storage v2 - recordAnswer / getProgress', () => {
  it('recordAnswer crea v2 con dueAt calculado', async () => {
    localStorage.removeItem('jp_n5_v2.testdeck.t1');
    const { recordAnswer, getProgress } = await import('../js/storage.js?c=r1');
    recordAnswer('testdeck', 't1', true, 1700000000000);
    const p = getProgress('testdeck', 't1');
    assertEqual(p.box, 1);
    assertEqual(p.correct, 1);
    assertEqual(p.wrong, 0);
    assertEqual(p.lastSeen, 1700000000000);
    assertEqual(p.dueAt, 1700000000000 + 24 * 60 * 60 * 1000);
    localStorage.removeItem('jp_n5_v2.testdeck.t1');
  });
  it('recordAnswer wrong baja a box 0 con dueAt corto', async () => {
    localStorage.setItem('jp_n5_v2.testdeck.t2', JSON.stringify({ box: 3, lastSeen: 0, correct: 5, wrong: 0, dueAt: 0 }));
    const { recordAnswer, getProgress } = await import('../js/storage.js?c=r2');
    recordAnswer('testdeck', 't2', false, 1700000000000);
    const p = getProgress('testdeck', 't2');
    assertEqual(p.box, 0);
    assertEqual(p.wrong, 1);
    assertEqual(p.dueAt, 1700000000000 + 10 * 60 * 1000);
    localStorage.removeItem('jp_n5_v2.testdeck.t2');
  });
});
