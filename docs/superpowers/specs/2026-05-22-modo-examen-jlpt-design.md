# Diseño — Modo examen JLPT N5 (fase 4-D / 4.2)

Fecha: 2026-05-22
Estado: diseño aprobado, pendiente de plan de implementación.

## Objetivo

Añadir un **simulacro JLPT N5 cronometrado** ("Simulacro JLPT N5") que reproduzca
la estructura, los tiempos y la mecánica de aprobado del examen real. Es
**evaluativo, no entrenamiento**: no escribe en el SRS ni en las métricas de
práctica.

Cierra la sub-fase 4-D del roadmap (`docs/superpowers/specs/2026-05-16-mejoras-n5-design.md`,
§4.2), que se difirió conscientemente esperando "renderers correctos por tipo en
vez de un renderer genérico cutre".

## Decisiones de producto (confirmadas con el usuario)

1. **Feedback**: solo al final. Sin ✓/✗ por pregunta; eliges respuesta y pasas.
   Nota y diagnóstico en la pantalla de resultados. Fiel al JLPT.
2. **Audio Choukai**: máx 2 reproducciones por pregunta, luego se bloquea.
3. **Navegación**: Anterior/Siguiente dentro de la sección actual (no entre
   secciones). Las respuestas se pueden cambiar mientras la sección está abierta.
4. **Corte de aprobado**: fiel al N5 real — ≥44% global **y** mínimo ~32% en cada
   uno de los dos grupos de puntuación (ver §6).

## Restricciones canónicas respetadas

- Vanilla JS, ES modules, sin build, sin dependencias.
- Solo contenido N5 ya presente en los `data/*.json`.
- UI en español.
- No se toca el motor `startExercise` (regla CLAUDE.md: nada de casos
  particulares en el motor). El examen es un orquestador aparte.
- No se modifican los `data/*.json`.

## 1. Contrato de renderers reusables

Cada bloque extrae el config de render —hoy embebido en su `runX()`— a una
función exportada, sin cambiar el comportamiento de la práctica:

```js
// vocab.js, kanji.js, particles.js, grammar.js, reading.js
export function examRenderer() {
  return { renderPrompt, renderInput, checkAnswer, getCorrectDisplay };
}
// listening.js (acepta tope de reproducciones; sin tope = práctica)
export function examRenderer({ maxPlays } = {}) { ... }
```

`runX()` lo consume con spread para no duplicar:

```js
function runJpEs(container, items, allItems) {
  startExercise(container, {
    deck: DECK, items, allItems, getItemId: it => it.id,
    ...examRenderer(),
    getPromptSpeechText: it => it.kana, getAnswerSpeechText: it => it.kana,
    menuPath: '/vocab',
  });
}
```

Renderers usados por el examen:

| Deck | Renderer | Notas |
|---|---|---|
| vocab | `examRenderer()` → JP→ES | dirección de reconocimiento (Moji-Goi) |
| kanji | `examRenderer()` | igual que práctica |
| particles | `examRenderer()` | igual que práctica |
| grammar | `examRenderer()` | igual que práctica |
| reading | `examRenderer()` | ítems = `{text, q_idx}` vía `expandTextsToItems` |
| listening | `examRenderer({ maxPlays: 2 })` | tope de audio |

**Contrato de `renderInput(item, allItems, el, onAnswer)`** (sin cambios respecto
a hoy): pinta botones `.choice-btn[data-val][data-key]`, attacha el handler de
click sobre `el`, y devuelve un `cleanup` que **solo** elimina el listener de
teclado de `document`. El examen depende de esta propiedad (§2).

## 2. `js/exam.js` — orquestador

No usa `startExercise` (flujo divergente: sin feedback inmediato, timer,
prev/next, scoring diferido). Estado en memoria, **no persiste**:

```js
{
  sections: [ { id, label, group, minutes, questions: [ { deck, item, renderer } ] } ],
  sectionIdx, questionIdx,
  answers: Map("s:q" -> valorElegido | null),
  deadlineAt,                 // Date.now() + minutes*60000 de la sección actual
  timerId,                    // setInterval handle
  cache: Map("s:q" -> { node }) // render perezoso + cacheado
}
```

### Render perezoso + cacheado (decisión clave)

Cada pregunta se renderiza la **primera** vez que se visita; su nodo DOM se
guarda en `cache`. Al navegar prev/next se **reutiliza el nodo cacheado** en vez
de re-renderizar. Esto evita:

- re-barajar las opciones al volver a una pregunta,
- re-disparar el auto-audio de Choukai,
- perder la respuesta marcada.

Tras el primer render de una pregunta, `exam.js` llama al `cleanup` del bloque
(que solo quita el keydown de `document`) e instala **un único** handler de
teclado global que enruta las teclas 1-9 al panel visible. El handler de click
del bloque vive en el nodo y sobrevive en caché.

`onAnswer(valor)` en el examen: guarda `answers["s:q"] = valor` y marca
`.selected` sobre `[data-val=valor]` dentro del panel (limpiando la selección
previa). **No avanza** — el usuario usa el botón Siguiente.

> Acoplamiento documentado: el examen asume que el `cleanup` de cada bloque solo
> elimina el listener de teclado. Es cierto en los 6 bloques actuales. Si un
> bloque futuro hiciera más en su cleanup, habría que revisar esta suposición.

## 3. Secciones, distribución y selección

| Sección | id | group | Tiempo | Preguntas |
|---|---|---|---|---|
| Moji-Goi 文字・語彙 | `moji-goi` | 1 | 20 min | 12 vocab (JP→ES) + 8 kanji = 20 |
| Bunpou-Dokkai 文法・読解 | `bunpou-dokkai` | 1 | 40 min | 5 partículas + 4 gramática + ~7 preguntas dokkai = 16 |
| Choukai 聴解 | `choukai` | 2 | 30 min | 7 listening = 7 |

**Total: 43 preguntas, ~90 min.** `group` mapea las secciones a los dos grupos
de puntuación del N5 real (§6).

`buildSections(decks)` (función pura, testeable): selecciona aleatoriamente sin
pesos SRS la cantidad indicada de cada deck. Para dokkai: elige textos y los
expande con `expandTextsToItems` hasta acumular ~7 preguntas (cap 7), agrupadas
por texto para que la navegación mantenga el contexto del texto.

## 4. Timer por sección

- Al entrar en una sección: `deadlineAt = Date.now() + minutes*60000`;
  `setInterval(1s)` pinta `formatTime(remaining)` (`mm:ss`) en la cabecera.
- A 30s restantes: aviso visual (cabecera en color warning + nota breve).
- A 0: se limpia el interval, se cierra la sección y se salta a la siguiente
  (o a resultados si era la última).
- Botón "Terminar sección" con confirmación → siguiente sección.
- **No se vuelve a una sección anterior.** Dentro de la sección, prev/next libre.

`formatTime(ms)` es función pura testeable.

## 5. Choukai — límite de audio

`listening.examRenderer({ maxPlays: 2 })`: el `renderPrompt` mantiene un contador
por pregunta (`let plays = 0`). El auto-play inicial cuenta como reproducción 1;
queda 1 repetición manual; al alcanzar 2 se deshabilitan los botones ▶ y ↻.
Como cada pregunta se renderiza una sola vez y se cachea, el contador sobrevive a
la navegación prev/next sin estado externo.

## 6. Resultados, scoring y diagnóstico

Al cerrar la 3ª sección: scoring puro con `renderer.checkAnswer(item, answers[k])`
sobre cada pregunta.

**Grupos de puntuación (fiel al N5 real):**

- **Grupo 1 — Conocimiento de lengua + Lectura** = secciones `moji-goi` +
  `bunpou-dokkai` = 36 preguntas.
- **Grupo 2 — Choukai** = sección `choukai` = 7 preguntas.

**Aprobado** (constantes nombradas en el módulo):

```
PASS_OVERALL = 0.44   // ≥44% del total (43)
PASS_GROUP   = 0.32   // ≥~32% en cada grupo (≈ 19/60 y 38/120 del examen real)
```

Aprueba si: `globalPct ≥ 44%` **Y** `grupo1Pct ≥ 32%` **Y** `grupo2Pct ≥ 32%`.

**Pantalla de resultados:**

- **% global** grande + veredicto APROBADO ✅ / NO APROBADO ❌ con los cortes
  visibles (44% global · 32% por grupo).
- Tabla por **sección cronometrada** (3 filas: aciertos/total + %), para que el
  desglose sea legible aunque el aprobado se calcule por grupos.
- Resumen de los **2 grupos** con su % y si superan el mínimo.
- **Diagnóstico**: identifica la sección con peor %, con mensaje y enlace al
  bloque de práctica correspondiente ("Revisa Choukai: 40% → practica este
  bloque").

`scoreSections(sections, answers)` y `diagnose(scored)` son funciones puras
testeables.

## 7. Integración

- **`js/app.js`**: `import { start as startExam } from './exam.js'` + ruta
  `else if (seg1 === 'exam') await startExam(container)`.
- **`js/home.js`**: tarjeta **"Simulacro JLPT N5"** a ancho completo arriba del
  grid (estilo `review-card`, transversal; no va dentro de una columna de
  sección). Sub: "90 min · 43 preguntas · cronometrado". Navega a `/exam`.
- **`css/exercise.css`**: estilos `exam-*` (intro, cabecera con timer, tabla de
  resultados, bloque de diagnóstico). Reutiliza `.choice-grid`, `.choice-btn`,
  etc. de la práctica.

## 8. Tests

`test/exam.test.js` — unidades **puras** (DOM/timer/audio se verifican en
navegador real, regla CLAUDE.md):

- `buildSections`: cuenta correcta por sección (20/16/7) y mapeo de `group`.
- `formatTime`: formateo `mm:ss` y borde en 0.
- `scoreSections`: aciertos por sección y por grupo.
- `diagnose`: detecta el bloque más flojo.

Verificación manual en navegador: intro → 3 secciones cronometradas → prev/next
dentro de sección → tope de audio en Choukai → aviso 30s → corte por tiempo →
resultados con veredicto y diagnóstico. No debe escribir SRS (comprobar que las
cajas no cambian tras un simulacro).

## 9. Fuera de alcance

- PWA (4.4) — sesión aparte.
- Persistir histórico de simulacros — el examen es efímero por ahora.
- Repaso de respuestas falladas tras el examen (más allá del diagnóstico por
  bloque) — posible mejora futura.

## 10. Cierre

Tag `fase-4-examen` al terminar. Marcar 4.2 / 4-D como ✅ en CLAUDE.md y en el
spec maestro. Con esto la fase 4 queda cerrada (salvo PWA, fuera de alcance).
