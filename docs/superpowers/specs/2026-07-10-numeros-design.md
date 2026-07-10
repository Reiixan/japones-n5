# Bloque de práctica de números (数字) — Design Spec

Fecha: 2026-07-10

## Contexto

`vocab-n5.json` ya incluye los dígitos base 1–10, 100, 1000 y 10.000 bajo la
categoría "números", practicados dentro del bloque genérico de vocabulario
(flashcards JP↔ES). `grammar-n5.json` menciona contadores (本・枚・匹・台・冊) y
patrones interrogativos (いくら／いくつ／何人) como conceptos gramaticales
sueltos, sin ejercicio dedicado.

Lo que falta es practicar la **lectura de números compuestos**: cardinales
más allá de los dígitos sueltos (11, 35, 250, 1998...), contadores
(助数詞) con sus lecturas irregulares, horas y fechas — el núcleo real de
dificultad del sistema numérico japonés en N5, que no es tan simple como en
español porque hay cambios fonéticos irregulares en varios puntos.

## Alcance

Un bloque nuevo **"Números"** (`数字`) con tres tipos de contenido generado
dinámicamente (no dataset fijo de ítems):

1. **Cardinales** — números arábigos 1–9999.
2. **Contadores (助数詞)** — cantidad (1–99) + uno de 10 contadores estándar
   N5: つ (genérico), 人 (personas), 枚 (planos), 本 (cilíndricos), 匹
   (animales pequeños), 台 (máquinas/vehículos), 冊 (libros), 歳 (edad), 階
   (pisos), 円 (yenes/precios).
3. **Horas** — 1–12.
4. **Fechas** — día del mes 1–31.

Estas 4 categorías son seleccionables por checkboxes en la pantalla de
configuración de cada modo (todas marcadas por defecto), igual que el
patrón de "grupos" que ya usa `hiragana`/`katakana`.

## Decisión clave: sin dataset de ítems fijos, sin integración SRS

A diferencia del resto de bloques, este NO tiene un `data/<deck>.json` con
ítems e IDs estables. Los números se generan aleatoriamente en cada sesión
porque el espacio de combinaciones (cardinales 1–9999 × contadores × horas
× fechas) es demasiado grande para curar un dataset fijo con sentido.

Consecuencia: no hay caja SRS (Leitner) por ítem individual.

- **Sí** cuenta para la racha diaria: `exercise.js` llama a
  `recordPracticeTick()` internamente en cada respuesta correcta,
  independientemente del deck, así que esto funciona sin cambios.
- **No** aparece en la pantalla de Stats con % de acierto por deck ni en
  "vencidos hoy" (`review-today.js`): el módulo pasa `recordResult: () =>
  {}` (no-op) a `startExercise`, de forma que nunca se escribe en el
  namespace `jp_n5_v2.numbers.*`. El deck `numbers` **no** se añade al
  array `DECKS` de `js/stats.js`.

## Arquitectura y archivos

Sigue el patrón de helpers puros ya establecido por
`adjective-forms.js`/`conjugation.js` (reglas de conjugación sin estado,
importadas por el módulo del bloque):

- **`js/numbers-rules.js`** (nuevo) — funciones puras sin estado:
  - `cardinalToKana(n)` — 1–9999. Compone miles + centenas + decenas +
    unidades con las excepciones fonéticas documentadas del japonés:
    - 百 (hyaku): 3百→さんびゃく, 6百→ろっぴゃく, 8百→はっぴゃく (resto
      regular: 100=ひゃく, 2=にひゃく, 4=よんひゃく, 5=ごひゃく,
      7=ななひゃく, 9=きゅうひゃく).
    - 千 (sen): 3千→さんぜん, 8千→はっせん (resto regular).
  - `counterReading(n, counterId)` — 1–99. Tabla de excepciones 1–10 por
    contador (cada contador tiene su propio patrón de sokuon/dakuten,
    p.ej. 本: 1本=いっぽん, 3本=さんぼん, 6本=ろっぽん, 8本=はっぽん,
    10本=じ​っぽん／じゅっぽん) + composición regular para 11–99
    reutilizando `cardinalToKana` para la parte de decenas.
  - `hourReading(h)` — 1–12. Excepciones: 4時→よじ (no よんじ), 7時→しちじ
    (no ななじ), 9時→くじ (no きゅうじ). Resto regular (nº + じ).
  - `dayOfMonthReading(d)` — 1–31. Tabla completa de excepciones 1–10
    (irregulares: ついたち, ふつか, みっか, よっか, いつか, むいか,
    なのか, ようか, ここのか, とおか) + 14→じゅうよっか, 20→はつか
    (totalmente irregular), 24→にじゅうよっか. Resto regular (nº + にち).
  - Cada función devuelve `{ kana, romaji }`.
  - `randomDistractors(correctValue, kind, counterId?)` — genera 3 valores
    distractores plausibles mezclando vecinos numéricos (±1, ±10) con
    variantes que aplican mal una excepción fonética conocida cercana al
    valor real (p.ej. si el valor real usa よん para 4, ofrecer una opción
    que aplique mal し en esa posición).
  - `generateSessionItems(categories, size, counters)` — genera `size`
    ítems sintéticos mezclando las categorías marcadas (`cardinal` /
    `counter` / `hour` / `date`), cada uno con forma `{ id, kind, value,
    counterId?, kana, romaji, distractors }`. Función compartida por los 3
    modos (evita duplicar la lógica de mezcla/generación en cada archivo
    de `js/numbers/`).

- **`data/numbers.json`** (nuevo) — únicamente el catálogo léxico de los 10
  contadores: `{ id, kanji, meaning_es }`. NO contiene combinaciones
  número+contador (esas se generan con `numbers-rules.js`). Se usa como
  `allItems` para el modo de contadores (fuente de qué contadores existen
  y su significado en español).

- **`js/numbers/`** (nuevo, carpeta) — submenú de 3 modos, cada uno en su
  propio archivo, mismo patrón que `js/kana/`:
  - `numbers-reading.js` — modo 1: número/expresión → elegir lectura.
  - `numbers-audio.js` — modo 2: escuchar lectura → elegir número/expresión.
  - `numbers-recognize.js` — modo 3: lectura en kana → elegir número/expresión.

  Cada archivo expone `start(container, allItems)` (recibe el catálogo de
  contadores como `allItems`), usa `showSessionConfig` con `groups` para
  las 4 categorías, y en `onStart(size, selectedGroups)` llama a
  `generateSessionItems(selectedGroups, size, allItems)` de
  `numbers-rules.js`. El `id` sintético de cada ítem solo satisface el
  contrato de `getItemId` de `exercise.js`; no tiene relación con SRS.

## Modos de práctica (detalle)

**Modo 1 — Número → lectura** (`numbers-reading.js`)
- Prompt: la expresión en kanji/arábigo (35 / 三本 / 4時 / 2日).
- Input: 4 botones con lecturas en kana (1 correcta + 3 de
  `randomDistractors`).
- `getPromptSpeechText`: null (no se pronuncia el prompt, es visual).
- `getAnswerSpeechText`: la lectura correcta, para auto-pronunciar al fallar.

**Modo 2 — Escuchar → número** (`numbers-audio.js`)
- Prompt: botón de audio que reproduce `speak(kanaCorrecta)`.
- Input: 4 botones con expresiones (kanji/arábigo), 1 correcta + 3
  distractoras (vecinos numéricos con su propia forma correcta).
- Barra espaciadora repite el audio (`getPromptSpeechText` = lectura
  correcta).

**Modo 3 — Lectura → número** (`numbers-recognize.js`)
- Prompt: la lectura en kana.
- Input: 4 botones con expresiones (kanji/arábigo), 1 correcta + 3
  distractoras.
- Inverso del modo 1.

Los 3 modos comparten la generación de ítems vía
`generateSessionItems` (ver arriba); cada archivo de `js/numbers/` solo
difiere en `renderPrompt`/`renderInput`/`checkAnswer` (qué se muestra y
qué se pide elegir).

## Integración (los 3 archivos de siempre + 1)

- **`js/app.js`** — rama `else if (seg1 === 'numbers')`, con `seg2` como
  modo (`reading` / `audio` / `recognize`), igual que hiragana/katakana.
- **`js/home.js`** — nueva entry en `BLOCKS` (`id: 'numbers'`, label
  "Números", jp "数字", desc "Cardinales, contadores, horas y fechas"),
  añadida a `SECTIONS` bajo el grupo "Vocabulario". Nueva función
  `renderNumbersMenu(container)` análoga a `renderKanaMenu`, listando los
  3 modos.
- **`js/stats.js`** — **sin cambios** (no se añade a `DECKS`, ver decisión
  clave arriba).
- **`scripts/generate-audio.py`** — se añade `data/numbers.json` a
  `collect_texts()` para pre-generar audio MP3 de los 10 nombres de
  contadores sueltos (cadenas fijas y finitas). Las lecturas compuestas
  generadas al vuelo (cardinales, horas, fechas, contador+cantidad)
  **no** se pre-generan como MP3 — dependen de Web Speech API en tiempo
  real.

## Limitación conocida: audio del modo "Escuchar"

Con rango 1–9999 para cardinales, el espacio de combinaciones es
demasiado grande para pre-generar audio MP3 exhaustivo (a diferencia del
resto de la app, donde todo audio JP tiene fallback MP3 pregrabado). El
modo "Escuchar → número" dependerá de que el navegador tenga una voz
`ja-JP` instalada (Web Speech API). En dispositivos sin esa voz (típico en
Linux, según ya documentado en `js/tts.js`), este modo específico sonará
degradado o silencioso. Se documenta como limitación conocida en
`CLAUDE.md`, igual que ya existe la nota sobre iOS Safari y audio
automático.

## Testing

- **`test/numbers-rules.test.js`** (nuevo) — tests unitarios puros sobre
  las 4 funciones de `numbers-rules.js`:
  - Casos regulares representativos de cada rango (cardinales, contador,
    hora, fecha).
  - Cada excepción fonética documentada explícitamente: 300/600/800,
    3000/8000 (cardinales); 1/3/6/8/10 de al menos 2 contadores distintos
    con patrones de sokuon distintos (本 y otro); horas 4/7/9; fechas
    1–10, 14, 20, 24.
- Verificación manual en navegador de los 3 modos (UI, audio, distractores
  no repetidos ni iguales a la respuesta correcta) — requerido por
  CLAUDE.md para lógica dependiente de DOM/Web APIs, no basta con trazar
  a mano.

## Fuera de alcance (YAGNI)

- Horas con minutos (4時30分) y sufijos 午前/午後 — no pedido, añade
  complejidad de composición sin estar en el alcance acordado.
- Persistencia de qué categorías se practicaron más o estadísticas
  agregadas de sesión — descartado explícitamente a favor de la opción
  más simple (solo racha diaria).
- Modo examen JLPT: no se integra con `js/exam.js` en esta fase.
