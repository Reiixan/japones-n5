# Fase 4 — Infraestructura Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Renovar las capacidades de plataforma de la webapp: (A) SRS v2 con decaimiento temporal y pantalla "Repaso de hoy", (B) daily goal y racha de días, (C) métricas de tiempo por respuesta. El modo examen (4.2) queda **fuera del alcance de este plan** — se planificará por separado cuando se acerque la fecha del examen, con renderers correctos por tipo.

**Architecture:**
- **A. SRS v2**: namespace nuevo `jp_n5_v2.<deck>.<id>` con campo `dueAt`. Migración real desde v1 (preserva la caja existente, calcula dueAt desde lastSeen + intervalo). `selectSession` cambia para priorizar ítems vencidos. Nueva pantalla `/review` que junta items vencidos de todos los bloques.
- **B. Daily goal**: módulo `js/daily.js` con `recordPracticeTick()` invocado tras cada respuesta correcta. UI en cabecera de home (círculo de progreso + racha). Meta configurable en stats.
- **C. Métricas tiempo**: en `js/exercise.js` se captura `answeredAt - shownAt` por ítem, se agrega por sesión (mostrado en summary) y se persiste media móvil de últimas 100 respuestas por bloque.
- **D. Modo examen**: módulo `js/exam.js` con timer por sección, selección de ítems sin tocar SRS, diagnóstico al final. Botón "Simulacro N5" en home, ruta `/exam`.

**Tech Stack:** Vanilla JS ES modules, localStorage, sin dependencias nuevas. PWA queda fuera del plan.

**Sub-fases con tags intermedios:**
- A. SRS v2 → tag `fase-4-srs-v2`
- B. Daily goal → tag `fase-4-daily`
- C. Métricas tiempo → tag `fase-4-tiempo`

Cada sub-fase es independiente: cualquiera puede cerrarse aislada y la app sigue funcional. Orden A→B→C.

**Sub-fase D — Modo examen: fuera de alcance.** El renderer genérico que se planteó para una v1 rápida (mostrar JSON + auto-evaluación) degrada demasiado la utilidad del simulacro. Cuando se planifique aparte, se diseñará con renderers correctos por tipo extraídos de cada bloque existente.

---

## File structure

**Sub-fase A (SRS v2):**
- Modify: `js/storage.js` (formato v2 + función `migrateV1ToV2`), `js/srs.js` (selectSession con dueAt + intervalos por caja).
- Modify: `js/app.js` (llamada a migrate al inicio + ruta `/review`).
- Create: `js/review-today.js`.
- Modify: `js/home.js` (tarjeta nueva "Repaso de hoy" arriba de los bloques).
- Modify: `js/stats.js` (lee de v2).
- Modify: `css/styles.css` o `css/exercise.css` (estilos `.review-card`, `.review-empty`).
- Create: `test/storage.test.js`, `test/srs.test.js` (nuevos), `test/review-today.test.js`.

**Sub-fase B (Daily goal):**
- Create: `js/daily.js`, `test/daily.test.js`.
- Modify: `js/exercise.js` (llamar a `recordPracticeTick` al acertar).
- Modify: `js/home.js` (cabecera con círculo de progreso + racha).
- Modify: `js/stats.js` (configurar meta).
- Modify: `css/styles.css` o `css/home.css` (estilos cabecera daily).

**Sub-fase C (Métricas tiempo):**
- Modify: `js/exercise.js` (capturar y reportar tiempo).
- Modify: `js/storage.js` (persistencia de media móvil).
- Modify: `js/stats.js` (mostrar tiempo medio por bloque).

**Sub-fase D (Modo examen): FUERA DE ALCANCE de este plan.** Ver decisión arriba.

---

# Sub-fase A — SRS v2 con decaimiento temporal

## Task A1: Tests + intervalos en `js/srs.js`

**Files:**
- Create: `test/srs.test.js`
- Modify: `js/srs.js`

Añadir constante `BOX_INTERVALS_MS` y función `dueAtFor(box, fromTime)`. No tocar `selectSession` aún (eso es A3).

- [ ] **Step 1: Crear test/srs.test.js**

```js
import { describe, it, assertEqual, assert } from './runner.js';

describe('srs.dueAtFor', () => {
  it('box 0 → +10 min', async () => {
    const { dueAtFor } = await import('../js/srs.js?c=s1');
    const now = 1700000000000;
    assertEqual(dueAtFor(0, now), now + 10 * 60 * 1000);
  });
  it('box 1 → +1 día', async () => {
    const { dueAtFor } = await import('../js/srs.js?c=s2');
    const now = 1700000000000;
    assertEqual(dueAtFor(1, now), now + 24 * 60 * 60 * 1000);
  });
  it('box 2 → +3 días', async () => {
    const { dueAtFor } = await import('../js/srs.js?c=s3');
    const now = 1700000000000;
    assertEqual(dueAtFor(2, now), now + 3 * 24 * 60 * 60 * 1000);
  });
  it('box 3 → +7 días', async () => {
    const { dueAtFor } = await import('../js/srs.js?c=s4');
    const now = 1700000000000;
    assertEqual(dueAtFor(3, now), now + 7 * 24 * 60 * 60 * 1000);
  });
  it('box 4 → +21 días', async () => {
    const { dueAtFor } = await import('../js/srs.js?c=s5');
    const now = 1700000000000;
    assertEqual(dueAtFor(4, now), now + 21 * 24 * 60 * 60 * 1000);
  });
  it('box fuera de rango lanza error', async () => {
    const { dueAtFor } = await import('../js/srs.js?c=s6');
    let threw = false;
    try { dueAtFor(5, Date.now()); } catch (_) { threw = true; }
    assert(threw, 'debe lanzar para box 5');
  });
});
```

- [ ] **Step 2: Añadir test/srs.test.js al runner** en `test/index.html`.

- [ ] **Step 3: Verificar tests fallan**

- [ ] **Step 4: Añadir al final de `js/srs.js`**

```js
// SRS v2: intervalos de repaso por caja (en milisegundos).
export const BOX_INTERVALS_MS = [
  10 * 60 * 1000,             // box 0 → 10 min
  24 * 60 * 60 * 1000,        // box 1 → 1 día
  3 * 24 * 60 * 60 * 1000,    // box 2 → 3 días
  7 * 24 * 60 * 60 * 1000,    // box 3 → 7 días
  21 * 24 * 60 * 60 * 1000,   // box 4 → 21 días
];

export function dueAtFor(box, fromTime) {
  if (typeof box !== 'number' || box < 0 || box >= BOX_INTERVALS_MS.length) {
    throw new Error(`Box fuera de rango: ${box}`);
  }
  return fromTime + BOX_INTERVALS_MS[box];
}
```

- [ ] **Step 5: Tests pasan. Commit**

```
git add js/srs.js test/srs.test.js test/index.html
git commit -m "feat(srs): intervalos por caja y dueAtFor (preparación SRS v2)"
```

---

## Task A2: Storage v2 + migración v1→v2

**Files:**
- Modify: `js/storage.js`
- Create: `test/storage.test.js`

Cambiar el namespace de `jp_n5_v1` a `jp_n5_v2`. Modificar `recordAnswer` para calcular y persistir `dueAt`. Añadir `migrateV1ToV2()` que se ejecuta una sola vez (flag `jp_n5_v2_migrated`): por cada clave `jp_n5_v1.<deck>.<id>`, crear `jp_n5_v2.<deck>.<id>` con la caja preservada y `dueAt` calculado desde `lastSeen + intervalo(box)` (si `lastSeen` es null, usar `now`).

- [ ] **Step 1: Crear test/storage.test.js**

```js
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
```

- [ ] **Step 2: Modificar `js/storage.js`**

Reemplazar `const NS = 'jp_n5_v1';` por `const NS = 'jp_n5_v2';`. Mantener una constante `const NS_V1 = 'jp_n5_v1';` para la migración.

Modificar `recordAnswer` para aceptar parámetro opcional `now` (defaults a `Date.now()`) y calcular `dueAt`:

```js
import { dueAtFor } from './srs.js';

const NS = 'jp_n5_v2';
const NS_V1 = 'jp_n5_v1';
const MIGRATED_FLAG = 'jp_n5_v2_migrated';

function key(deck, itemId) {
  return `${NS}.${deck}.${itemId}`;
}

export function getProgress(deck, itemId) {
  const raw = localStorage.getItem(key(deck, itemId));
  return raw ? JSON.parse(raw) : { box: 0, lastSeen: null, correct: 0, wrong: 0, dueAt: null };
}

export function recordAnswer(deck, itemId, correct, now = Date.now()) {
  const p = getProgress(deck, itemId);
  p.lastSeen = now;
  if (correct) {
    p.correct = (p.correct || 0) + 1;
    p.box = Math.min((p.box || 0) + 1, 4);
  } else {
    p.wrong = (p.wrong || 0) + 1;
    p.box = 0;
  }
  p.dueAt = dueAtFor(p.box, now);
  localStorage.setItem(key(deck, itemId), JSON.stringify(p));
}

export function migrateV1ToV2(now = Date.now()) {
  if (localStorage.getItem(MIGRATED_FLAG) === '1') return 0;
  const v1Keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(`${NS_V1}.`)) v1Keys.push(k);
  }
  let migrated = 0;
  for (const v1k of v1Keys) {
    const raw = localStorage.getItem(v1k);
    if (!raw) continue;
    try {
      const data = JSON.parse(raw);
      const fromTime = data.lastSeen != null ? data.lastSeen : now;
      const newData = {
        box: data.box || 0,
        lastSeen: data.lastSeen,
        correct: data.correct || 0,
        wrong: data.wrong || 0,
        dueAt: dueAtFor(data.box || 0, fromTime),
      };
      const suffix = v1k.slice(NS_V1.length + 1); // <deck>.<id>
      localStorage.setItem(`${NS}.${suffix}`, JSON.stringify(newData));
      localStorage.removeItem(v1k);
      migrated += 1;
    } catch (e) {
      console.error('Error migrando', v1k, e);
    }
  }
  localStorage.setItem(MIGRATED_FLAG, '1');
  return migrated;
}
```

Mantener `getDeckStats`, `exportAll`, `importAll`, `resetDeck` sin cambios funcionales — solo usan `NS` que ahora es v2. Asegurarse de que `exportAll` siga exportando todas las claves NS-prefixed (ahora v2).

- [ ] **Step 3: Añadir test/storage.test.js al runner**

- [ ] **Step 4: Verificar tests pasan**

- [ ] **Step 5: Commit**

```
git add js/storage.js test/storage.test.js test/index.html
git commit -m "feat(storage): namespace v2 con dueAt y migración real desde v1"
```

---

## Task A3: `selectSession` v2 — priorización por dueAt

**Files:**
- Modify: `js/srs.js`
- Modify: `test/srs.test.js`

Cambiar `selectSession` para que priorice:
1. Ítems vencidos (`dueAt <= now`)
2. Ítems nuevos (sin `lastSeen` o `dueAt === null`)
3. Resto, peso bajo

- [ ] **Step 1: Añadir tests al final de `test/srs.test.js`**

```js
describe('srs.selectSession v2 - priorización dueAt', () => {
  it('prioriza ítems vencidos sobre dominados', async () => {
    // Limpia
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith('jp_n5_v2.test.')) localStorage.removeItem(k);
    }
    const now = 2000000000000;
    // overdue
    localStorage.setItem('jp_n5_v2.test.due', JSON.stringify({ box: 2, lastSeen: 1, correct: 3, wrong: 1, dueAt: now - 1000 }));
    // not due yet
    localStorage.setItem('jp_n5_v2.test.fresh', JSON.stringify({ box: 4, lastSeen: 1, correct: 10, wrong: 0, dueAt: now + 1000000 }));
    // new
    localStorage.setItem('jp_n5_v2.test.new', JSON.stringify({ box: 0, lastSeen: null, correct: 0, wrong: 0, dueAt: null }));

    const items = [{ id: 'due' }, { id: 'fresh' }, { id: 'new' }];
    const { selectSession } = await import('../js/srs.js?c=ss1');
    // Forzar now
    const selected = selectSession('test', items, 2, now);
    const ids = selected.map(i => i.id);
    assert(ids.includes('due'), `'due' debería estar en la selección, hubo: ${ids}`);
    // Cleanup
    localStorage.removeItem('jp_n5_v2.test.due');
    localStorage.removeItem('jp_n5_v2.test.fresh');
    localStorage.removeItem('jp_n5_v2.test.new');
  });
});
```

- [ ] **Step 2: Modificar `js/srs.js`** para que `selectSession` acepte `now` opcional y priorice:

```js
export function selectSession(deck, allItems, sessionSize, now = Date.now()) {
  if (sessionSize === 'all') sessionSize = allItems.length;
  const n = Math.min(sessionSize, allItems.length);

  // Clasificar items en 3 grupos
  const overdue = [];
  const fresh = [];
  const rest = [];
  for (const item of allItems) {
    const p = getProgress(deck, item.id);
    if (p.dueAt != null && p.dueAt <= now) overdue.push({ item, p });
    else if (p.lastSeen == null) fresh.push({ item, p });
    else rest.push({ item, p });
  }

  const result = [];
  // 1. Llenar con vencidos primero (los más vencidos primero)
  overdue.sort((a, b) => (a.p.dueAt || 0) - (b.p.dueAt || 0));
  for (const x of overdue) {
    if (result.length >= n) break;
    result.push(x.item);
  }
  // 2. Después nuevos
  for (const x of shuffle(fresh)) {
    if (result.length >= n) break;
    result.push(x.item);
  }
  // 3. Si aún quedan plazas, llenar con resto mezclado por peso (menor caja → más peso)
  if (result.length < n) {
    const weighted = [...rest];
    while (result.length < n && weighted.length > 0) {
      const totalWeight = weighted.reduce((s, e) => s + (5 - e.p.box), 0);
      let rand = Math.random() * totalWeight;
      for (let i = 0; i < weighted.length; i++) {
        rand -= (5 - weighted[i].p.box);
        if (rand <= 0) {
          result.push(weighted[i].item);
          weighted.splice(i, 1);
          break;
        }
      }
    }
  }
  return shuffle(result);
}
```

Mantener `weightOf`, `shuffle`, `pickWrong` sin cambios. La nueva `selectSession` requiere importar `getProgress`:

```js
import { getProgress } from './storage.js';
```

(El import ya existe, solo confirmar.)

- [ ] **Step 3: Tests pasan. Commit**

```
git add js/srs.js test/srs.test.js
git commit -m "feat(srs): selectSession v2 prioriza vencidos > nuevos > dominados"
```

---

## Task A4: Llamar a migrate al inicio de la app

**Files:**
- Modify: `js/app.js`

- [ ] **Step 1: En `js/app.js`** importar `migrateV1ToV2` desde `./storage.js` y llamarlo UNA VEZ al inicio antes del primer routing:

```js
import { migrateV1ToV2 } from './storage.js';
// ... otros imports
migrateV1ToV2();  // safe-noop si ya migrado
```

Posicionar la llamada al inicio del archivo, después de los imports pero antes de `window.addEventListener('load', route);`. Si la app se carga sin tener nada en v1, la función no hace nada.

- [ ] **Step 2: Commit**

```
git add js/app.js
git commit -m "feat(app): ejecutar migración v1→v2 al inicio"
```

---

## Task A5: Pantalla "Repaso de hoy" — `js/review-today.js`

**Files:**
- Create: `js/review-today.js`
- Create: `test/review-today.test.js`

Esta pantalla junta items vencidos (`dueAt <= now`) de TODOS los bloques en una sesión mezclada. Si no hay nada vencido, muestra mensaje motivacional + lista de los próximos 5 items por `dueAt` ascendente.

**Diseño de la pantalla:**
- Si hay >0 items vencidos: usar `startExercise` con esos items. El config necesita router por bloque (cada item conoce su `_deck` y su renderer).
- Si hay 0 items vencidos: mostrar div con "🎉 ¡Sin repasos pendientes hoy!" + lista de próximos 5.

**Para mantener la complejidad acotada en esta task:** review-today.js carga TODOS los `data/*.json` (vocab, kanji, verbs, etc.), recorre cada uno, busca items con `dueAt <= now`, y los devuelve enriquecidos con `_deck`. Luego pasa al motor con un renderPrompt/renderInput que delegan según `_deck`.

**Simplificación pragmática**: en lugar de delegar a cada bloque, usar un renderer genérico para vocabulario y kanji (los 2 más frecuentes), y SIMPLEMENTE saltar bloques complicados (listening, reading, verbs, adjectives, particles, grammar). Esta es una limitación deliberada para la v1 de Review-today; podemos extender después.

- [ ] **Step 1: Crear test/review-today.test.js (light)**

```js
import { describe, it, assertEqual, assert } from './runner.js';

describe('review-today.collectDueItems', () => {
  it('devuelve items con dueAt <= now', async () => {
    // Sembrar v2 keys
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith('jp_n5_v2.testreview.')) localStorage.removeItem(k);
    }
    const now = 2000000000000;
    localStorage.setItem('jp_n5_v2.testreview.due1', JSON.stringify({ box: 2, lastSeen: 1, correct: 3, wrong: 0, dueAt: now - 1000 }));
    localStorage.setItem('jp_n5_v2.testreview.fresh1', JSON.stringify({ box: 3, lastSeen: 1, correct: 5, wrong: 0, dueAt: now + 10000 }));
    localStorage.setItem('jp_n5_v2.testreview.new1', JSON.stringify({ box: 0, lastSeen: null, correct: 0, wrong: 0, dueAt: null }));

    const items = [{ id: 'due1' }, { id: 'fresh1' }, { id: 'new1' }];
    const { collectDueItems } = await import('../js/review-today.js?c=rt1');
    const due = collectDueItems('testreview', items, now);
    assertEqual(due.length, 1);
    assertEqual(due[0].id, 'due1');
    // Cleanup
    ['due1','fresh1','new1'].forEach(id => localStorage.removeItem(`jp_n5_v2.testreview.${id}`));
  });
});
```

- [ ] **Step 2: Crear `js/review-today.js`**

```js
import { getProgress } from './storage.js';

const DATA_FILES = [
  { deck: 'vocab', file: 'vocab-n5.json' },
  { deck: 'kanji', file: 'kanji-n5.json' },
  { deck: 'particles', file: 'particles.json' },
  { deck: 'grammar', file: 'grammar-n5.json' },
  { deck: 'verbs', file: 'verbs-n5.json' },
  { deck: 'adjectives', file: 'adjectives-n5.json' },
];

const dataCache = {};
async function loadData(file) {
  if (!dataCache[file]) {
    const res = await fetch(`./data/${file}`);
    dataCache[file] = await res.json();
  }
  return dataCache[file];
}

export function collectDueItems(deck, items, now) {
  const due = [];
  for (const item of items) {
    const p = getProgress(deck, item.id);
    if (p.dueAt != null && p.dueAt <= now) {
      due.push(item);
    }
  }
  return due;
}

async function collectAllDue(now) {
  const allDue = [];
  for (const { deck, file } of DATA_FILES) {
    try {
      const items = await loadData(file);
      const due = collectDueItems(deck, items, now);
      for (const item of due) {
        allDue.push({ ...item, _deck: deck, _file: file });
      }
    } catch (e) {
      console.warn('No se pudo cargar', file, e);
    }
  }
  return allDue;
}

async function collectUpcoming(now, limit = 5) {
  const all = [];
  for (const { deck, file } of DATA_FILES) {
    try {
      const items = await loadData(file);
      for (const item of items) {
        const p = getProgress(deck, item.id);
        if (p.dueAt != null && p.dueAt > now) {
          all.push({ item, deck, dueAt: p.dueAt });
        }
      }
    } catch (_) {}
  }
  all.sort((a, b) => a.dueAt - b.dueAt);
  return all.slice(0, limit);
}

function formatTimeUntil(ms) {
  if (ms < 60 * 1000) return 'menos de 1 min';
  if (ms < 60 * 60 * 1000) return `${Math.round(ms / 60000)} min`;
  if (ms < 24 * 60 * 60 * 1000) return `${Math.round(ms / 3600000)} h`;
  return `${Math.round(ms / 86400000)} d`;
}

export async function start(container) {
  container.innerHTML = '<div class="loading-screen">Calculando…</div>';
  const now = Date.now();
  const due = await collectAllDue(now);

  if (due.length === 0) {
    const upcoming = await collectUpcoming(now, 5);
    container.innerHTML = `
      <div class="page review-today">
        <header class="page-header">
          <button class="btn-icon" id="rev-back">←</button>
          <h1>Repaso de hoy</h1>
        </header>
        <main class="review-body">
          <div class="review-empty">
            <div class="review-empty-icon">🎉</div>
            <h2>¡Sin repasos pendientes!</h2>
            <p>Has dominado todo lo que toca hoy. Buena racha.</p>
          </div>
          ${upcoming.length > 0 ? `
            <div class="review-upcoming">
              <h3>Próximos repasos</h3>
              <ul>
                ${upcoming.map(u => `<li><strong>${u.deck}</strong> · <code>${u.item.id}</code> · en ${formatTimeUntil(u.dueAt - now)}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </main>
      </div>
    `;
    document.getElementById('rev-back').addEventListener('click', () => window.navigate('/'));
    return;
  }

  // Render pantalla de resumen: cuántos items, agrupados por bloque, botón "Empezar"
  const byDeck = {};
  for (const it of due) {
    byDeck[it._deck] = (byDeck[it._deck] || 0) + 1;
  }

  container.innerHTML = `
    <div class="page review-today">
      <header class="page-header">
        <button class="btn-icon" id="rev-back">←</button>
        <h1>Repaso de hoy</h1>
      </header>
      <main class="review-body">
        <div class="review-summary">
          <div class="review-total">${due.length} repasos vencidos</div>
          <ul class="review-breakdown">
            ${Object.entries(byDeck).map(([deck, count]) => `<li><strong>${deck}</strong>: ${count}</li>`).join('')}
          </ul>
          <p class="review-note">
            <small>El repaso unificado todavía no orquesta todos los tipos de ejercicio.
            Por ahora ve al bloque que más vencidos tenga: arriba ${Object.entries(byDeck).sort((a,b) => b[1]-a[1])[0][0]}.</small>
          </p>
        </div>
      </main>
    </div>
  `;
  document.getElementById('rev-back').addEventListener('click', () => window.navigate('/'));
}
```

(Esta v1 NO orquesta una sesión cross-deck con `exercise.js` — eso requeriría un renderPrompt unificado o un selector por `_deck`. Por ahora muestra el resumen y dirige al bloque con más pendientes. La sesión cross-deck completa puede ser una mejora futura.)

- [ ] **Step 3: Añadir test/review-today.test.js al runner**

- [ ] **Step 4: Tests pasan. Commit**

```
git add js/review-today.js test/review-today.test.js test/index.html
git commit -m "feat(review): pantalla 'Repaso de hoy' con vencidos por bloque"
```

---

## Task A6: Tarjeta "Repaso de hoy" en home + ruta + CSS

**Files:**
- Modify: `js/app.js` (ruta `/review`)
- Modify: `js/home.js` (tarjeta destacada arriba de los bloques)
- Modify: `css/styles.css` o crear bloque `.review-card` en `css/exercise.css`

- [ ] **Step 1: `js/app.js`**

Añadir import: `import { start as startReviewToday } from './review-today.js';`

En route(), añadir:
```js
    } else if (seg1 === 'review') {
      await startReviewToday(container);
```

- [ ] **Step 2: `js/home.js`**

Antes del `<main class="home-grid">` insertar una sección destacada:

```js
// Dentro de renderHome, antes del map de BLOCKS:
const reviewCardHtml = `
  <div class="review-card" data-path="/review">
    <div class="review-card-icon">🌅</div>
    <div class="review-card-text">
      <div class="review-card-title">Repaso de hoy</div>
      <div class="review-card-sub" id="review-card-sub">Calculando…</div>
    </div>
    <div class="review-card-arrow">→</div>
  </div>
`;
```

Insertar `reviewCardHtml` justo después de la cabecera y antes de `<main class="home-grid">`. Añadir listener:

```js
document.querySelector('.review-card').addEventListener('click', () => window.navigate('/review'));
```

Y la lógica que actualiza el sub-text con el conteo de items vencidos (después del Promise.all de los blocks):

```js
// Importar collectDueItems al inicio
import { collectDueItems } from './review-today.js';

// Después del Promise.all que actualiza las tarjetas:
const now = Date.now();
let totalDue = 0;
await Promise.all(BLOCKS.map(async block => {
  const items = await loadData(block.file);
  const due = collectDueItems(block.id, items, now);
  totalDue += due.length;
}));
const sub = document.getElementById('review-card-sub');
sub.textContent = totalDue === 0 ? '¡Sin pendientes!' : `${totalDue} ítem${totalDue === 1 ? '' : 's'} vencido${totalDue === 1 ? '' : 's'}`;
```

(Asegurarse de exportar `collectDueItems` desde review-today.js — ya lo hace en la task anterior.)

- [ ] **Step 3: CSS en `css/exercise.css`** (al final):

```css
/* ---- Repaso de hoy ---- */
.review-card {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.9rem 1.1rem;
  background: linear-gradient(135deg, var(--c-blue), var(--c-violet));
  color: white;
  border-radius: 12px;
  margin: 0 0 1rem;
  cursor: pointer;
  box-shadow: 0 2px 12px rgba(0,0,0,0.1);
  transition: transform 0.15s ease;
}
.review-card:hover {
  transform: translateY(-2px);
}
.review-card-icon { font-size: 2rem; }
.review-card-text { flex: 1; }
.review-card-title { font-weight: 700; font-size: 1.05rem; }
.review-card-sub { font-size: 0.85rem; opacity: 0.9; }
.review-card-arrow { font-size: 1.4rem; opacity: 0.85; }
.review-empty {
  text-align: center;
  padding: 3rem 1rem;
}
.review-empty-icon { font-size: 3rem; }
.review-empty h2 { margin: 0.5rem 0; }
.review-summary {
  padding: 1.5rem;
  background: var(--bg-hover);
  border: 1px solid var(--border);
  border-radius: 10px;
}
.review-total { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.6rem; }
.review-breakdown { list-style: none; padding: 0; margin: 0.4rem 0; }
.review-breakdown li { padding: 0.25rem 0; }
.review-note { color: var(--text-muted); margin-top: 1rem; }
.review-upcoming { margin-top: 2rem; }
.review-upcoming ul { padding-left: 1.2rem; }
```

- [ ] **Step 4: Manual check** — abrir `http://localhost:8765/`. Comprobar tarjeta arriba con título y texto dinámico. Click → ruta `/review` con resumen.

- [ ] **Step 5: Commit**

```
git add js/app.js js/home.js css/exercise.css
git commit -m "feat(review): tarjeta destacada 'Repaso de hoy' en home + ruta /review"
```

---

## Task A7: Docs + tag `fase-4-srs-v2`

- [ ] **Step 1: CLAUDE.md**

En la sección de Subsistemas, actualizar la descripción de `js/srs.js` para mencionar:
- Namespace ahora es `jp_n5_v2`
- Intervalos por caja (10min/1d/3d/7d/21d)
- `selectSession` prioriza vencidos > nuevos > dominados

En tabla de fases:
```
| 4-A — Infra: SRS v2 con decaimiento | ✅ | `fase-4-srs-v2` |
```

En conteo de tests, actualizar al nuevo total.

- [ ] **Step 2: spec**

Después de `## Fase 4 — Infraestructura` añadir:
```
**Estado parcial**: ✅ 4.1 SRS v2 (tag `fase-4-srs-v2`) implementada el 2026-05-17 con MIGRACIÓN REAL desde v1 (preserva caja, calcula dueAt desde lastSeen). Pantalla `/review` muestra resumen de vencidos por bloque. ⏳ 4.2 modo examen, 4.3 daily goal, 4.5 métricas tiempo pendientes. 🚫 4.4 PWA fuera de alcance (sesión aparte).
```

- [ ] **Step 3: Commit y tag**

```
git add CLAUDE.md docs/superpowers/specs/2026-05-16-mejoras-n5-design.md docs/superpowers/plans/2026-05-17-fase-4-infraestructura.md
git commit -m "docs: marcar 4.1 SRS v2 como implementada y añadir plan de Fase 4"
git tag fase-4-srs-v2
```

---

# Sub-fase B — Daily goal + racha

## Task B1: Módulo `js/daily.js` + tests TDD

**Files:**
- Create: `js/daily.js`
- Create: `test/daily.test.js`

API:
```js
export function getDailyState(now = Date.now())  // → {goal, todayCount, todayDate, streak, lastGoalDate}
export function recordPracticeTick(now = Date.now())  // → updated state, persiste
export function setGoal(n)  // configurar meta
export function todayDateString(now)  // 'YYYY-MM-DD' local
```

**Lógica streak:**
- `recordPracticeTick`: si `todayDate` no es hoy → reset `todayCount=0` y `todayDate=hoy`. Luego `todayCount++`.
- Si tras incrementar `todayCount === goal` Y `lastGoalDate !== hoy`:
  - Si `lastGoalDate === ayer` → `streak++`
  - Si `lastGoalDate !== ayer` (y no es hoy) → `streak = 1` (rota la racha, empieza nueva)
  - `lastGoalDate = hoy`
- En `getDailyState`: si `lastGoalDate` no es ni hoy ni ayer → mostrar streak como 0 (visualmente, no se modifica en storage).

- [ ] **Step 1: Crear `test/daily.test.js`**

```js
import { describe, it, assertEqual } from './runner.js';

const KEY = 'jp_n5_daily';

function dayMs(y, m, d, h = 12) {
  return new Date(y, m - 1, d, h).getTime();
}

describe('daily.todayDateString', () => {
  it('formato YYYY-MM-DD', async () => {
    const { todayDateString } = await import('../js/daily.js?c=d1');
    const ts = dayMs(2026, 5, 17);
    assertEqual(todayDateString(ts), '2026-05-17');
  });
});

describe('daily.recordPracticeTick', () => {
  it('primer tick del día', async () => {
    localStorage.removeItem(KEY);
    const { recordPracticeTick } = await import('../js/daily.js?c=d2');
    const ts = dayMs(2026, 5, 17);
    const s = recordPracticeTick(ts);
    assertEqual(s.todayCount, 1);
    assertEqual(s.todayDate, '2026-05-17');
    assertEqual(s.goal, 30);
    assertEqual(s.streak, 0);
    localStorage.removeItem(KEY);
  });

  it('al alcanzar meta sin racha previa: streak=1', async () => {
    localStorage.setItem(KEY, JSON.stringify({ goal: 3, todayCount: 2, todayDate: '2026-05-17', streak: 0, lastGoalDate: null }));
    const { recordPracticeTick } = await import('../js/daily.js?c=d3');
    const ts = dayMs(2026, 5, 17);
    const s = recordPracticeTick(ts);
    assertEqual(s.todayCount, 3);
    assertEqual(s.streak, 1);
    assertEqual(s.lastGoalDate, '2026-05-17');
    localStorage.removeItem(KEY);
  });

  it('al alcanzar meta con lastGoalDate=ayer: streak++', async () => {
    localStorage.setItem(KEY, JSON.stringify({ goal: 2, todayCount: 1, todayDate: '2026-05-17', streak: 5, lastGoalDate: '2026-05-16' }));
    const { recordPracticeTick } = await import('../js/daily.js?c=d4');
    const ts = dayMs(2026, 5, 17);
    const s = recordPracticeTick(ts);
    assertEqual(s.streak, 6);
    localStorage.removeItem(KEY);
  });

  it('al alcanzar meta con lastGoalDate hace 2 días: streak=1 (rota)', async () => {
    localStorage.setItem(KEY, JSON.stringify({ goal: 2, todayCount: 1, todayDate: '2026-05-17', streak: 5, lastGoalDate: '2026-05-15' }));
    const { recordPracticeTick } = await import('../js/daily.js?c=d5');
    const ts = dayMs(2026, 5, 17);
    const s = recordPracticeTick(ts);
    assertEqual(s.streak, 1);
    localStorage.removeItem(KEY);
  });

  it('cambio de día resetea todayCount', async () => {
    localStorage.setItem(KEY, JSON.stringify({ goal: 30, todayCount: 12, todayDate: '2026-05-16', streak: 3, lastGoalDate: '2026-05-15' }));
    const { recordPracticeTick } = await import('../js/daily.js?c=d6');
    const ts = dayMs(2026, 5, 17);
    const s = recordPracticeTick(ts);
    assertEqual(s.todayDate, '2026-05-17');
    assertEqual(s.todayCount, 1);
    localStorage.removeItem(KEY);
  });

  it('no incrementa streak en segundo tick del día post-meta', async () => {
    localStorage.setItem(KEY, JSON.stringify({ goal: 2, todayCount: 5, todayDate: '2026-05-17', streak: 3, lastGoalDate: '2026-05-17' }));
    const { recordPracticeTick } = await import('../js/daily.js?c=d7');
    const ts = dayMs(2026, 5, 17);
    const s = recordPracticeTick(ts);
    assertEqual(s.streak, 3);
    assertEqual(s.todayCount, 6);
    localStorage.removeItem(KEY);
  });
});

describe('daily.getDailyState - racha rota visualmente', () => {
  it('si lastGoalDate hace 3 días devuelve streak=0 visual', async () => {
    localStorage.setItem(KEY, JSON.stringify({ goal: 30, todayCount: 0, todayDate: '2026-05-17', streak: 5, lastGoalDate: '2026-05-14' }));
    const { getDailyState } = await import('../js/daily.js?c=d8');
    const ts = dayMs(2026, 5, 17);
    const s = getDailyState(ts);
    assertEqual(s.streak, 0);  // visual = 0
    // Pero en storage sigue siendo 5 (no se modifica)
    const raw = JSON.parse(localStorage.getItem(KEY));
    assertEqual(raw.streak, 5);
    localStorage.removeItem(KEY);
  });

  it('si lastGoalDate=ayer devuelve streak persistido', async () => {
    localStorage.setItem(KEY, JSON.stringify({ goal: 30, todayCount: 0, todayDate: '2026-05-17', streak: 5, lastGoalDate: '2026-05-16' }));
    const { getDailyState } = await import('../js/daily.js?c=d9');
    const ts = dayMs(2026, 5, 17);
    const s = getDailyState(ts);
    assertEqual(s.streak, 5);
    localStorage.removeItem(KEY);
  });
});
```

- [ ] **Step 2: Implementar `js/daily.js`**

```js
const KEY = 'jp_n5_daily';
const DEFAULT_GOAL = 30;

export function todayDateString(now) {
  const d = new Date(now);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function yesterdayString(now) {
  return todayDateString(now - 24 * 60 * 60 * 1000);
}

function readRaw() {
  const raw = localStorage.getItem(KEY);
  if (!raw) {
    return { goal: DEFAULT_GOAL, todayCount: 0, todayDate: null, streak: 0, lastGoalDate: null };
  }
  return JSON.parse(raw);
}

function writeRaw(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function getDailyState(now = Date.now()) {
  const s = readRaw();
  const today = todayDateString(now);
  const yest = yesterdayString(now);
  let visualStreak = s.streak;
  if (s.lastGoalDate !== today && s.lastGoalDate !== yest) {
    visualStreak = 0;
  }
  return { ...s, streak: visualStreak };
}

export function recordPracticeTick(now = Date.now()) {
  const s = readRaw();
  const today = todayDateString(now);
  const yest = yesterdayString(now);
  if (s.todayDate !== today) {
    s.todayDate = today;
    s.todayCount = 0;
  }
  s.todayCount += 1;
  if (s.todayCount === s.goal && s.lastGoalDate !== today) {
    if (s.lastGoalDate === yest) s.streak += 1;
    else s.streak = 1;
    s.lastGoalDate = today;
  }
  writeRaw(s);
  return s;
}

export function setGoal(n) {
  const s = readRaw();
  s.goal = n;
  writeRaw(s);
}
```

- [ ] **Step 3: Tests pasan. Commit**

```
git add js/daily.js test/daily.test.js test/index.html
git commit -m "feat(daily): módulo de meta diaria y racha con tests"
```

---

## Task B2: Integrar `recordPracticeTick` en `js/exercise.js`

**Files:**
- Modify: `js/exercise.js`

En `handleAnswer`, después de `recordAnswer`/`recordResult`, si `correct === true` llamar a `recordPracticeTick()`.

- [ ] **Step 1: Modificar `js/exercise.js`**

Añadir import al inicio:
```js
import { recordPracticeTick } from './daily.js';
```

Dentro de `handleAnswer`, después del bloque if/else de recordResult/recordAnswer y antes de `results.push`:
```js
    if (correct) recordPracticeTick();
```

- [ ] **Step 2: Commit**

```
git add js/exercise.js
git commit -m "feat(exercise): incrementar contador diario al acertar"
```

---

## Task B3: UI cabecera home + configuración en stats

**Files:**
- Modify: `js/home.js`
- Modify: `js/stats.js`
- Modify: CSS

- [ ] **Step 1: `js/home.js`** — añadir UI de daily a la cabecera

Importar al inicio:
```js
import { getDailyState } from './daily.js';
```

En `renderHome`, dentro del `<header class="home-header">`, ANTES de `<div class="home-actions">`, insertar:

```js
const ds = getDailyState();
const pct = ds.goal > 0 ? Math.min(100, Math.round((ds.todayCount / ds.goal) * 100)) : 0;
// En el HTML:
`<div class="daily-widget">
  <div class="daily-progress" style="--pct:${pct}%">
    <span class="daily-label">${ds.todayCount}/${ds.goal}</span>
  </div>
  <div class="daily-streak" title="Racha actual">🔥 ${ds.streak}</div>
</div>`
```

(Asegurar que la inserción mantiene el orden visual razonable: título — daily widget — botones de acciones.)

- [ ] **Step 2: `js/stats.js`** — añadir configuración de meta

Importar:
```js
import { getDailyState, setGoal } from './daily.js';
```

En la sección de preferencias (`<section class="stats-prefs">`), añadir DESPUÉS del toggle de romaji:

```js
const dailyState = getDailyState();
// En el HTML, dentro del section.stats-prefs:
`<div class="pref-row pref-row-col">
  <label for="pref-goal">Meta diaria de respuestas</label>
  <select id="pref-goal" class="pref-select">
    <option value="20" ${dailyState.goal === 20 ? 'selected' : ''}>20</option>
    <option value="30" ${dailyState.goal === 30 ? 'selected' : ''}>30</option>
    <option value="50" ${dailyState.goal === 50 ? 'selected' : ''}>50</option>
  </select>
</div>`
```

Y añadir listener:
```js
const prefGoal = document.getElementById('pref-goal');
if (prefGoal) {
  prefGoal.addEventListener('change', () => setGoal(parseInt(prefGoal.value)));
}
```

- [ ] **Step 3: CSS** (al final de `css/exercise.css`):

```css
/* ---- Daily widget ---- */
.daily-widget {
  display: inline-flex;
  align-items: center;
  gap: 0.7rem;
  margin-left: auto;
  margin-right: 0.5rem;
}
.daily-progress {
  position: relative;
  width: 80px;
  height: 6px;
  background: var(--bg-hover);
  border-radius: 999px;
  overflow: hidden;
}
.daily-progress::before {
  content: '';
  position: absolute;
  inset: 0;
  width: var(--pct, 0%);
  background: linear-gradient(90deg, var(--c-blue), var(--c-violet));
  transition: width 0.3s ease;
}
.daily-label {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-muted);
  top: 10px;  /* pegar debajo del bar */
  white-space: nowrap;
}
.daily-streak {
  font-size: 0.95rem;
  font-weight: 600;
}
.pref-row-col { flex-direction: column; align-items: flex-start; gap: 0.4rem; }
.pref-select { padding: 0.4rem 0.6rem; border: 1px solid var(--border); border-radius: 6px; background: var(--bg); }
```

- [ ] **Step 4: Manual check** — abrir home, verificar widget "12/30 🔥 7" o similar. Practicar algunas respuestas en cualquier bloque y volver a home → contador subió.

- [ ] **Step 5: Commit**

```
git add js/home.js js/stats.js css/exercise.css
git commit -m "feat(daily): widget en home con progreso del día y racha + configuración"
```

---

## Task B4: Docs + tag `fase-4-daily`

- [ ] **Step 1:** CLAUDE.md y spec — marcar 4.3 como implementada con tag `fase-4-daily`.

- [ ] **Step 2:** Commit + tag.

---

# Sub-fase C — Métricas de tiempo

## Task C1: Capturar tiempo por respuesta en `js/exercise.js`

**Files:**
- Modify: `js/exercise.js`

Capturar `shownAt = Date.now()` al final de `render()`. En `handleAnswer`, calcular `ms = Date.now() - shownAt` y pushearlo a `results`.

En `showSummary`, calcular `avgMs = sum(results.map(r => r.ms)) / total` y mostrarlo en la cabecera del summary: `⏱ Tiempo medio: 3.2 s`.

- [ ] **Step 1:** Localizar `render()` en `js/exercise.js`. Añadir al final (antes del último `}`): `shownAt = Date.now();`. Declarar `shownAt` arriba con los otros locales.

- [ ] **Step 2:** En `handleAnswer`: `const ms = Date.now() - shownAt;`. Cambiar `results.push({ item, correct, answer })` por `results.push({ item, correct, answer, ms })`.

- [ ] **Step 3:** En `showSummary`, antes del `container.innerHTML`:
```js
const totalMs = results.reduce((s, r) => s + (r.ms || 0), 0);
const avgMs = total > 0 ? Math.round(totalMs / total) : 0;
const avgStr = (avgMs / 1000).toFixed(1) + ' s';
```

Insertar en el HTML del summary, justo después de la línea de `summary-detail`:
```js
`<div class="summary-time">⏱ Tiempo medio: ${avgStr}</div>`
```

- [ ] **Step 4: CSS pequeño** (al final de exercise.css):
```css
.summary-time { color: var(--text-muted); margin: 0.4rem 0 0.6rem; }
```

- [ ] **Step 5: Manual check** — completar una sesión, verificar que aparece "⏱ Tiempo medio: X.Y s".

- [ ] **Step 6: Commit**

```
git add js/exercise.js css/exercise.css
git commit -m "feat(exercise): mostrar tiempo medio por respuesta en el summary"
```

---

## Task C2: Persistir media móvil por bloque

**Files:**
- Modify: `js/exercise.js` (al final de cada sesión guardar)
- Modify: `js/storage.js` (helper para media móvil)

Persistir en `localStorage` claves `jp_n5_v2.timing.<deck>` con un array circular de últimas 100 respuestas `[ms, ms, ...]`. Actualizar al final de cada sesión.

- [ ] **Step 1: `js/storage.js`** añadir:

```js
const TIMING_PREFIX = `${NS}.timing.`;
const TIMING_MAX = 100;

export function recordTimings(deck, msArray) {
  if (!msArray || msArray.length === 0) return;
  const key = `${TIMING_PREFIX}${deck}`;
  const existing = JSON.parse(localStorage.getItem(key) || '[]');
  const combined = [...existing, ...msArray].slice(-TIMING_MAX);
  localStorage.setItem(key, JSON.stringify(combined));
}

export function getAvgTiming(deck) {
  const key = `${TIMING_PREFIX}${deck}`;
  const arr = JSON.parse(localStorage.getItem(key) || '[]');
  if (arr.length === 0) return null;
  return Math.round(arr.reduce((s, x) => s + x, 0) / arr.length);
}
```

- [ ] **Step 2: `js/exercise.js`** al final de `showSummary`, después de mostrar el HTML:

```js
import { recordTimings } from './storage.js';  // añadir al inicio

// En showSummary, después de set container.innerHTML:
const msArr = results.map(r => r.ms || 0).filter(x => x > 0);
recordTimings(deck, msArr);
```

- [ ] **Step 3: Commit**

```
git add js/storage.js js/exercise.js
git commit -m "feat(storage): media móvil de tiempo por bloque (últimas 100 respuestas)"
```

---

## Task C3: Columna "Tiempo medio" en stats

**Files:**
- Modify: `js/stats.js`

- [ ] **Step 1:** Importar `getAvgTiming` desde storage.

Modificar el render de la tabla añadiendo una columna nueva DESPUÉS de "Progreso" y ANTES de la columna del botón Reset:

```js
// En el <thead>:
`<th>Tiempo medio</th>`
// En cada <tr>:
const avg = getAvgTiming(deck.id);
const avgCell = avg == null ? '—' : `${(avg / 1000).toFixed(1)} s`;
`<td>${avgCell}</td>`
```

- [ ] **Step 2: Commit**

```
git add js/stats.js
git commit -m "feat(stats): columna 'Tiempo medio' por bloque"
```

---

## Task C4: Docs + tag `fase-4-tiempo`

- [ ] CLAUDE.md, spec, commit, tag `fase-4-tiempo`.

---

# Sub-fase D — Modo examen

## Task D1: Módulo `js/exam.js` con timer y secciones

**Files:**
- Create: `js/exam.js`
- Create: `test/exam.test.js`

Modo examen = simulacro JLPT con 3 secciones cronometradas. NO toca SRS (es evaluativo). NO usa `startExercise` directamente (necesita timer y "no se puede volver atrás entre secciones").

**Estructura simplificada (v1):**
- 3 secciones consecutivas: Moji-Goi → Bunpou-Dokkai → Choukai.
- Cada sección tiene N preguntas y un timer.
- Dentro de una sección, navegación entre preguntas libre. Al acabar tiempo o al pulsar "Siguiente sección", se cierra la sección y se computa.
- Al final, pantalla de resultados con %/sección y diagnóstico.

**Composición de cada sección:**
- Moji-Goi (20 min): 12 vocab + 8 kanji = 20 preguntas.
- Bunpou-Dokkai (40 min): 9 (partículas + gramática mezclados) + 4 textos dokkai (~7 preguntas) = 16 ítems efectivos.
- Choukai (30 min): 7 listening.

Para simplificar la v1: cada sección es una lista plana de ítems con `_type` (vocab/kanji/etc.) y se renderiza con un renderer específico por tipo. Si esto se vuelve complejo, podemos reducir el alcance (p.ej., usar solo opción múltiple para todas las preguntas).

- [ ] **Step 1: Crear `test/exam.test.js`** — tests light para selección de items y formato del timer:

```js
import { describe, it, assertEqual, assert } from './runner.js';

describe('exam.pickSectionItems', () => {
  it('selecciona N items aleatorios sin repetir', async () => {
    const { pickSectionItems } = await import('../js/exam.js?c=e1');
    const items = Array.from({ length: 50 }, (_, i) => ({ id: `i${i}` }));
    const picked = pickSectionItems(items, 12);
    assertEqual(picked.length, 12);
    assertEqual(new Set(picked.map(p => p.id)).size, 12);
  });
  it('si N > items.length devuelve todos', async () => {
    const { pickSectionItems } = await import('../js/exam.js?c=e2');
    const items = [{ id: 'a' }, { id: 'b' }];
    const picked = pickSectionItems(items, 10);
    assertEqual(picked.length, 2);
  });
});

describe('exam.formatTime', () => {
  it('milisegundos a mm:ss', async () => {
    const { formatTime } = await import('../js/exam.js?c=e3');
    assertEqual(formatTime(0), '00:00');
    assertEqual(formatTime(1000), '00:01');
    assertEqual(formatTime(65000), '01:05');
    assertEqual(formatTime(20 * 60 * 1000), '20:00');
  });
});

describe('exam.diagnose', () => {
  it('señala la sección con peor rendimiento', async () => {
    const { diagnose } = await import('../js/exam.js?c=e4');
    const scores = { moji_goi: 18 / 20, bunpou_dokkai: 10 / 16, choukai: 3 / 7 };
    const d = diagnose(scores);
    assertEqual(d.worst, 'choukai');
  });
});
```

- [ ] **Step 2: Crear `js/exam.js`**

```js
import { recordPracticeTick } from './daily.js';

export const SECTIONS = [
  { id: 'moji_goi', label: 'Moji-Goi', durationMs: 20 * 60 * 1000, decks: ['vocab', 'kanji'], counts: { vocab: 12, kanji: 8 } },
  { id: 'bunpou_dokkai', label: 'Bunpou-Dokkai', durationMs: 40 * 60 * 1000, decks: ['particles', 'grammar', 'reading'], counts: { particles: 4, grammar: 5, reading: 7 } },
  { id: 'choukai', label: 'Choukai', durationMs: 30 * 60 * 1000, decks: ['listening'], counts: { listening: 7 } },
];

const FILES = {
  vocab: 'vocab-n5.json', kanji: 'kanji-n5.json',
  particles: 'particles.json', grammar: 'grammar-n5.json',
  reading: 'reading-n5.json', listening: 'listening-n5.json',
};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pickSectionItems(items, n) {
  return shuffle(items).slice(0, n);
}

export function formatTime(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function diagnose(scores) {
  let worst = null;
  let worstPct = Infinity;
  for (const [k, pct] of Object.entries(scores)) {
    if (pct < worstPct) { worstPct = pct; worst = k; }
  }
  return { worst, worstPct };
}

async function loadDeck(file) {
  const res = await fetch(`./data/${file}`);
  return await res.json();
}

async function buildSectionPool(section) {
  const pool = [];
  for (const deck of section.decks) {
    const file = FILES[deck];
    const items = await loadDeck(file);
    const want = section.counts[deck];
    const picked = pickSectionItems(items, want);
    for (const item of picked) {
      pool.push({ ...item, _deck: deck });
    }
  }
  return shuffle(pool);
}

// Estado del examen en memoria (no persiste)
const state = {
  sectionIdx: 0,
  sections: [],  // [{...section, pool, answers: []}]
  timerId: null,
  sectionStart: 0,
};

export async function start(container) {
  // Carga inicial: pre-construir las 3 secciones
  state.sectionIdx = 0;
  state.sections = [];
  container.innerHTML = '<div class="loading-screen">Preparando simulacro…</div>';
  for (const s of SECTIONS) {
    const pool = await buildSectionPool(s);
    state.sections.push({ ...s, pool, answers: new Array(pool.length).fill(null) });
  }
  renderIntro(container);
}

function renderIntro(container) {
  container.innerHTML = `
    <div class="page exam-intro">
      <header class="page-header">
        <button class="btn-icon" id="exam-back">←</button>
        <h1>Simulacro JLPT N5</h1>
      </header>
      <main>
        <div class="exam-info">
          <p>3 secciones cronometradas. No se puede volver atrás entre secciones.</p>
          <ul>
            ${SECTIONS.map(s => `<li><strong>${s.label}</strong> — ${s.durationMs / 60000} min · ${Object.values(s.counts).reduce((a,b)=>a+b,0)} preguntas</li>`).join('')}
          </ul>
          <p><small>El simulacro no afecta a tu progreso SRS. Es solo para diagnóstico.</small></p>
        </div>
        <button class="btn-primary" id="exam-start">Comenzar simulacro →</button>
      </main>
    </div>
  `;
  document.getElementById('exam-back').addEventListener('click', () => window.navigate('/'));
  document.getElementById('exam-start').addEventListener('click', () => renderSection(container));
}

function renderSection(container) {
  const section = state.sections[state.sectionIdx];
  state.sectionStart = Date.now();
  let questionIdx = 0;

  function renderQuestion() {
    const item = section.pool[questionIdx];
    const elapsed = Date.now() - state.sectionStart;
    const remaining = section.durationMs - elapsed;
    container.innerHTML = `
      <div class="page exam-section">
        <header class="exam-header">
          <div class="exam-section-label">${section.label}</div>
          <div class="exam-timer" id="exam-timer">${formatTime(remaining)}</div>
          <div class="exam-progress">${questionIdx + 1}/${section.pool.length}</div>
        </header>
        <main class="exam-body">
          <div class="exam-prompt">
            <div class="exam-deck-tag">${item._deck}</div>
            <pre class="exam-item-json">${JSON.stringify(item, null, 2).slice(0, 500)}</pre>
            <p><em>Renderer genérico — la v1 muestra el ítem en JSON. Mejoras futuras: render por tipo.</em></p>
          </div>
          <div class="exam-actions">
            <button class="btn-secondary" id="exam-skip">Saltar</button>
            <button class="btn-primary" id="exam-mark-correct">Marcar correcta</button>
            <button class="btn-secondary" id="exam-mark-wrong">Marcar incorrecta</button>
          </div>
          <div class="exam-nav">
            <button class="btn-secondary" id="exam-prev" ${questionIdx === 0 ? 'disabled' : ''}>← Anterior</button>
            <button class="btn-secondary" id="exam-next" ${questionIdx === section.pool.length - 1 ? 'disabled' : ''}>Siguiente →</button>
            <button class="btn-danger-sm" id="exam-finish-section">Cerrar sección</button>
          </div>
        </main>
      </div>
    `;
    document.getElementById('exam-mark-correct').addEventListener('click', () => { section.answers[questionIdx] = true; advance(); });
    document.getElementById('exam-mark-wrong').addEventListener('click', () => { section.answers[questionIdx] = false; advance(); });
    document.getElementById('exam-skip').addEventListener('click', () => { section.answers[questionIdx] = null; advance(); });
    document.getElementById('exam-prev').addEventListener('click', () => { questionIdx = Math.max(0, questionIdx - 1); renderQuestion(); });
    document.getElementById('exam-next').addEventListener('click', () => { questionIdx = Math.min(section.pool.length - 1, questionIdx + 1); renderQuestion(); });
    document.getElementById('exam-finish-section').addEventListener('click', () => finishSection());
  }

  function advance() {
    if (questionIdx < section.pool.length - 1) {
      questionIdx += 1;
      renderQuestion();
    } else {
      finishSection();
    }
  }

  function tickTimer() {
    const remaining = section.durationMs - (Date.now() - state.sectionStart);
    const el = document.getElementById('exam-timer');
    if (!el) return;  // Already navigated away
    el.textContent = formatTime(remaining);
    if (remaining <= 0) {
      clearInterval(state.timerId);
      state.timerId = null;
      finishSection();
    }
  }

  function finishSection() {
    if (state.timerId) { clearInterval(state.timerId); state.timerId = null; }
    state.sectionIdx += 1;
    if (state.sectionIdx >= state.sections.length) {
      renderResults(container);
    } else {
      renderSection(container);
    }
  }

  state.timerId = setInterval(tickTimer, 1000);
  renderQuestion();
}

function renderResults(container) {
  const scores = {};
  for (const sec of state.sections) {
    const correct = sec.answers.filter(a => a === true).length;
    const total = sec.pool.length;
    scores[sec.id] = total > 0 ? correct / total : 0;
  }
  const totalCorrect = Object.values(scores).reduce((s, p, i) => s + p * state.sections[i].pool.length, 0);
  const totalItems = state.sections.reduce((s, sec) => s + sec.pool.length, 0);
  const overallPct = Math.round((totalCorrect / totalItems) * 100);
  const passed = overallPct >= 63;
  const diag = diagnose(scores);

  container.innerHTML = `
    <div class="page exam-results">
      <header class="page-header">
        <h1>Resultados del simulacro</h1>
      </header>
      <main class="exam-results-body">
        <div class="exam-final-score ${passed ? 'pass' : 'fail'}">
          <div class="exam-pct">${overallPct}%</div>
          <div class="exam-verdict">${passed ? 'APROBADO ✅' : 'NO APROBADO ❌'} <small>(corte ~63%)</small></div>
        </div>
        <table class="exam-section-table">
          <thead><tr><th>Sección</th><th>Resultado</th></tr></thead>
          <tbody>
            ${state.sections.map(sec => `
              <tr>
                <td>${sec.label}</td>
                <td>${Math.round(scores[sec.id] * 100)}% (${sec.answers.filter(a => a === true).length} / ${sec.pool.length})</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="exam-diagnosis">
          <p>Tu peor sección fue <strong>${state.sections.find(s => s.id === diag.worst)?.label || diag.worst}</strong> (${Math.round(diag.worstPct * 100)}%). Practica más ese bloque.</p>
        </div>
        <button class="btn-primary" onclick="window.navigate('/')">← Volver al inicio</button>
      </main>
    </div>
  `;
}
```

(El renderer "genérico" que muestra JSON es una simplificación deliberada para la v1 del modo examen. Mejorar a renders por tipo es un nice-to-have posterior.)

- [ ] **Step 3:** Añadir test/exam.test.js al runner. Tests pasan.

- [ ] **Step 4: Commit**

```
git add js/exam.js test/exam.test.js test/index.html
git commit -m "feat(exam): simulacro JLPT con 3 secciones cronometradas (renderer genérico v1)"
```

---

## Task D2: Integración exam (ruta + botón en home + CSS)

**Files:**
- Modify: `js/app.js`, `js/home.js`
- Modify: CSS

- [ ] **Step 1: `js/app.js`** — añadir import + ruta `/exam`:

```js
import { start as startExam } from './exam.js';
// ...
    } else if (seg1 === 'exam') {
      await startExam(container);
```

- [ ] **Step 2: `js/home.js`** — botón "Simulacro N5" como tarjeta destacada (similar a "Repaso de hoy" pero estilo distinto):

Insertar después de la review-card y antes de `<main class="home-grid">`:
```js
const examCardHtml = `
  <div class="exam-card" data-path="/exam">
    <div class="exam-card-icon">📝</div>
    <div class="exam-card-text">
      <div class="exam-card-title">Simulacro JLPT N5</div>
      <div class="exam-card-sub">90 min · 43 preguntas · cronometrado</div>
    </div>
    <div class="exam-card-arrow">→</div>
  </div>
`;
```

Y el listener:
```js
document.querySelector('.exam-card').addEventListener('click', () => window.navigate('/exam'));
```

- [ ] **Step 3: CSS** (al final de exercise.css):

```css
/* ---- Modo examen ---- */
.exam-card {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.9rem 1.1rem;
  background: linear-gradient(135deg, #444, #222);
  color: white;
  border-radius: 12px;
  margin: 0 0 1rem;
  cursor: pointer;
  box-shadow: 0 2px 12px rgba(0,0,0,0.1);
  transition: transform 0.15s ease;
}
.exam-card:hover { transform: translateY(-2px); }
.exam-card-icon { font-size: 2rem; }
.exam-card-text { flex: 1; }
.exam-card-title { font-weight: 700; font-size: 1.05rem; }
.exam-card-sub { font-size: 0.85rem; opacity: 0.85; }
.exam-card-arrow { font-size: 1.4rem; opacity: 0.85; }

.exam-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.6rem 0;
  border-bottom: 1px solid var(--border);
  margin-bottom: 1rem;
}
.exam-section-label { font-weight: 700; }
.exam-timer {
  font-family: monospace;
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--c-red);
  margin: 0 auto;
}
.exam-progress { color: var(--text-muted); }
.exam-item-json {
  background: var(--bg-hover);
  padding: 0.8rem;
  border-radius: 6px;
  font-size: 0.85rem;
  overflow: auto;
  max-height: 220px;
}
.exam-deck-tag {
  display: inline-block;
  background: var(--c-blue);
  color: white;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
  margin-bottom: 0.5rem;
}
.exam-actions, .exam-nav {
  display: flex;
  gap: 0.5rem;
  margin: 0.8rem 0;
  flex-wrap: wrap;
}
.exam-final-score {
  text-align: center;
  padding: 1.5rem;
  border-radius: 12px;
  margin-bottom: 1.5rem;
}
.exam-final-score.pass { background: rgba(0,200,100,0.12); }
.exam-final-score.fail { background: rgba(200,0,0,0.10); }
.exam-pct { font-size: 3rem; font-weight: 700; }
.exam-verdict { font-size: 1.1rem; margin-top: 0.4rem; }
.exam-section-table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
.exam-section-table th, .exam-section-table td { padding: 0.5rem; text-align: left; border-bottom: 1px solid var(--border); }
.exam-diagnosis { background: var(--bg-hover); padding: 1rem; border-radius: 8px; margin: 1rem 0; }
```

- [ ] **Step 4: Manual check** — botón "Simulacro" en home → ruta `/exam` → flow completo (intro, 3 secciones, resultados).

- [ ] **Step 5: Commit**

```
git add js/app.js js/home.js css/exercise.css
git commit -m "feat(exam): tarjeta 'Simulacro JLPT N5' en home + ruta /exam"
```

---

## Task D3: Docs + tag `fase-4-examen`

- [ ] **Step 1:** CLAUDE.md y spec — 4.2 Modo examen marcado como ✅ con tag `fase-4-examen`.

- [ ] **Step 2:** Actualizar auto-memory `/home/hugo/.claude/projects/-home-hugo/memory/project_japones_n5.md`: añadir las 4 sub-fases de Fase 4 al estado.

- [ ] **Step 3:** Commit + tag `fase-4-examen`. Fase 4 cerrada.

---

## Self-review checklist (controlador)

- [x] Cobertura de spec: 4.1 SRS v2 (migración real preserva caja + dueAt + pantalla review). 4.3 Daily goal + racha. 4.5 Métricas tiempo. 🚫 4.2 Modo examen explícitamente fuera (se planificará por separado). 🚫 4.4 PWA explícitamente fuera.
- [x] Sin placeholders: cada código completo (con la excepción explícita del renderer JSON de exam.js para la v1).
- [x] Tipos coherentes: `dueAtFor(box, fromTime) → number`, `getProgress` ahora incluye `dueAt`, `recordAnswer(deck, id, correct, now?)`, `recordPracticeTick(now?)`, `getDailyState(now?)`.
- [x] Tags intermedios: `fase-4-srs-v2`, `fase-4-daily`, `fase-4-tiempo`.
- [x] TDD aplicado: srs, storage, daily, review-today todos con tests primero.
- [x] Migración robusta: marcador `jp_n5_v2_migrated` evita re-ejecuciones, función puede llamarse sin riesgo en cada arranque.
- [x] CSS variables consistentes: solo `--text-muted`, `--bg-hover`, `--border`, `--c-blue`, `--c-violet`, `--c-red`.

**Total tasks: 15** (A1-A7=7, B1-B4=4, C1-C4=4 — B4/C4 son docs/tag, así que ~13 implementaciones).
