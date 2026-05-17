# Roadmap de mejoras para webapp Japonés N5

**Fecha**: 2026-05-16
**Autor**: Hugo + Claude (sesión de brainstorming)
**Estado**: Aprobado para implementación por fases

## Contexto

`/home/hugo/japones-n5/` es una webapp vanilla JS (sin build) para practicar JLPT N5. Sirve con `python3 -m http.server 8765`. Persistencia en localStorage con namespace `jp_n5_v1.<deck>.<id>` y SRS tipo Leitner de 5 cajas.

**Estado actual (6 bloques):**

| Bloque | Contenido | Modos |
|---|---|---|
| Hiragana | 104 ítems | typing romaji, opción múltiple, modo inverso |
| Katakana | 104 ítems | typing romaji, opción múltiple, modo inverso |
| Vocab N5 | ~134 palabras | opción múltiple JP→ES |
| Kanji N5 | 100 kanji + on/kun + ejemplo | opción múltiple kanji→sig+lecturas |
| Partículas | 50 frases | rellenar hueco |
| Gramática | 40 patrones | patrón + 2 ejemplos + ejercicio multi |

Stats globales con export/import, modo claro/oscuro, configuración de sesión (tamaño, grupos en kana).

## Objetivo

Convertir la webapp en una preparación **completa** para el JLPT N5 cubriendo las tres secciones del examen:

1. **Moji-Goi (文字・語彙)** — ya cubierto, mejoras menores
2. **Bunpou-Dokkai (文法・読解)** — gramática cubierta; **falta lectura (dokkai)**
3. **Choukai (聴解)** — **inexistente** (≈30% del examen real)

Además: SRS con decaimiento real, modo examen, daily goal, PWA, métricas de tiempo.

## Principios de diseño

- **Vanilla JS sin build**: la app sigue siendo HTML + CSS + JS nativo, ES modules, servible con `python3 -m http.server`.
- **Aditivo por fases**: cada fase añade bloques o capacidades sin tocar las existentes, salvo la Fase 4 (SRS v2) que es ruptura controlada con borrado de progreso v1.
- **Patrón establecido**: cada bloque nuevo = 1 archivo `data/*.json` + 1 módulo `js/*.js` + reuso de `exercise.js` y `srs.js`.
- **Solo léxico N5**: todo contenido nuevo (Choukai, Dokkai, verbos, adjetivos) se restringe a vocab/kanji/gramática N5 ya presente en los JSON existentes. Cero léxico fuera de nivel.
- **Audio gratis y offline-friendly**: usamos `window.speechSynthesis` (Web Speech API), no se servirán mp3.
- **Producción JP por opción múltiple**: no añadimos teclado IME ni escritura libre.
- **Sin backend, sin cuentas, sin sync**: persistencia sigue siendo localStorage, sync por export/import manual.
- **Idioma de UI**: español. Sin i18n.
- **Alcance estricto N5**: no añadimos kanji/vocab/gramática de niveles superiores.

## Roadmap (5 fases)

| Fase | Nombre | Sección JLPT |
|---|---|---|
| 0 | Quick wins (TTS + vocab reverso) | Moji-Goi |
| 1 | Choukai (comprensión auditiva) | Choukai (≈30%) |
| 2 | Dokkai (lectura) | Dokkai (≈25%) |
| 3 | Bunpou completo (verbos, adjetivos, kanji en contexto) | Bunpou |
| 4 | Infraestructura (SRS v2, modo examen, daily goal, PWA, métricas) | Transversal |

Cada fase es independiente y se planifica con su propio `writing-plans` cuando llegue su turno.

---

## Fase 0 — Quick wins

**Estado**: ✅ Implementada el 2026-05-16 (tag `fase-0`). Incluye además los extras 0.5 (romaji toggle), 0.6 (audio MP3 pregrabado como fallback de Web Speech) y 0.7 (cancel-prev / auto-pronounce wrong / spacebar repeat / romaji en feedback / botón cambiar modo).

### 0.1 Audio TTS

Utilidad nueva `js/tts.js` que envuelve `window.speechSynthesis`:

```js
// API tentativa
import { speak, isAvailable } from './tts.js';
speak('まいあさ、コーヒーをのみます。');  // voz ja-JP, no bloqueante
isAvailable();  // true si hay voz ja-JP cargada
```

- Selección de voz una sola vez al cargar, preferencia: `Google 日本語` > `Kyoko` > cualquier `ja-JP`.
- Manejar el caso de Safari iOS / móviles donde las voces se cargan async via `voiceschanged`.
- Si no hay voz `ja-JP` disponible, mostrar aviso una vez (dismissible, persistido en localStorage) y desactivar botones 🔊 (sin reventar).

**Integración en bloques existentes:**
- Hiragana / Katakana: botón 🔊 en el prompt lee el kana.
- Vocab: botón 🔊 lee `item.kana`.
- Kanji: botón 🔊 lee `item.example_reading`.
- Gramática: cada ejemplo (`item.examples[].jp`) con su botón 🔊 propio.
- Partículas: botón 🔊 lee la oración completa con la partícula correcta intercalada.

**Ajuste de preferencia** en Fase 0: flag `jp_n5_tts_auto` en localStorage (default `false`) accesible desde un toggle en la pantalla de Stats — "Auto-pronunciar al mostrar prompt". Si está activo, `speak()` se llama automáticamente al renderizar el prompt en los bloques con audio.

### 0.2 Vocab reverso ES→JP

Modificación del bloque Vocabulario. Pasa a tener pantalla intermedia de selección de modo (igual que kana):

- **JP → ES** (actual): prompt en JP, opciones en ES.
- **ES → JP** (nuevo): prompt `meaning_es`, opciones en `kana` (con `kanji` pequeño debajo).

**Decisión SRS**: caja única por palabra. Acertar en cualquiera de los dos modos sube la caja; fallar baja a 0. La clave en localStorage sigue siendo `jp_n5_v1.vocab.<id>`.

### Archivos afectados (Fase 0)

- **Nuevo**: `js/tts.js`
- **Modificados**: `js/home.js` (botón de auto-pronunciar opcional), `js/vocab.js` (menú de modo + nuevo modo reverso), `js/kana/*.js` (botón 🔊 en typing/choice/reverse), `js/kanji.js`, `js/grammar.js`, `js/particles.js`, `css/exercise.css` (estilos del botón 🔊).
- **Sin cambios**: `js/srs.js`, `js/storage.js`, datos.

### Riesgo principal

TTS asíncrono en algunos navegadores. Mitigado con wrapper que espera `voiceschanged` con timeout.

---

## Fase 1 — Choukai (comprensión auditiva)

**Estado**: ✅ Implementada el 2026-05-16 (tag `fase-1`). 40 ítems totales (30 describe + 10 response), audio pregrabado para todos via el script `scripts/generate-audio.py`.

### Tipos de ejercicio (cubrimos 2 de los 4 del N5)

1. **Mondai 1 adaptado (describe)**: oyes una frase, eliges entre 4 opciones en español qué describe.
2. **Mondai 4 adaptado (respuesta natural)**: oyes una frase, eliges entre 3-4 respuestas en JP cuál es la natural continuación.

### Esquema de datos (`data/listening-n5.json`)

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
    "id": "l_010",
    "type": "response",
    "audio_text": "お元気ですか。",
    "audio_kana": "おげんきですか。",
    "prompt_es": "¿Cuál es la respuesta natural?",
    "options_jp": ["はい、元気です。", "はい、学生です。", "いいえ、本です。"],
    "answer_jp": "はい、元気です。",
    "category": "saludos"
  }
]
```

Validación al cargar: si `type === "describe"` debe tener `options_es` y `answer_es`; si `type === "response"` debe tener `options_jp` y `answer_jp`.

### UI del ejercicio

- Prompt **sin transcripción visible** (entrenar el oído de verdad).
- Botón grande `▶ Escuchar` con TTS.
- Botón `↻ Repetir` (en modo normal: ilimitado; en modo examen: 1-2 veces máx).
- Botón `Ver texto` que despliega `audio_text` + `audio_kana` (solo si el usuario lo pide).
- Tras responder, en feedback **siempre** aparecen `audio_text`, `audio_kana` y traducción ES para aprender del error.

### Contenido inicial

30-40 ítems generados durante la implementación de la fase, restringidos a vocab/kanji/gramática N5 ya presente en los JSON existentes.

### Limitación conocida

La voz TTS robotizada no transmite entonación humana real. Sigue siendo útil para vocabulario + estructura, pero no es Choukai 100% equivalente al examen. Limitación aceptada.

### Archivos afectados (Fase 1)

- **Nuevo**: `data/listening-n5.json`, `js/listening.js`
- **Modificados**: `js/app.js` (ruta nueva), `js/home.js` (tarjeta nueva), `css/exercise.css` (estilos botones audio).

---

## Fase 2 — Dokkai (lectura)

**Estado**: ✅ Implementada el 2026-05-17 (tag `fase-2`). 30 textos (20 short + 10 medium) con furigana opcional persistido en localStorage, vocabulario sugerido colapsable y SRS por texto (fallar cualquier pregunta del texto baja la caja a 0). Nuevo hook `recordResult` añadido a `js/exercise.js` para soportar agregación SRS por grupo.

### Tipos de ejercicio (cubrimos 2 de los 3 del N5)

1. **Texto corto** (~50-80 caracteres JP, 1 pregunta).
2. **Texto medio** (~150-250 caracteres JP, 2-3 preguntas).

### Esquema de datos (`data/reading-n5.json`)

```json
[
  {
    "id": "r_001",
    "type": "short",
    "title_es": "El fin de semana de Yamada",
    "text_jp": "山田さんは土曜日に映画を見ました。日曜日は友達とレストランで昼ご飯を食べました。",
    "text_ruby": [
      {"base": "山田", "ruby": "やまだ"},
      {"base": "さんは", "ruby": null},
      {"base": "土曜日", "ruby": "どようび"},
      {"base": "に", "ruby": null},
      {"base": "映画", "ruby": "えいが"},
      "..."
    ],
    "vocabulary_hints": [
      {"jp": "映画", "kana": "えいが", "es": "película"}
    ],
    "questions": [
      {
        "q_es": "¿Qué hizo Yamada-san el sábado?",
        "options_es": ["Vio una película", "Cenó con amigos", "Estudió japonés", "Fue al parque"],
        "answer_es": "Vio una película"
      }
    ]
  }
]
```

### UI

- Texto japonés grande (Noto Sans JP ya cargado).
- Toggle "Mostrar furigana" — **off por defecto**. Cuando se activa, renderiza con HTML `<ruby><rt>` los pares `text_ruby`.
- Toggle "Vocabulario sugerido" — colapsa/expande la lista de hints.
- Bajo el texto, las preguntas en español con opción múltiple. Se contestan en orden si hay varias.
- Sin tiempo límite por defecto. En modo examen, sí.

### SRS

Caja Leitner **por texto**, no por pregunta. Si fallas cualquier pregunta del texto, baja a 0. Si aciertas todas, sube +1. Clave: `jp_n5_v1.reading.<id>`.

### Contenido inicial

20 textos cortos + 10 medios. Mismo principio: solo léxico N5 ya presente.

### Archivos afectados (Fase 2)

- **Nuevo**: `data/reading-n5.json`, `js/reading.js`
- **Modificados**: `js/app.js` (ruta nueva), `js/home.js` (tarjeta nueva), `css/exercise.css` (estilos `ruby`, layout de texto largo).

---

## Fase 3 — Bunpou completo

**Estado parcial**: ✅ 3.1 Verbos (tag `fase-3-verbos`, 60 verbos × 8 formas, `js/conjugation.js`) y ✅ 3.2 Adjetivos (tag `fase-3-adjetivos`, 45 adjetivos i/な × 3-4 formas, `js/adjective-forms.js`) implementadas el 2026-05-17. ⏳ 3.3 Kanji-contexto pendiente.

### 3.1 Verbos (bloque nuevo)

**Datos** (`data/verbs-n5.json`):

```json
[
  {
    "id": "vb_taberu",
    "dict": "食べる",
    "dict_kana": "たべる",
    "group": "ichidan",
    "meaning_es": "comer",
    "forms": {
      "masu": "食べます",
      "masen": "食べません",
      "mashita": "食べました",
      "masen_deshita": "食べませんでした",
      "te": "食べて",
      "ta": "食べた",
      "nai": "食べない",
      "nakatta": "食べなかった"
    }
  }
]
```

`group` ∈ {`godan`, `ichidan`, `irregular`}.

**Ejercicio**: ver verbo en dict + grupo + forma pedida → elegir entre 4 opciones (1 correcta + 3 distractores plausibles, p.ej. aplicar mal la regla del otro grupo).

**Tamaño**: 60-80 verbos N5.

**SRS**: caja por verbo (no por forma). Mezcla aleatoria de forma pedida en cada repetición.

### 3.2 Adjetivos (bloque nuevo)

**Datos** (`data/adjectives-n5.json`):

```json
[
  {
    "id": "aj_takai",
    "jp": "高い",
    "kana": "たかい",
    "type": "i",
    "meaning_es": "caro / alto",
    "forms": {
      "negative": "高くない",
      "past": "高かった",
      "negative_past": "高くなかった"
    }
  },
  {
    "id": "aj_kirei",
    "jp": "きれい",
    "kana": "きれい",
    "type": "na",
    "meaning_es": "bonito / limpio",
    "forms": {
      "negative": "きれいじゃない",
      "past": "きれいだった",
      "negative_past": "きれいじゃなかった",
      "noun_form": "きれいな"
    }
  }
]
```

`type` ∈ {`i`, `na`}.

**Ejercicio**: ver adjetivo + tipo + forma pedida → 4 opciones. Para な-adjetivos incluir caso "+ sustantivo" (`きれいな + はな`).

**Tamaño**: 40-50 adjetivos.

### 3.3 Kanji en contexto (mejora del bloque existente)

Modificar `js/kanji.js` para que el prompt no muestre solo el carácter aislado:

- Antes: `<div class="kanji-display">食</div>`
- Después: kanji grande **+ frase de ejemplo** debajo usando `example_word` / `example_reading` (esos campos ya existen en `kanji-n5.json`).

Opciones siguen siendo `[significado + lecturas]`. La caja SRS no cambia.

### Esquema de IDs

Para evitar colisión con vocab (`v_*`):
- Verbos: `vb_*`
- Adjetivos: `aj_*`
- Vocab: sigue siendo `v_*` (sin cambios)

### Archivos afectados (Fase 3)

- **Nuevos**: `data/verbs-n5.json`, `data/adjectives-n5.json`, `js/verbs.js`, `js/adjectives.js`
- **Modificados**: `js/app.js`, `js/home.js` (2 tarjetas nuevas), `js/kanji.js` (prompt con ejemplo), `css/exercise.css`.

---

## Fase 4 — Infraestructura

### 4.1 SRS v2 con decaimiento temporal

**Cambios en `js/storage.js` y `js/srs.js`:**

- Nuevo formato: `{ box: 0..4, lastSeen, correct, wrong, dueAt }` (añade `dueAt`).
- Intervalos por caja:
  - Box 0 → 10 minutos
  - Box 1 → 1 día
  - Box 2 → 3 días
  - Box 3 → 7 días
  - Box 4 → 21 días
- En `recordAnswer`: tras subir/bajar caja, recalcular `dueAt = now + intervalo`.
- En `selectSession`: priorizar ítems con `dueAt <= now`, luego ítems nuevos (sin lastSeen), luego dominados con peso bajo.

**Namespace v2**: `jp_n5_v2.<deck>.<id>`. En la primera carga de la app con código v2:
1. Detectar si existen claves `jp_n5_v1.*`.
2. Mostrar aviso una vez (dismissible, persistido como `jp_n5_v2_migrated`): *"Hemos renovado el sistema de repaso. Tu progreso anterior se reinicia. Si quieres conservarlo, exporta antes desde Estadísticas."*
3. Tras confirmar, borrar todas las claves `jp_n5_v1.*`.

**Pantalla nueva: "Repaso de hoy"** — accesible desde home. Recoge ítems vencidos (`dueAt <= now`) cruzando todos los bloques y los presenta en una sesión mezclada usando el motor `exercise.js`. Si no hay nada vencido: mensaje motivacional + opción "Ver lo siguiente que toca" (próximos 5 ítems por `dueAt`).

### 4.2 Modo examen JLPT cronometrado

**Botón "Simulacro N5"** en home. Estructura del examen real (versión post-2020):

| Sección | Tiempo | Distribución de preguntas |
|---|---|---|
| Moji-Goi | 20 min | 12 vocab + 8 kanji = 20 |
| Bunpou-Dokkai | 40 min | 9 partículas/gramática + 4 dokkai (textos cortos+medios, ~7 preguntas) = 16 |
| Choukai | 30 min | 7 listening (mezcla de tipos) = 7 |

**Comportamiento:**
- Reloj visible en cabecera por sección.
- No se puede volver atrás entre secciones (sí entre preguntas dentro de la sección, salvo Choukai donde cada audio se reproduce 2 veces máx y luego se bloquea).
- Al pasar el tiempo de una sección: aviso "30s restantes", luego corta al cumplirse el límite.
- Al final: nota por sección (% + corte aprobado vs no aprobado tipo JLPT, 38/60 ≈ 63%) y diagnóstico de qué bloque fue peor ("revisa Choukai: 40% → practica este bloque").
- **No persiste** en SRS — el simulacro es evaluativo, no entrenamiento.

### 4.3 Daily goal + racha

**Datos en localStorage** (clave `jp_n5_daily`):

```json
{
  "goal": 30,
  "todayCount": 12,
  "todayDate": "2026-05-16",
  "streak": 7,
  "lastGoalDate": "2026-05-15"
}
```

**Lógica:**
- Al registrar una respuesta correcta: si `todayDate` no es el día actual, primero resetear `todayCount = 0` y actualizar `todayDate`. Luego `todayCount += 1`.
- Al alcanzar `goal` por primera vez en el día: si `lastGoalDate` es ayer → `streak += 1`; si no es ayer y no es hoy → `streak = 1` (racha rota, empieza nueva); actualizar `lastGoalDate = today`.
- En la carga del home, si `lastGoalDate` existe y no es ni ayer ni hoy → mostrar racha como 0 (rota), pero no la borramos del storage hasta que el usuario cumpla meta de nuevo.

**UI:**
- En cabecera del home: círculo de progreso "Hoy: 12/30" + número de racha "🔥 7".
- Configurable en ajustes: meta de 20/30/50 (default 30).
- Aviso visual ("🔥 ¡Estás a punto de perder tu racha de N días!") cuando faltan <3h del día y aún no cumpliste meta.

### 4.4 PWA

- **Nuevo**: `manifest.webmanifest` con `name`, `short_name`, `start_url`, `display: standalone`, `theme_color`, iconos (192x192, 512x512 — generar con un kanji "日" o emoji 🇯🇵 sobre fondo).
- **Nuevo**: `service-worker.js` con estrategia **cache-first** para HTML/CSS/JS/JSON estáticos. Cache versionado (`jp_n5_cache_v1`); al actualizar versión, invalida y refetchea.
- **Modificado**: `index.html` añade `<link rel="manifest">` y registro del SW en `js/app.js`.
- Botón "📲 Instalar app" en home cuando el navegador dispara `beforeinstallprompt` (se guarda el evento y se muestra el botón hasta que el usuario instala o rechaza).

### 4.5 Métricas de tiempo

**Modificación en `js/exercise.js`:**
- Por cada respuesta, calcular `ms = answeredAt - shownAt`. No se guarda por ítem en localStorage (sería ruido); solo agregado por sesión.
- En `showSummary`: añadir "⏱ Tiempo medio: 3.2 s" junto al porcentaje.
- En `js/stats.js`: añadir columna "Tiempo medio" por bloque (calculado durante la sesión actual + persistido en `jp_n5_v2.timing.<deck>` como media móvil de últimas 100 respuestas).

### Archivos afectados (Fase 4)

- **Nuevos**: `manifest.webmanifest`, `service-worker.js`, `js/daily.js`, `js/exam.js`, `js/review-today.js`
- **Modificados**: `js/storage.js` (formato v2 + migración), `js/srs.js` (intervalos), `js/exercise.js` (métricas tiempo), `js/home.js` (cabecera con daily goal + tarjetas "Repaso de hoy" y "Simulacro"), `js/stats.js` (columnas tiempo), `index.html` (manifest + SW), `js/app.js` (rutas + registro SW), `css/styles.css` (cabecera daily, modal de aviso migración).

---

## Decisiones transversales

### Pantalla de inicio renovada (en Fase 1 conforme crecen las tarjetas)

Tras todas las fases serán **11 elementos** en home. Reorganizar en 3 grupos visuales:

- **Lectura**: Hiragana, Katakana, Kanji
- **Comprensión**: Vocab, Partículas, Gramática, Verbos, Adjetivos, Dokkai, Choukai
- **Práctica global**: Repaso de hoy, Simulacro N5

Cabecera del home: daily goal + racha + botones de Stats / Tema (como hoy).

### Convención de IDs

| Bloque | Prefijo |
|---|---|
| Hiragana | `h_*` |
| Katakana | `k_*` |
| Vocab | `v_*` |
| Kanji | `kj_*` |
| Partículas | `p_*` |
| Gramática | `g_*` |
| Listening | `l_*` |
| Reading | `r_*` |
| Verbs | `vb_*` |
| Adjectives | `aj_*` |

### Generación de contenido

Para Choukai, Dokkai, Verbos y Adjetivos: contenido generado durante la implementación de cada fase, restringido al léxico N5 ya presente en los JSON existentes. Sin léxico fuera de nivel.

### Lo que NO hacemos (alcance excluido)

- No tocamos build/herramientas: sigue siendo vanilla JS sin build.
- No añadimos backend ni sync entre dispositivos (export/import manual basta).
- No añadimos cuentas de usuario.
- No añadimos i18n: español como único idioma de UI.
- No añadimos teclado IME ni reconocimiento de escritura (stroke order, dibujar kanji).
- No añadimos contenido N4 o superior.
- No añadimos integración con servicios externos (Wanikani, Anki, etc.).

## Estrategia de implementación

Cada fase se planifica con un `writing-plans` independiente cuando llegue su turno. El orden recomendado de ejecución es 0 → 1 → 2 → 3 → 4. Las fases 0, 1, 2 y 3 son aditivas y no rompen nada existente. La fase 4 reinicia el progreso (decisión consciente y comunicada al usuario).

Tras cada fase: probar manualmente en navegador (chrome + firefox + móvil) los flujos golden path y al menos un edge case por bloque nuevo.
