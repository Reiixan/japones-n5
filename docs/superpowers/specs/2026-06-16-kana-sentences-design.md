# Spec: Lectura de oraciones kana (`kana-sentences`)

**Fecha:** 2026-06-16  
**Estado:** aprobado por usuario

## Resumen

Nuevo séptimo modo del subsistema kana que extiende la práctica más allá de palabras aisladas hacia oraciones simples, complejas y textos cortos. El ejercicio tiene dos pasos para niveles 1-2 (escribir romaji → elegir significado en MC) y un solo paso para nivel 3 (elegir significado). La progresión entre niveles es automática vía SRS.

---

## Sección 1: Arquitectura y datos

### Archivos nuevos

- `data/kana-sentences.json` — pool de ítems
- `js/kana/kana-sentences.js` — módulo del modo

### Schema de `data/kana-sentences.json`

```json
[
  {
    "id": "ks001",
    "deck": "hiragana",
    "level": 1,
    "jp": "おちゃをのみます。",
    "es": "Bebo té.",
    "romaji": "ocha wo nomimasu"
  }
]
```

Campos:
- `id`: string único estable (prefijo `ks` + número)
- `deck`: `"hiragana"` | `"katakana"` — determina en qué menú aparece el ítem
- `level`: `1` | `2` | `3`
- `jp`: oración o texto completo (nivel 3: frases separadas por `\n`)
- `es`: traducción española completa
- `romaji`: transcripción Hepburn completa (usada en feedback; en nivel 3, campo presente pero no solicitado al usuario)

### Volumen de contenido

| Nivel | Descripción | Hiragana | Katakana |
|-------|-------------|----------|----------|
| 1 | Oración simple (1 cláusula) | ~35 | ~20 |
| 2 | Oración compleja (2 cláusulas, て/から/けど) | ~30 | ~15 |
| 3 | Texto corto (3-4 frases como bloque) | ~15 | ~8 |

Base de contenido para nivel 1: las 99 frases kana-only ya presentes en `data/lessons/*.json`, filtradas y completadas. Niveles 2 y 3: frases nuevas curadas. **Restricción canónica:** todo el léxico proviene exclusivamente de `data/vocab-n5.json`, `data/kanji-n5.json`, `data/grammar-n5.json` y `data/particles.json`.

Temáticas de nivel 3 (hiragana): presentarse, el tiempo, hacer planes, describir la clase, ir de compras.  
Temáticas de nivel 3 (katakana): comida internacional, viajes, tecnología cotidiana (alta densidad de préstamos).

### Rutas

```
/hiragana/sentences  →  kana-sentences.start(container, 'hiragana')
/katakana/sentences  →  kana-sentences.start(container, 'katakana')
```

### Integraciones (archivos existentes a editar)

- `js/app.js` → añadir rama `seg2 === 'sentences'`
- `js/home.js` → añadir entrada "Lectura" al array del menú kana en `renderKanaMenu`
- `js/stats.js` → añadir decks `kana-sentences-hiragana` y `kana-sentences-katakana`

---

## Sección 2: Progresión SRS automática

### Decks SRS

- `kana-sentences-hiragana`
- `kana-sentences-katakana`

Namespace separado del resto; no interfiere con vocab, kanji ni los modos kana existentes.

### Gate de nivel

```
nivel 1 → siempre disponible
nivel 2 → se desbloquea cuando ≥80 % de ítems nivel 1 están en caja ≥ 3
nivel 3 → se desbloquea cuando ≥80 % de ítems nivel 2 están en caja ≥ 3
```

`kana-sentences.js` calcula el nivel máximo desbloqueado (`unlockedLevel`) al arrancar la sesión leyendo el estado SRS con `getState(deck, id)` de `storage.js`. `selectSession` recibe solo los ítems con `level ≤ unlockedLevel`.

Dentro del pool disponible, la priorización es la estándar de `srs.js`: vencidos → nuevos → resto por peso inverso a caja.

### Indicador en pantalla de configuración

En la pantalla previa al ejercicio (`showSessionConfig`) se añade bajo el selector de tamaño:

```
Nivel actual: 1 — Oraciones simples
Progreso hacia nivel 2: ████░░░░ 14/35 dominadas (caja ≥ 3)
```

Cuando todos los niveles están desbloqueados, se muestra "Nivel máximo alcanzado ✓". Al desbloquear un nivel nuevo se añade un mensaje de celebración en esa misma pantalla.

---

## Sección 3: Formato del ejercicio

### Niveles 1 y 2 — flujo en dos pasos

**Paso 1 — Romaji (lectura fonética):**
- Prompt: oración completa en kana con tipografía grande + botón 🔊 TTS
- Input: campo de texto libre (igual que kana-words); placeholder "romaji..."
- Validación: comparación `answer.trim().toLowerCase() === item.romaji.toLowerCase()` — sin puntuación, sin distinción de mayúsculas. El campo `romaji` en el JSON nunca incluye puntuación final (`.`, `。`) para evitar fricciones. Estándar Hepburn estricto (を → "wo", じ → "ji", づ → "zu") — el autor del JSON elige una única forma y esa es la respuesta válida.
- Si correcto: feedback verde + se renderiza inmediatamente el paso 2
- Si incorrecto: feedback rojo con el romaji correcto + se renderiza el paso 2 igualmente (el usuario sigue practicando comprensión aunque haya fallado la lectura)

**Paso 2 — Significado (comprensión):**
- 4 botones MC en grid 2×2 con la traducción española
- Distractores generados con `pickWrong(all, item, it => it.es, 3)` del mismo pool de deck
- Teclas 1-4 como atajo de teclado

**SRS:** el ítem se registra como correcto (`recordAnswer`) solo si **ambos pasos** son correctos. Fallar en cualquiera de los dos baja de caja.

### Nivel 3 — solo significado (un paso)

- Prompt: bloque de texto de 3-4 frases con interlineado amplio, separado visualmente del área de input
- Input: 4 botones MC de significado (igual que paso 2 de niveles 1/2)
- No se solicita romaji (escribir el romaji de un párrafo entero sería contraproducente)
- El campo `romaji` sigue presente en el JSON y se muestra en el feedback de respuesta correcta/incorrecta

### Feedback y resumen

- Verde/rojo inmediato al responder cada paso
- Al fallar: TTS lee la oración completa (`getAnswerSpeechText`)
- Barra espaciadora repite el audio del prompt (`getPromptSpeechText`)
- Pantalla de resumen estándar: score, lista de errores (JP + ES), botones Inicio / Otra ronda

### Implementación

El flujo de dos pasos vive íntegramente dentro de `renderInput` de `kana-sentences.js`, que gestiona su propio estado interno (fase 1 / fase 2). Solo llama a `onAnswer(selectedMeaning)` al terminar el paso 2. El motor `exercise.js` no requiere cambios.

---

## Sección 4: No en scope

- Generación automática de oraciones (todas curadas a mano)
- Modo examen de kana-sentences (fuera de alcance hasta valorarlo)
- Filtro manual de nivel por el usuario (el SRS lo gestiona solo)
- PWA / offline (fuera de alcance global)
