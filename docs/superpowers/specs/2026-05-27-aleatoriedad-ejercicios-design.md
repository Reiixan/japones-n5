# Spec: Aleatoriedad en ejercicios

**Fecha:** 2026-05-27  
**Estado:** Aprobado

---

## Resumen

Dos mejoras independientes de aleatoriedad en la webapp japones-n5:

1. **"Otra ronda" con selección nueva del SRS** — al reintentar cualquier sesión de práctica, el motor vuelve a llamar al SRS en lugar de repetir los mismos ítems en el mismo orden.
2. **Pool de ejercicios en lecciones** — cada lección pasa de tener ~7 preguntas fijas a tener ~50, mostrando solo N al azar en cada visita.

---

## Parte 1 — "Otra ronda" con nueva selección SRS

### Problema actual

En `exercise.js`, el botón "Otra ronda" de la pantalla resumen hace:
```js
document.getElementById('sum-retry').addEventListener('click', () => {
  idx = 0; streak = 0; results = [];
  render();
});
```
Reutiliza el array `items` intacto: mismos ítems, mismo orden.

### Solución: `getItems` factory en la config de `startExercise`

**`exercise.js`** — cambios:
- Aceptar `getItems?: () => Item[]` en la config además de `items?: Item[]`.
- Al iniciar la sesión: `let items = config.getItems ? config.getItems() : config.items`.
- Al pulsar "Otra ronda": si existe `config.getItems`, llamar a `config.getItems()` para obtener ítems frescos; si no, barajar los existentes (fallback retrocompatible).
- `items` pasa de `const` a `let` dentro de `startExercise`.

**Todos los módulos que llaman a `startExercise`** (~12 archivos):

Cambio por módulo: en la función `runBlock` (o equivalente), capturar los parámetros de selección en el closure y cambiar `items:` por `getItems:`.

```js
// Antes
const items = selectSession(deck, filtered, size);
startExercise(container, { items, ... });

// Después
startExercise(container, {
  getItems: () => selectSession(deck, filtered, size),
  ...
});
```

Archivos afectados:
- `js/kana/kana-typing.js`
- `js/kana/kana-reverse.js`
- `js/kana/kana-flash.js`
- `js/kana/kana-choice.js`
- `js/kana/kana-audio.js`
- `js/kana/kana-words.js`
- `js/vocab.js` (modos jp-es y es-jp)
- `js/kanji.js`
- `js/particles.js`
- `js/grammar.js`
- `js/verbs.js`
- `js/adjectives.js`
- `js/listening.js`

`reading.js` no usa `startExercise` (motor propio) → no se toca.  
`exam.js` no usa `startExercise` → no se toca.

### Compatibilidad

Si un módulo no pasa `getItems` (ni se actualiza), el comportamiento nuevo es barajar los ítems actuales al reintentar — ya es mejor que el comportamiento original (mismos ítems, mismo orden).

---

## Parte 2 — Pool de ejercicios en lecciones

### Problema actual

Cada archivo `data/lessons/lXX-*.json` contiene ~7 ejercicios que se muestran siempre todos y en el mismo orden. No hay variedad entre visitas.

### Solución: Pool grande + selección aleatoria

#### Datos

- Cada archivo de lección pasa de ~7 a ~50 ejercicios en el mismo array JSON.
- El formato de cada ejercicio no cambia (`exercise-mc`, `exercise-tf`, `exercise-gap`).
- Los 7 ejercicios actuales quedan dentro del pool sin distinción; todos compiten igual.
- `data/lessons/index.json`: añadir campo `"exerciseCount": N` a cada entrada. Si el campo no existe, el código usa 5 como valor por defecto.

Distribución de `exerciseCount` aprobada:

| ID | Lección | exerciseCount |
|----|---------|---------------|
| l01 | Hiragana | 5 |
| l02 | Katakana | 5 |
| l03 | Saludos | 5 |
| l04 | Números | 7 |
| l05 | Cópula | 5 |
| l06 | Partículas | 10 |
| l07 | Verbos -masu | 10 |
| l08 | Adjetivos | 7 |
| l09 | Demostrativos | 5 |
| l10 | Existencia | 5 |
| l11 | Forma て | 10 |
| l12 | Deseos/Negación | 7 |
| l13 | Partículas extra | 10 |
| l14 | Interrogativos | 7 |
| l15 | Contadores | 10 |
| l16 | Kanji | 7 |

#### Código (`lessons.js`)

En `renderLesson`, tras filtrar `exerciseBlocks`:

```js
// Antes
const exerciseBlocks = blocks.filter(b => b.type.startsWith('exercise-'));

// Después
const allExercises = blocks.filter(b => b.type.startsWith('exercise-'));
const exerciseCount = meta.exerciseCount ?? 5;
const exerciseBlocks = shuffle(allExercises).slice(0, exerciseCount);
```

Añadir función `shuffle` local (Fisher-Yates) en `lessons.js`.

#### Contenido generado por IA

- ~43 preguntas nuevas por cada una de las 16 lecciones ≈ 700 preguntas en total.
- Mix de tipos: `exercise-mc` (opción múltiple), `exercise-tf` (verdadero/falso), `exercise-gap` (rellenar hueco).
- Todo el contenido debe usar exclusivamente léxico y patrones del N5 ya presentes en los `data/*.json` existentes.
- Las preguntas se añaden directamente al array de cada `lXX-*.json`, sin campo adicional.

---

## Restricciones respetadas

- Vanilla JS, sin build, sin npm.
- Sin backend, sin cuentas.
- Solo contenido N5.
- UI en español.
- IDs de `data/*.json` existentes no se modifican (solo se añaden ejercicios nuevos a los JSON de lecciones, que no tienen IDs de SRS).

---

## Archivos modificados (resumen)

| Archivo | Tipo de cambio |
|---------|---------------|
| `js/exercise.js` | Motor: soporte para `getItems` factory + retry con nueva selección |
| `js/kana/kana-typing.js` | Pasar `getItems` en lugar de `items` |
| `js/kana/kana-reverse.js` | Idem |
| `js/kana/kana-flash.js` | Idem |
| `js/kana/kana-choice.js` | Idem |
| `js/kana/kana-audio.js` | Idem |
| `js/kana/kana-words.js` | Idem |
| `js/vocab.js` | Idem |
| `js/kanji.js` | Idem |
| `js/particles.js` | Idem |
| `js/grammar.js` | Idem |
| `js/verbs.js` | Idem |
| `js/adjectives.js` | Idem |
| `js/listening.js` | Idem |
| `js/lessons.js` | Añadir shuffle + selección aleatoria de N ejercicios del pool |
| `data/lessons/index.json` | Añadir campo `exerciseCount` por lección |
| `data/lessons/l01-hiragana.json` … `l16-kanji.json` | Añadir ~43 ejercicios nuevos por archivo |
