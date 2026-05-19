# Nuevos modos de kana + expansión de contenido

**Fecha**: 2026-05-19
**Estado**: aprobado

## Contexto

El submenú de hiragana/katakana tiene 3 modos (escribir romaji, opción múltiple, inverso). Se añaden 3 modos nuevos. Además se expande el contenido de todos los bloques.

## Parte 1 — Nuevos modos de kana

### Modo 4: Audio (`kana-audio.js`)

**Objetivo**: oír el sonido sin ver el kana y elegir el carácter correcto.

- **Prompt**: audio se reproduce automáticamente al cargar la pregunta + botón 🔊 para repetir. Sin kana visible.
- **Input**: 4 botones con kana para elegir (igual que kana-reverse pero el prompt es audio, no romaji).
- **checkAnswer**: `item.kana === answer`
- **getCorrectDisplay**: `${item.kana} (${item.romaji})`
- **Deck SRS**: `hiragana` / `katakana` — mismo que los demás modos kana; los IDs son los mismos (`h_a`, etc.), el progreso se comparte.
- **Ruta**: `/hiragana/audio`, `/katakana/audio`
- **Archivo**: `js/kana/kana-audio.js`

### Modo 5: Dictado de palabras (`kana-words.js`)

**Objetivo**: ver una palabra real en kana con su traducción y escribir el romaji completo.

- **Datos**: `vocab-n5.json` filtrado en tiempo de ejecución:
  - Hiragana: `kana` compuesta íntegramente por hiragana (U+3041-U+3096) y ー/っ. Excluye entradas con `/` en kana (lecturas múltiples, romaji ambiguo).
  - Katakana: `kana` compuesta íntegramente por katakana (U+30A1-U+30F6) y ーッ.
- **Prompt**: palabra en kana (grande) + traducción en español debajo (color muted).
- **Input**: campo de texto. Normalizar `toLowerCase().trim()`. Comparar contra campo `romaji` del JSON. Para palabras con romaji compuesto (`koohii`, `resutoran`) se acepta la cadena exacta.
- **getCorrectDisplay**: `${item.romaji}`
- **Deck SRS**: `hiragana-words` / `katakana-words` — separado del bloque vocab; el ID es el `id` de la palabra (`v_inu`, etc.).
- **Ruta**: `/hiragana/words`, `/katakana/words`
- **Archivo**: `js/kana/kana-words.js`
- **Nota**: el modo katakana requiere ≥5 palabras disponibles. La expansión de vocab (Parte 2) añade ~25 loanwords katakana, por lo que ambas rutas estarán operativas desde el principio.
- **Sin selector de grupos**: las palabras no tienen `group`. Se usa `showSessionConfig` sin el parámetro `groups`.

### Modo 6: Flash rápido (`kana-flash.js`)

**Objetivo**: entrenar reconocimiento por velocidad. Variante del modo opción múltiple con auto-avance y cuenta atrás.

- **Render loop propio** (no usa el motor de `exercise.js`): más simple, sin botón Continuar.
- **Prompt**: kana grande + barra de cuenta atrás (CSS transition sobre un `div` que se encoge de 100% a 0% en 3s).
- **Input**: 4 botones romaji (igual que kana-choice).
- **Comportamiento**:
  - Al cargar cada pregunta: inicia temporizador de 3s.
  - Al responder antes del timeout: cancela el timer, registra respuesta, muestra feedback (verde/rojo) 400ms → siguiente.
  - Al expirar el timer sin respuesta: registra fallo, muestra el botón correcto destacado en rojo 400ms → siguiente.
  - Sin "Continuar", sin "Enter" para avanzar. Flujo completamente automático.
- **Deck SRS**: `hiragana` / `katakana` (mismo que kana-choice, IDs compartidos).
- **Resumen final**: pantalla simple al terminar con score (X/N) y dos botones: Inicio / Otra ronda.
- **Ruta**: `/hiragana/flash`, `/katakana/flash`
- **Archivo**: `js/kana/kana-flash.js`

### Cambios en archivos existentes

- `js/home.js` → `renderKanaMenu`: añadir 3 tarjetas nuevas a `MODES` (total 6).
- `js/app.js` → rama `hiragana/katakana`: añadir `else if (seg2 === 'audio')`, `else if (seg2 === 'words')`, `else if (seg2 === 'flash')`.
- `js/stats.js` → añadir `hiragana-words` y `katakana-words` al array `DECKS`.

### Tests nuevos

- `test/kana-words.test.js`: tests del filtro de palabras (hiragana-only, katakana-only, exclusión de `/`, palabras vacías).
- `test/kana-flash.test.js`: tests de la lógica de timer (timeout → fallo, respuesta antes del timeout → no falla, cleanup del timer al desmontar).

---

## Parte 2 — Expansión de contenido

Todos los ítems nuevos deben usar exclusivamente léxico N5 ya presente en los JSONs existentes.

### Vocabulario (`vocab-n5.json`): 134 → ~260 palabras

Categorías a ampliar:
- **Loanwords katakana** (~25): テレビ、ニュース、ホテル、バス、タクシー、カメラ、ビール、ジュース、アイスクリーム、テーブル、ドア、ノート、ペン、バッグ、スーパー、デパート、アパート、エレベーター、エアコン、シャワー、トイレ、パソコン、インターネット、メール、ゲーム.
- **Verbos comunes** (~20): 起きる、寝る、着る、脱ぐ、洗う、掃除する、料理する、運転する、泳ぐ、走る、歩く、止まる、始まる、終わる、開ける、閉める、貸す、借りる、教える、習う.
- **Adjetivos** (~15): 新しい、古い、高い、安い、長い、短い、広い、狭い、重い、軽い、難しい、易しい、おいしい、まずい、元気な.
- **Palabras útiles cotidianas** (~20): 時間、天気、天気予報、季節、春夏秋冬、朝昼夜、今朝、今夜、毎日、毎週、先週、来週、去年、来年、名前、住所、電話番号、値段、理由.
- **Categoría transporte/lugar** (~10): 電車、バス停、空港、駅、地下鉄、信号、道、橋、公園、海.

Schema sin cambios: `{id, kanji, kana, romaji, meaning_es, category}`.

### Listening (`listening-n5.json`): 40 → ~70 ítems

- 20 ítems nuevos tipo `describe` (escucha descripción → elige qué describe).
- 10 ítems nuevos tipo `response` (escucha pregunta → elige respuesta adecuada).
- Schema sin cambios: `{id, type, audio_text, question, options:[{text,correct}]}`.

### Lectura (`reading-n5.json`): 30 → ~45 textos

- 15 textos nuevos: mezcla de `short` (50-80 chars) y `medium` (100-150 chars).
- Temas: presentaciones, rutinas, tiendas, transporte, clima, familia.
- Schema sin cambios: `{id, level, title, text, furigana?, vocab_hint?[], questions:[{id,question,options:[{text,correct}]}]}`.

### Gramática (`grammar-n5.json`): 40 → ~55 patrones

- 15 patrones nuevos: ～てから、～ながら、～ほうがいい、～なければならない、～かもしれない、～と思う、～ことができる (ya existe, variantes), ～ために、～ように、～そうだ、～らしい、～はずだ、～でしょう、～てみる、～てあげる/もらう/くれる.
- Schema sin cambios: `{id, pattern, meaning_es, examples:[{jp,es}], exercise:{prompt,answer,options:[string]}}`.

### Partículas (`particles.json`): 50 → ~70 frases

- 20 frases nuevas cubriendo partículas menos frecuentes: より、ほど、だけ、しか～ない、さえ、まで、から～まで, combinaciones は+に、は+で、が+も.
- Schema sin cambios: `{id, sentence, blank_index, answer, options:[string], explanation}`.

---

## Archivos afectados (resumen)

| Archivo | Cambio |
|---|---|
| `js/kana/kana-audio.js` | nuevo |
| `js/kana/kana-words.js` | nuevo |
| `js/kana/kana-flash.js` | nuevo |
| `js/home.js` | +3 modos en `renderKanaMenu` |
| `js/app.js` | +3 rutas kana |
| `js/stats.js` | +2 decks (`hiragana-words`, `katakana-words`) |
| `test/kana-words.test.js` | nuevo |
| `test/kana-flash.test.js` | nuevo |
| `test/index.html` | +2 imports de test |
| `data/vocab-n5.json` | +~126 palabras |
| `data/listening-n5.json` | +30 ítems |
| `data/reading-n5.json` | +15 textos |
| `data/grammar-n5.json` | +15 patrones |
| `data/particles.json` | +20 frases |
| `scripts/generate-audio.py` | ejecutar tras añadir contenido JP nuevo |

## Lo que NO cambia

- Motor de ejercicios (`exercise.js`, `srs.js`, `storage.js`, `tts.js`)
- IDs existentes en ningún JSON
- Lógica del home (no hay cards nuevas, los modos kana son sub-rutas)
- Barra de progreso del home (sigue mostrando solo dominados)
