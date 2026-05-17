# Guía del proyecto japones-n5

Webapp personal de Hugo para preparar el JLPT N5. Vanilla JS sin build, servida con `python3 -m http.server`. Pensada para usarse en escritorio y móvil (en LAN). Sin backend ni cuentas: el progreso vive en `localStorage` del navegador.

## Arquitectura en 30 segundos

Tres capas, todas viven en el navegador:

1. **Datos** — `data/*.json`: un fichero por bloque (hiragana, katakana, vocab, kanji, partículas, gramática, listening, reading, verbs, adjectives). IDs estables; el SRS y los stats dependen de ellos.
2. **Módulo del bloque** — `js/<bloque>.js`: un módulo por bloque que expone `start(container, allItems)`. No implementa el motor; configura hooks y delega.
3. **Motor compartido** — `js/exercise.js` (loop de pregunta/respuesta/feedback), `js/srs.js` (Leitner 5 cajas en `localStorage`), `js/tts.js` (audio japonés con fallback MP3). Lo reutilizan todos los bloques.

Añadir un bloque = añadir un `data/*.json` + un `js/<bloque>.js` + 3 ediciones de integración (ver "Patrón canónico de un bloque" más abajo). No tocar el motor para casos particulares; usar los hooks de la config.

## Servir

```bash
cd /home/hugo/japones-n5 && python3 -m http.server 8765 --bind 0.0.0.0
```

- Local: `http://localhost:8765/`
- LAN (móvil en la misma WiFi): `http://<IP-del-Latitude>:8765/`
- Tests: `http://localhost:8765/test/`

## Restricciones canónicas

Estas son **inviolables salvo que el usuario lo pida explícitamente**:

1. **Vanilla JS, sin build, sin npm**. ES modules nativos. Cero dependencias en runtime.
2. **Sin backend, sin cuentas, sin sync**. Progreso solo en `localStorage`; export/import manual a JSON.
3. **Solo contenido N5**. Cualquier ítem nuevo (vocab, ejemplo, frase) debe usar exclusivamente léxico/patrones ya presentes en `data/vocab-n5.json`, `data/kanji-n5.json`, `data/grammar-n5.json`, `data/particles.json`.
4. **Idioma de UI: español**. Sin i18n.
5. **No IME ni reconocimiento de escritura**. Producción JP por opción múltiple.
6. **No tocar `data/*.json` existentes salvo para añadir ítems**. El SRS y los stats dependen de IDs estables.

## Patrón canónico de un bloque

Cada bloque (hiragana, katakana, vocab, kanji, partículas, gramática, listening) sigue el mismo patrón:

```
data/<deck>.json     ← array de objetos con id único
js/<deck>.js         ← módulo que expone `start(container, allItems)`
```

El módulo del bloque NO implementa el motor — llama a `startExercise(container, config)` (`js/exercise.js`) con una config de hooks:

```js
import { startExercise, showSessionConfig } from './exercise.js';
import { selectSession, pickWrong } from './srs.js';
import { speak } from './tts.js';

export async function start(container, allItems) {
  showSessionConfig(container, {
    title: '...',
    subtitle: '...',
    onStart: (size) => {
      const items = selectSession('<deck>', allItems, size);
      runBlock(container, items, allItems);
    },
  });
}

function runBlock(container, items, allItems) {
  startExercise(container, {
    deck: '<deck>',
    items,
    allItems,
    getItemId: it => it.id,
    renderPrompt(item, el) { /* HTML del prompt */ },
    renderInput(item, all, el, onAnswer) { /* opciones, return cleanup */ },
    checkAnswer(item, answer) { /* bool */ },
    getCorrectDisplay(item) { /* texto */ },
    getPromptSpeechText: item => '...',  // opcional: barra espaciadora repite este texto
    getAnswerSpeechText: item => '...',  // opcional: auto-pronunciar al fallar
    menuPath: '/<deck>',                  // opcional: si tiene submenú de modos
  });
}
```

Mira `js/listening.js` como referencia más reciente y completa, o `js/vocab.js` para el patrón de submenú de modos.

Para integrar un bloque nuevo hay que tocar **3 archivos** además del nuevo módulo:
- `js/app.js` → añadir ruta `else if (seg1 === '<deck>')`
- `js/home.js` → añadir entry al array `BLOCKS`
- `js/stats.js` → añadir entry al array `DECKS`

## Subsistemas

### `js/tts.js` — pronunciación japonesa

`speak(text)` reproduce JP por dos caminos en orden de preferencia:

1. **Web Speech API** con voz `ja-JP` nativa (preferencias: Google 日本語 > Kyoko > Otoya > Hattori).
2. **Fallback a MP3 pregrabado** desde `audio/<sha1>.mp3` indexado en `audio/manifest.json`.

Esto garantiza que el audio funcione en cualquier dispositivo sin depender de voces del sistema (en Linux las voces ja-JP raramente están instaladas; el fallback resuelve el problema).

`renderSpeakButton(text)` devuelve HTML de un botón 🔊 con `data-tts-text`. `attachSpeakHandler(rootEl)` instala UN listener delegado en `rootEl` (idempotente) que escucha clicks en cualquier `.btn-tts` descendiente y llama a `speak(btn.dataset.ttsText)`.

Velocidad de reproducción: 0.85 para mejor vocalización.

Toggle "Auto-pronunciar" persistido en `localStorage['jp_n5_tts_auto']`. Acceso vía `isAutoOn()` / `setAutoOn()`.

### `scripts/generate-audio.py` — generación de MP3

Script Python (stdlib only) idempotente que:
1. Recolecta todas las cadenas JP únicas de los `data/*.json`.
2. Para cada una sin MP3, descarga uno via la TTS gratis de Google Translate (`translate.google.com/translate_tts`).
3. Lo guarda en `audio/<sha1_de_la_cadena>.mp3` y actualiza `audio/manifest.json` con `texto → archivo`.

**Ejecutar tras cualquier cambio de contenido JP**:
```bash
cd /home/hugo/japones-n5 && python3 scripts/generate-audio.py
```

Para incluir un JSON nuevo en la cobertura, editar `collect_texts()` en el script y añadir un bucle.

### `js/romaji.js` — conversor kana → romaji

Función `kanaToRomaji(text)` (Hepburn) soporta hiragana, katakana, dakuten, handakuten, yōon, sokuon (っ), chōonpu (ー) y la regla n'+vocal/y. Kanji y otros caracteres pasan tal cual (limitación: textos mixtos kanji+kana se romanizan parcialmente).

Toggle "Mostrar romaji" persistido en `localStorage['jp_n5_romaji_on']`. Aplica en vocab (campo `romaji` del JSON ya existente) y kanji (convierte `example_reading` que es kana puro). En gramática y partículas NO se aplica porque contienen kanji y la conversión parcial es peor que nada.

### `js/srs.js` + `js/storage.js` — Leitner 5 cajas con decaimiento temporal (v2)

Namespace **`jp_n5_v2.<deck>.<id>`** (migrado desde v1 al cargar la app vía `migrateV1ToV2()`, que preserva la caja y calcula `dueAt = lastSeen + intervalo`). Schema: `{box, lastSeen, correct, wrong, dueAt}`.

Intervalos por caja: 10 min / 1 día / 3 días / 7 días / 21 días.

`selectSession(deck, items, size, now?)` prioriza: (1) vencidos (`dueAt <= now`, los más viejos primero), (2) nuevos (`lastSeen == null`, shuffled), (3) resto por peso inverso a caja. Tras cada respuesta, `recordAnswer(deck, id, correct, now?)` actualiza caja, lastSeen y dueAt.

Vocab JP→ES y vocab ES→JP comparten clave por palabra (acertar en cualquier modo sube la caja). Dokkai usa SRS por texto (`recordResult` en exercise.js).

### `js/exercise.js` — motor compartido

`startExercise(container, config)` orquesta la sesión: muestra cabecera con progreso + streak, llama a `renderPrompt` y `renderInput` por cada ítem, muestra feedback ✓/✗, gestiona auto-pronounce al fallar, barra espaciadora repite audio del prompt, romaji opcional en el feedback de respuesta correcta, y al final muestra pantalla resumen con score + lista de errores + botones Inicio/Cambiar modo (si `menuPath`)/Otra ronda.

`showSessionConfig(container, {title, subtitle, groups?, onStart})` muestra la pantalla previa con selector de tamaño (10/20/50/Todo) y, opcionalmente, checkboxes de grupos (solo lo usa kana para filtrar base/dakuten/handakuten/yōon).

## Tests

Runner casero en `test/`:
- `test/index.html` — abre esta URL en navegador para ejecutar la suite
- `test/runner.js` — define `describe`/`it`/`assert`/`assertEqual`/`run`
- `test/<modulo>.test.js` — un archivo por módulo testeado

Convenciones:
- Cada test importa `tts.js` o `romaji.js` dinámicamente con `?cache=<id>` único para forzar un módulo fresco (los ES modules cachean por URL).
- Para mockear globales como `window.speechSynthesis` (getter-only), usar `Object.defineProperty(window, 'speechSynthesis', { value: mock, configurable: true })`. La asignación directa `window.speechSynthesis = ...` falla en navegadores reales.
- **Toda lógica que dependa de `window.*` / DOM / Web APIs debe verificarse en navegador real, no solo trazándola a mano** — un trace mental no detecta diferencias entre la especificación y la implementación de cada navegador.

Estado actual: 145 tests pasando. Para ejecutar: servir y abrir `http://localhost:8765/test/`.

**Cómo correr un test concreto**: el runner no soporta filtros desde la URL. Toda la suite se ejecuta al cargar `test/index.html`. Para enfocarte en uno, edita el `.test.js` correspondiente y comenta los `it(...)` o `describe(...)` que no quieres ejecutar (o renómbralos a `xit`/`xdescribe` — no existen como helpers nativos, así que comentar es lo más simple). Acuérdate de revertirlo antes de commitear.

## Estado de fases (roadmap completo en `docs/superpowers/specs/2026-05-16-mejoras-n5-design.md`)

| Fase | Estado | Tag |
|---|---|---|
| 0 — Quick wins (TTS + vocab reverso) | ✅ | `fase-0` |
| 0.5 — Romaji toggle (extra) | ✅ | (incluido en `fase-0`) |
| 0.6 — Audio MP3 pregrabado (extra) | ✅ | (incluido en `fase-0`) |
| 0.7 — 5 pulidos finales (extra) | ✅ | (incluido en `fase-0`) |
| 1 — Choukai (comprensión auditiva) | ✅ | `fase-1` |
| 2 — Dokkai (lectura) | ✅ | `fase-2` |
| 3-A — Bunpou: verbos | ✅ | `fase-3-verbos` |
| 3-B — Bunpou: adjetivos | ✅ | `fase-3-adjetivos` |
| 3-C — Bunpou: kanji-contexto | ✅ | `fase-3-kanji` |
| 4-A — Infra: SRS v2 con decaimiento | ✅ | `fase-4-srs-v2` |
| 4-B — Infra: daily goal + racha | ✅ | `fase-4-daily` |
| 4-C — Infra: métricas tiempo | ✅ | `fase-4-tiempo` |
| 4 — Infraestructura (SRS v2, modo examen, daily goal, PWA) | ⏳ | — |

Planes de implementación detallados en `docs/superpowers/plans/`.

## Workflow recomendado en sesiones futuras

1. **Para añadir contenido a un bloque existente**: editar el `data/*.json` correspondiente, ejecutar `scripts/generate-audio.py` si añadiste cadenas JP nuevas, commit.
2. **Para añadir un bloque nuevo**: leer el spec maestro + el plan de un bloque similar (p.ej. el de Choukai). Seguir el patrón canónico de arriba. Plan de implementación nuevo en `docs/superpowers/plans/`.
3. **Para una fase del roadmap**: brainstorming + spec breve (si el roadmap necesita matices) + plan en `docs/superpowers/plans/YYYY-MM-DD-fase-N-<nombre>.md` → ejecutar con subagent-driven-development y tag al final (`fase-N`).
4. **Commits**: estilo conventional (feat / fix / style / docs / data). Cada commit pequeño y enfocado.

## Pendientes conocidos

- **Adaptación a móvil**: se intentó en sesión del 2026-05-16 con CSS media queries + `clamp(dvh)` + `:has()`, pero el kana se seguía cortando al abrir teclado en Brave/Chromium móvil. Se revirtió todo. Para retomar: usar Visual Viewport API + JS, no solo CSS dvh (en algunos Chromium móviles dvh no se actualiza con el teclado virtual).
- **iOS Safari y bloqueo de audio automático**: la primera pregunta de listening puede no sonar sola hasta que el usuario interactúe una vez con la página. Limitación del navegador, no del código.
