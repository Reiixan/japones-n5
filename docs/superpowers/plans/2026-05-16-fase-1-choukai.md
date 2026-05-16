# Fase 1 — Choukai (Comprensión Auditiva) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir un bloque nuevo "Comprensión auditiva" con 40 mini-diálogos de audio + pregunta multi-opción, cubriendo la sección Choukai del JLPT N5 (~30% del examen).

**Architecture:** Mismo patrón que los otros bloques (1 JSON de datos + 1 módulo JS + reuso de `exercise.js` / `srs.js` / `tts.js`). El audio se reproduce con `speak()` que ya cae al MP3 pregrabado cuando no hay voz nativa (Fase 0.6), así que solo hay que extender el script de generación para incluir las nuevas cadenas. La UI oculta la transcripción por defecto y la desvela bajo demanda con un `<details>` nativo.

**Tech Stack:** Vanilla JS (ES modules), HTML5 `<details>` para reveal, `<audio>` para fallback. Sin nuevas dependencias.

**Spec de referencia:** `docs/superpowers/specs/2026-05-16-mejoras-n5-design.md` (sección "Fase 1 — Choukai").

---

## Mapa de archivos

**Crear:**
- `data/listening-n5.json` — 40 ítems (30 describe + 10 response)
- `js/listening.js` — lógica del ejercicio

**Modificar:**
- `js/app.js` — ruta `/listening`
- `js/home.js` — tarjeta nueva en `BLOCKS` con color rosa
- `css/styles.css` — variable `--c-pink` (light + dark)
- `css/exercise.css` — estilos del prompt de listening
- `scripts/generate-audio.py` — incluir `listening-n5.json` en `collect_texts()`
- `audio/` + `audio/manifest.json` — ~40 nuevos MP3

**Sin cambios:**
- `js/exercise.js`, `js/srs.js`, `js/storage.js`, `js/tts.js`, `js/romaji.js`
- Otros bloques

---

## Tipos de ejercicio

**Tipo `describe`** (Mondai 1 adaptado, ~30 ítems): oyes una frase japonesa, eliges entre 4 opciones en español qué describe.

**Tipo `response`** (Mondai 4 adaptado, ~10 ítems): oyes una frase japonesa breve (saludo, pregunta), eliges entre 3-4 opciones en JP cuál es la respuesta natural.

---

## Task 1: Schema y 5 ítems de muestra

**Files:**
- Create: `data/listening-n5.json`

- [ ] **Step 1: Crear `data/listening-n5.json` con 5 ítems iniciales (3 describe + 2 response)**

Estos 5 sirven de smoke test del schema y la UI antes de poblar los 40 finales. Solo léxico N5 ya presente en `vocab-n5.json` / `kanji-n5.json` / `grammar-n5.json`.

```json
[
  {
    "id": "l_001",
    "type": "describe",
    "audio_text": "毎朝、コーヒーを飲みます。",
    "audio_kana": "まいあさ、コーヒーをのみます。",
    "prompt_es": "¿Qué hace esta persona cada mañana?",
    "options_es": ["Bebe café", "Bebe té", "Come pan", "Lee el periódico"],
    "answer_es": "Bebe café",
    "category": "rutina"
  },
  {
    "id": "l_002",
    "type": "describe",
    "audio_text": "学校は9時に始まります。",
    "audio_kana": "がっこうはくじにはじまります。",
    "prompt_es": "¿A qué hora empieza la escuela?",
    "options_es": ["A las 9", "A las 8", "A las 10", "A las 7"],
    "answer_es": "A las 9",
    "category": "tiempo"
  },
  {
    "id": "l_003",
    "type": "describe",
    "audio_text": "あの人は私の兄です。",
    "audio_kana": "あのひとはわたしのあにです。",
    "prompt_es": "¿Quién es esa persona?",
    "options_es": ["Mi hermano mayor", "Mi padre", "Mi amigo", "Mi profesor"],
    "answer_es": "Mi hermano mayor",
    "category": "familia"
  },
  {
    "id": "l_010",
    "type": "response",
    "audio_text": "お元気ですか。",
    "audio_kana": "おげんきですか。",
    "prompt_es": "¿Cuál es la respuesta natural?",
    "options_jp": ["はい、元気です。", "はい、学生です。", "いいえ、本です。"],
    "answer_jp": "はい、元気です。",
    "category": "saludos"
  },
  {
    "id": "l_011",
    "type": "response",
    "audio_text": "コーヒーを飲みますか。",
    "audio_kana": "コーヒーをのみますか。",
    "prompt_es": "¿Cuál es la respuesta natural?",
    "options_jp": ["はい、お願いします。", "はい、行きます。", "いいえ、土曜日です。"],
    "answer_jp": "はい、お願いします。",
    "category": "ofrecimientos"
  }
]
```

**Validación del schema:**
- Todo ítem debe tener `id`, `type`, `audio_text`, `audio_kana`, `prompt_es`, `category`.
- Si `type === "describe"` → debe tener `options_es` (array) y `answer_es` (string que esté en `options_es`).
- Si `type === "response"` → debe tener `options_jp` (array) y `answer_jp` (string que esté en `options_jp`).
- `id` único, prefijo `l_*`, 3 dígitos (001…040).

- [ ] **Step 2: Verificar JSON válido**

Ejecuta:
```bash
python3 -c "import json; data = json.load(open('/home/hugo/japones-n5/data/listening-n5.json')); print(f'{len(data)} ítems, ids únicos: {len(set(i[\"id\"] for i in data))}')"
```

Esperado: `5 ítems, ids únicos: 5`.

- [ ] **Step 3: Commit**

```bash
git -C /home/hugo/japones-n5 add data/listening-n5.json
git -C /home/hugo/japones-n5 commit -m "data: listening-n5.json con 5 ítems de muestra (schema)"
```

---

## Task 2: Extender script de audio para incluir listening + regenerar MP3

**Files:**
- Modify: `scripts/generate-audio.py`

- [ ] **Step 1: Añadir listening-n5.json a `collect_texts()` en `scripts/generate-audio.py`**

Localiza la función `collect_texts()` (líneas ~48-66 del archivo) y al final, antes del `return sorted(texts)`, añade:

```python
    for item in load_json('listening-n5.json'):
        texts.add(item['audio_text'])
```

El bloque entero queda así:

```python
def collect_texts() -> list[str]:
    texts: set[str] = set()
    for fname in ('hiragana.json', 'katakana.json'):
        for item in load_json(fname):
            texts.add(item['kana'])
    for item in load_json('vocab-n5.json'):
        texts.add(item['kana'])
    for item in load_json('kanji-n5.json'):
        texts.add(item['example_reading'])
    for item in load_json('grammar-n5.json'):
        for ex in item['examples']:
            texts.add(ex['jp'])
    for item in load_json('particles.json'):
        sentence = ''.join(
            item['answer'] if p == '[  ]' else p for p in item['parts']
        )
        texts.add(sentence)
    for item in load_json('listening-n5.json'):
        texts.add(item['audio_text'])
    return sorted(texts)
```

- [ ] **Step 2: Ejecutar el script**

```bash
cd /home/hugo/japones-n5 && python3 scripts/generate-audio.py
```

Esperado: `Por generar: 5` (los 5 nuevos audio_text de Task 1), todos OK, manifest.json crece con 5 entradas más.

- [ ] **Step 3: Verificar que los 5 MP3 nuevos existen**

```bash
python3 -c "
import json
m = json.load(open('/home/hugo/japones-n5/audio/manifest.json'))
data = json.load(open('/home/hugo/japones-n5/data/listening-n5.json'))
missing = [it['audio_text'] for it in data if it['audio_text'] not in m]
print(f'Missing: {len(missing)}')
print('\n'.join(missing) if missing else 'todos OK')
"
```

Esperado: `Missing: 0` y `todos OK`.

- [ ] **Step 4: Commit**

```bash
git -C /home/hugo/japones-n5 add scripts/generate-audio.py audio/
git -C /home/hugo/japones-n5 commit -m "feat(audio): pregrabar MP3 para listening-n5.json"
```

---

## Task 3: Módulo `js/listening.js`

**Files:**
- Create: `js/listening.js`

- [ ] **Step 1: Crear `js/listening.js`**

```js
import { startExercise, showSessionConfig } from './exercise.js';
import { selectSession } from './srs.js';
import { speak } from './tts.js';

const DECK = 'listening';

export async function start(container, allItems) {
  showSessionConfig(container, {
    title: 'Comprensión auditiva 聴解',
    subtitle: 'Escucha la frase y elige la respuesta correcta. Pulsa ▶ para escuchar las veces que quieras.',
    onStart: (size) => {
      const items = selectSession(DECK, allItems, size);
      runListening(container, items, allItems);
    },
  });
}

function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function runListening(container, items, allItems) {
  startExercise(container, {
    deck: DECK,
    items,
    allItems,
    getItemId: it => it.id,
    renderPrompt(item, el) {
      el.innerHTML = `
        <div class="listen-prompt">
          <button type="button" class="btn-listen" data-listen-text="${escapeAttr(item.audio_text)}" aria-label="Escuchar">
            <span class="listen-icon">▶</span>
            <span class="listen-label">Escuchar</span>
          </button>
          <button type="button" class="btn-listen-repeat" data-listen-text="${escapeAttr(item.audio_text)}" aria-label="Repetir" title="Repetir">↻</button>
        </div>
        <details class="listen-reveal">
          <summary>Ver texto japonés</summary>
          <div class="listen-text">${item.audio_text}</div>
          <div class="listen-kana">${item.audio_kana}</div>
        </details>
        <div class="listen-question">${item.prompt_es}</div>
      `;
      el.addEventListener('click', e => {
        const btn = e.target.closest('[data-listen-text]');
        if (!btn) return;
        e.preventDefault();
        speak(btn.dataset.listenText);
      });
      // Auto-pronunciar la primera vez al mostrar la pregunta (sin esperar al usuario).
      speak(item.audio_text);
    },
    renderInput(item, _all, el, onAnswer) {
      const isResponse = item.type === 'response';
      const opts = isResponse ? item.options_jp : item.options_es;
      const answer = isResponse ? item.answer_jp : item.answer_es;
      const options = shuffle([...opts]);

      el.innerHTML = `<div class="choice-grid listen-grid ${isResponse ? 'listen-grid-jp' : ''}">
        ${options.map((opt, i) => `
          <button class="choice-btn listen-choice" data-val="${escapeAttr(opt)}" data-key="${i + 1}">
            <span class="choice-key">${i + 1}</span>
            <span>${opt}</span>
          </button>
        `).join('')}
      </div>`;

      const keyHandler = e => {
        const tag = e.target && e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        const n = parseInt(e.key);
        if (n >= 1 && n <= options.length) {
          const btn = el.querySelector(`[data-key="${n}"]`);
          if (btn && !btn.disabled) onAnswer(btn.dataset.val);
        }
      };
      document.addEventListener('keydown', keyHandler);
      el.addEventListener('click', e => {
        const btn = e.target.closest('.choice-btn');
        if (btn && !btn.disabled) onAnswer(btn.dataset.val);
      });
      return () => document.removeEventListener('keydown', keyHandler);
    },
    checkAnswer(item, answer) {
      const correct = item.type === 'response' ? item.answer_jp : item.answer_es;
      return correct === answer;
    },
    getCorrectDisplay(item) {
      const correct = item.type === 'response' ? item.answer_jp : item.answer_es;
      return `${correct}  ·  ${item.audio_text} (${item.audio_kana})`;
    },
    // Espacio repite el audio: la frase JP. No revela respuesta porque la respuesta está
    // en otro idioma (es) o es una réplica diferente (response).
    getPromptSpeechText: item => item.audio_text,
    // Tras fallar, vuelve a sonar la frase para imprimir el patrón sonoro.
    getAnswerSpeechText: item => item.audio_text,
  });
}
```

> **Notas de diseño:**
> - El audio se reproduce automáticamente al mostrar cada pregunta (sin necesidad de tocar el botón). Esto difiere del comportamiento del flag `isAutoOn` global — aquí es intrínseco al bloque (no tiene sentido tener una pregunta de listening sin que suene).
> - La pregunta misma (audio_text) se considera el "prompt audio" para la barra espaciadora. Como las opciones están en español (describe) o son respuestas distintas en JP (response), repetir el audio no revela la respuesta.

- [ ] **Step 2: Verificar sintaxis**

```bash
node --input-type=module --check < /home/hugo/japones-n5/js/listening.js && echo OK
```

Esperado: `OK`.

- [ ] **Step 3: Commit**

```bash
git -C /home/hugo/japones-n5 add js/listening.js
git -C /home/hugo/japones-n5 commit -m "feat: js/listening.js — bloque de comprensión auditiva"
```

---

## Task 4: CSS para el bloque listening + color rosa

**Files:**
- Modify: `css/styles.css`
- Modify: `css/exercise.css`

- [ ] **Step 1: Añadir `--c-pink` a `css/styles.css`**

En el bloque `:root` (línea 2-22), justo después de `--c-teal: #0d9488;` añade:

```css
  --c-pink: #ec4899;
```

En el bloque `[data-theme="dark"]` (línea 24+), las variables de color no se redefinen (light y dark comparten la paleta), así que NO hay cambio ahí. La variable solo existe en `:root`.

- [ ] **Step 2: Añadir al final de `css/exercise.css`:**

```css
/* === Listening prompt === */
.listen-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}
.btn-listen {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--c-pink);
  color: white;
  border: none;
  border-radius: 999px;
  padding: 0.85rem 1.75rem;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.1s, opacity 0.15s;
}
.btn-listen:hover { opacity: 0.9; }
.btn-listen:active { transform: scale(0.96); }
.listen-icon { font-size: 1.2rem; }
.btn-listen-repeat {
  background: none;
  border: 1.5px solid var(--border);
  border-radius: 999px;
  width: 36px;
  height: 36px;
  font-size: 1rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}
.btn-listen-repeat:hover { background: var(--bg-hover); }

.listen-reveal {
  margin-top: 0.5rem;
  text-align: center;
}
.listen-reveal summary {
  cursor: pointer;
  font-size: 0.85rem;
  color: var(--text-muted);
  list-style: none;
  text-decoration: underline;
}
.listen-reveal summary::-webkit-details-marker { display: none; }
.listen-reveal[open] summary { color: var(--text); }
.listen-text {
  font-family: var(--font-jp);
  font-size: 1.4rem;
  margin-top: 0.5rem;
  color: var(--text);
}
.listen-kana {
  font-family: var(--font-jp);
  font-size: 1rem;
  color: var(--text-muted);
}

.listen-question {
  font-size: 1.1rem;
  font-weight: 500;
  text-align: center;
  color: var(--text);
  padding: 0.5rem 0;
}

.listen-grid { grid-template-columns: 1fr; }
.listen-choice { font-size: 1rem; padding: 0.85rem 1rem; }
.listen-grid-jp .listen-choice {
  font-family: var(--font-jp);
  font-size: 1.1rem;
}
```

- [ ] **Step 3: Commit**

```bash
git -C /home/hugo/japones-n5 add css/styles.css css/exercise.css
git -C /home/hugo/japones-n5 commit -m "style: variable --c-pink y estilos del bloque listening"
```

---

## Task 5: Integración en routing y home

**Files:**
- Modify: `js/app.js`
- Modify: `js/home.js`

- [ ] **Step 1: Añadir import y ruta en `js/app.js`**

Al inicio de `js/app.js`, donde están los imports de otros bloques (líneas 1-8), añade:

```js
import { start as startListening } from './listening.js';
```

Y después del bloque `} else if (seg1 === 'grammar') { ... }`, antes del `else { window.navigate('/'); }`, añade:

```js
    } else if (seg1 === 'listening') {
      const allItems = await loadData('listening-n5.json');
      await startListening(container, allItems);
```

- [ ] **Step 2: Añadir la tarjeta al `BLOCKS` array en `js/home.js`**

Localiza el array `BLOCKS` (líneas 3-64). Después del último bloque (grammar) y antes del `]` final, añade:

```js
  {
    id: 'listening',
    label: 'Comprensión auditiva',
    jp: '聴解',
    emoji: '🎧',
    file: 'listening-n5.json',
    desc: 'Mini-diálogos con audio',
    color: 'var(--c-pink)',
    path: '/listening',
  },
```

- [ ] **Step 3: Añadir `listening` al array `DECKS` en `js/stats.js`**

Localiza el array `DECKS` (líneas 5-12). Después del último deck (grammar), añade:

```js
  { id: 'listening', label: 'Comprensión auditiva', file: 'listening-n5.json' },
```

- [ ] **Step 4: Verificar sintaxis**

```bash
for f in /home/hugo/japones-n5/js/app.js /home/hugo/japones-n5/js/home.js /home/hugo/japones-n5/js/stats.js; do
  node --input-type=module --check < "$f" && echo "OK: $f"
done
```

Esperado: 3 líneas `OK: ...`.

- [ ] **Step 5: Commit**

```bash
git -C /home/hugo/japones-n5 add js/app.js js/home.js js/stats.js
git -C /home/hugo/japones-n5 commit -m "feat: integrar listening en routing, home y stats"
```

---

## Task 6: Generar los 35 ítems restantes (autor de contenido)

**Files:**
- Modify: `data/listening-n5.json` (añadir 35 ítems más a los 5 de Task 1)
- Modify: `audio/` + `audio/manifest.json` (regenerar tras añadir ítems)

Este task crea contenido en japonés, NO código. Quien lo ejecute necesita:
- Estar familiarizado con N5 (vocab y gramática del nivel).
- Poder consultar `data/vocab-n5.json`, `data/kanji-n5.json` y `data/grammar-n5.json` para asegurar que cada ítem usa SOLO léxico/patrones N5 ya presentes.

> **Importante:** si el subagente que ejecuta este task no es competente en japonés, escálalo (BLOCKED) — el controlador deberá hacerlo manualmente o derivarlo a un modelo más capaz.

- [ ] **Step 1: Generar 27 ítems describe adicionales (ids l_004…l_009 y l_012…l_032)**

> Hay un hueco intencional: l_010 y l_011 ya están como `response` desde Task 1. Los `describe` ocupan l_001…l_009 (3 ya) y l_012…l_032 (27 nuevos) = 30 totales.

Para cada ítem:
- Inventa una frase JP corta (8-20 caracteres) usando solo léxico N5 verificable.
- `audio_kana` = la versión 100% kana de `audio_text` (con kanji desreemplazados).
- Categoría: una de `[rutina, tiempo, familia, comida, lugares, números, escuela, trabajo, transporte, clima, compras, salud, hobbies, ropa, casa, descripción]`.
- `prompt_es`: pregunta en español que se pueda contestar con la información de la frase.
- `options_es`: 4 opciones cortas en español. La respuesta correcta debe estar SOLO en `options_es` y ser igual a `answer_es` carácter por carácter.
- Distrae con respuestas plausibles que también podrían aparecer en un examen N5 (no "absurdas").

Ejemplo de ítem nuevo (incluye este como l_004):

```json
{
  "id": "l_004",
  "type": "describe",
  "audio_text": "土曜日に映画を見ます。",
  "audio_kana": "どようびにえいがをみます。",
  "prompt_es": "¿Qué día va a ver una película?",
  "options_es": ["Sábado", "Domingo", "Lunes", "Viernes"],
  "answer_es": "Sábado",
  "category": "tiempo"
}
```

Genera los 27 ítems describe restantes con esa misma plantilla. Distribución sugerida de categorías (no estricta):
- rutina: 4
- tiempo: 4
- familia: 3
- comida: 3
- lugares: 3
- números: 2
- escuela: 2
- transporte: 2
- compras: 1
- clima: 1
- hobbies: 1
- descripción: 1

- [ ] **Step 2: Generar 8 ítems response adicionales (ids l_013…l_020)**

> Wait — los IDs reales: los response ocupan l_010, l_011 (2 ya) + nuevos l_033…l_040 (8 nuevos) = 10 totales.

Cambia el plan: los nuevos response son `l_033…l_040`, NO `l_013…l_020`. Esto evita renumerar.

Para cada ítem response:
- `audio_text`: frase JP de tipo pregunta/saludo/ofrecimiento (5-15 chars).
- `options_jp`: 3-4 respuestas en JP, una natural y las otras gramaticalmente correctas pero contextualmente incorrectas.
- `answer_jp`: la natural.
- Categoría: `[saludos, ofrecimientos, preguntas-info, despedidas, agradecimiento, disculpa, presentación]`.

Ejemplo (incluye como l_033):

```json
{
  "id": "l_033",
  "type": "response",
  "audio_text": "今、何時ですか。",
  "audio_kana": "いま、なんじですか。",
  "prompt_es": "¿Cuál es la respuesta natural?",
  "options_jp": ["3時です。", "月曜日です。", "学校にいます。"],
  "answer_jp": "3時です。",
  "category": "preguntas-info"
}
```

Genera los 8 response restantes.

- [ ] **Step 3: Verificar integridad del JSON**

```bash
python3 -c "
import json
data = json.load(open('/home/hugo/japones-n5/data/listening-n5.json'))
print(f'Total: {len(data)}')
print(f'IDs únicos: {len(set(i[\"id\"] for i in data))}')
print(f'Describe: {sum(1 for i in data if i[\"type\"]==\"describe\")}')
print(f'Response: {sum(1 for i in data if i[\"type\"]==\"response\")}')
# Verifica que answer está en options
errs = []
for it in data:
  opts = it.get('options_es') if it['type']=='describe' else it.get('options_jp')
  ans = it.get('answer_es') if it['type']=='describe' else it.get('answer_jp')
  if ans not in opts:
    errs.append(it['id'])
print(f'Errores answer not in options: {errs if errs else \"ninguno\"}')
"
```

Esperado:
```
Total: 40
IDs únicos: 40
Describe: 30
Response: 10
Errores answer not in options: ninguno
```

- [ ] **Step 4: Regenerar audio**

```bash
cd /home/hugo/japones-n5 && python3 scripts/generate-audio.py
```

Esperado: `Por generar: 35` (los 35 nuevos audio_text), todos OK al final.

- [ ] **Step 5: Commit**

```bash
git -C /home/hugo/japones-n5 add data/listening-n5.json audio/
git -C /home/hugo/japones-n5 commit -m "data: 35 ítems adicionales de listening + audio pregrabado"
```

---

## Task 7: Verificación end-to-end y tag

**Files:** ninguno (verificación manual)

- [ ] **Step 1: Pasar tests unitarios**

Abre `http://localhost:8765/test/index.html`. Esperado: **43 passed, 0 failed** (sin tests nuevos para listening — el módulo es UI sobre el motor existente).

- [ ] **Step 2: Recorrido manual en navegador**

Recorre con `http://localhost:8765/` y comprueba:

- [ ] Home tiene **7 tarjetas** ahora. La nueva "Comprensión auditiva" en rosa, emoji 🎧
- [ ] Entrar en el bloque → configuración de sesión normal (10/20/40/Todo). Sin checkboxes de grupos.
- [ ] Comenzar sesión → muestra: botón rosa grande "▶ Escuchar" + botón "↻ Repetir" + `<details>` "Ver texto japonés" + la pregunta en español
- [ ] El audio suena automáticamente al cargar cada pregunta
- [ ] Pulsar "▶ Escuchar" lo vuelve a reproducir
- [ ] Pulsar "↻ Repetir" hace lo mismo
- [ ] Pulsar barra espaciadora repite el audio (no revela respuesta)
- [ ] Click en "Ver texto japonés" despliega el kanji + kana (el de "ver texto" no afecta a poder seguir respondiendo)
- [ ] Cada opción 1/2/3/4 se puede pulsar con clic o tecla
- [ ] Al **fallar**: aparece "Respuesta: <correcta>  ·  <audio_text> (audio_kana)", suena automáticamente otra vez la frase, y la respuesta tiene `(romaji)` si el toggle de romaji está activo
- [ ] Al **acertar**: pasa a la siguiente automáticamente
- [ ] Ítems tipo `response`: las opciones se ven en JP (Noto Sans), no en español
- [ ] Stats muestra "Comprensión auditiva" en la tabla con su contador de dominados

- [ ] **Step 3: Verificar persistencia SRS**

Responde correctamente 2-3 ítems, vuelve al home y comprueba que la barra de progreso de "Comprensión auditiva" subió. Recarga la página: debe seguir subida.

- [ ] **Step 4: Tag**

```bash
git -C /home/hugo/japones-n5 tag -a fase-1 -m "Fase 1: Choukai (comprensión auditiva) — 40 ítems con audio + 2 tipos de pregunta"
```

- [ ] **Step 5: Actualizar el spec**

Edita `docs/superpowers/specs/2026-05-16-mejoras-n5-design.md`, en la sección "Fase 1 — Choukai", añade al final:

```markdown
**Estado**: ✅ Implementada el 2026-05-16 (tag `fase-1`).
```

Commit:

```bash
git -C /home/hugo/japones-n5 add docs/superpowers/specs/2026-05-16-mejoras-n5-design.md
git -C /home/hugo/japones-n5 commit -m "docs: marcar Fase 1 como implementada"
```
