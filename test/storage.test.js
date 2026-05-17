import { describe, it, assertEqual, assert } from './runner.js';

// Backup / restore para que estos tests NO destruyan el progreso real del usuario
// (la función migrateV1ToV2 opera sobre todas las claves jp_n5_v1.*).
function backupAndClearUserKeys() {
  const backup = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && (k.startsWith('jp_n5_v1.') || k.startsWith('jp_n5_v2.') || k === 'jp_n5_v2_migrated')) {
      backup[k] = localStorage.getItem(k);
    }
  }
  for (const k of Object.keys(backup)) localStorage.removeItem(k);
  return backup;
}

function clearAndRestore(backup) {
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i);
    if (k && (k.startsWith('jp_n5_v1.') || k.startsWith('jp_n5_v2.') || k === 'jp_n5_v2_migrated')) {
      localStorage.removeItem(k);
    }
  }
  for (const [k, v] of Object.entries(backup)) localStorage.setItem(k, v);
}

describe('storage v2 - migrateV1ToV2', () => {
  it('migra todas las claves v1 a v2 preservando la caja', async () => {
    const backup = backupAndClearUserKeys();
    try {
      // Sembrar v1
      localStorage.setItem('jp_n5_v1.vocab.v_inu', JSON.stringify({ box: 2, lastSeen: 1700000000000, correct: 5, wrong: 1 }));
      localStorage.setItem('jp_n5_v1.kanji.k_hi', JSON.stringify({ box: 0, lastSeen: null, correct: 0, wrong: 3 }));
      localStorage.setItem('jp_n5_v1.verbs.vb_taberu', JSON.stringify({ box: 4, lastSeen: 1700000000000, correct: 20, wrong: 0 }));

      const { migrateV1ToV2 } = await import('../js/storage.js?c=m1');
      const migrated = migrateV1ToV2(1800000000000);

      assertEqual(migrated, 3);
      assertEqual(localStorage.getItem('jp_n5_v1.vocab.v_inu'), null);
      assertEqual(localStorage.getItem('jp_n5_v1.kanji.k_hi'), null);
      const v2_vocab = JSON.parse(localStorage.getItem('jp_n5_v2.vocab.v_inu'));
      assertEqual(v2_vocab.box, 2);
      assertEqual(v2_vocab.correct, 5);
      assertEqual(v2_vocab.wrong, 1);
      assertEqual(v2_vocab.lastSeen, 1700000000000);
      assertEqual(v2_vocab.dueAt, 1700000000000 + 3 * 24 * 60 * 60 * 1000);
      const v2_kanji = JSON.parse(localStorage.getItem('jp_n5_v2.kanji.k_hi'));
      assertEqual(v2_kanji.dueAt, 1800000000000 + 10 * 60 * 1000);
      assertEqual(localStorage.getItem('jp_n5_v2_migrated'), '1');
    } finally {
      clearAndRestore(backup);
    }
  });

  it('no migra si ya está marcado como migrado', async () => {
    const backup = backupAndClearUserKeys();
    try {
      localStorage.setItem('jp_n5_v2_migrated', '1');
      localStorage.setItem('jp_n5_v1.vocab.v_x', JSON.stringify({ box: 1, lastSeen: 1, correct: 1, wrong: 0 }));
      const { migrateV1ToV2 } = await import('../js/storage.js?c=m2');
      const migrated = migrateV1ToV2(Date.now());
      assertEqual(migrated, 0);
      assert(!localStorage.getItem('jp_n5_v2.vocab.v_x'), 'no debe crear v2');
    } finally {
      clearAndRestore(backup);
    }
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
