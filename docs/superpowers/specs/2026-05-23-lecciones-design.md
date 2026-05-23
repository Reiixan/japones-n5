# Spec: Sistema de Lecciones (Libro interactivo)

**Fecha:** 2026-05-23
**Estado:** aprobado

## Resumen

Sistema de lecciones tipo libro integrado en la webapp N5. Lecciones independientes con orden recomendado, contenido narrativo con ejemplos intercalados y ejercicios al final. Progreso persistido en localStorage.

---

## 1. Estructura de datos

### Índice — `data/lessons/index.json`

Array de objetos ordenados (orden recomendado de estudio):

```json
[
  {
    "id": "l01-hiragana",
    "title": "Hiragana: vocales y primeros sonidos",
    "topic": "escritura",
    "estimatedMin": 10
  }
]
```

Campos:
- `id` — slug único, usado como clave de progreso y nombre de archivo
- `title` — título visible al usuario
- `topic` — categoría (escritura / vocabulario / gramática / comprensión)
- `estimatedMin` — tiempo estimado en minutos

### Lección — `data/lessons/<id>.json`

Array de bloques secuenciales. Cada bloque tiene `type` y los campos que corresponden a ese tipo:

#### Tipos de bloque

**`text`** — párrafo narrativo en Markdown básico
```json
{ "type": "text", "md": "El **hiragana** es uno de los tres sistemas de escritura..." }
```

**`example`** — ejemplo con japonés, traducción y romaji opcional
```json
{ "type": "example", "jp": "こんにちは", "es": "Hola", "romaji": "Konnichiwa" }
```

**`table`** — tabla con cabeceras y filas
```json
{ "type": "table", "headers": ["Kana", "Romaji", "Ejemplo"], "rows": [["あ","a","あめ (lluvia)"],["い","i","いぬ (perro)"]] }
```

**`note`** — callout informativo
```json
{ "type": "note", "md": "Los kana no tienen acento tónico en japonés." }
```

**`exercise-mc`** — opción múltiple (1 respuesta correcta)
```json
{ "type": "exercise-mc", "prompt": "¿Cómo se escribe 'a' en hiragana?", "options": ["あ","ア","亜","い"], "answer": "あ" }
```

**`exercise-tf`** — verdadero / falso
```json
{ "type": "exercise-tf", "statement": "か se pronuncia 'ka'.", "answer": true }
```

**`exercise-gap`** — rellenar hueco con opciones (no escritura libre)
```json
{ "type": "exercise-gap", "prompt": "Buenos días: ___", "options": ["おはようございます","こんにちは","さようなら","ありがとう"], "answer": "おはようございます", "hint": "empieza por お" }
```

Todos los textos JP y vocabulario deben usar solo léxico presente en los JSON de datos existentes (`vocab-n5.json`, `kanji-n5.json`, `grammar-n5.json`, `particles.json`).

---

## 2. Módulo JS y navegación

### Archivos nuevos
- `js/lessons.js` — renderiza índice y lecciones individuales
- `css/lessons.css` — estilos propios, no modifica `exercise.css` ni `styles.css`

### Rutas (en `app.js`)
- `#/lessons` → índice de lecciones
- `#/lessons/<id>` → lección individual

### Renderizado del índice

Lista de tarjetas. Cada tarjeta muestra:
- Número de orden y título
- Categoría (topic) y tiempo estimado
- Indicador de estado: ○ pendiente / ◑ en curso / ● completada

### Renderizado de una lección

Carga todos los bloques en una sola página con scroll (no paginado). Los ejercicios aparecen inline con feedback inmediato al seleccionar. Al responder todos los ejercicios del final, aparece:
- Puntuación (X / Y correctas)
- Botón "Marcar como completada"
- Enlace a la siguiente lección

### Micro-parser Markdown (`parseMd`)

Función interna de ~40 líneas en `lessons.js`. Soporta:
- `**texto**` → `<strong>`
- `*texto*` → `<em>`
- `` `código` `` → `<code>`
- Doble newline → nuevo párrafo
- Líneas que empiezan por `- ` → `<ul><li>`

Sin dependencias externas. No soporta anidado complejo ni tablas (las tablas tienen su propio tipo de bloque).

### Integración con el home

Nueva tarjeta en el array `BLOCKS` de `home.js`:
- Label: "Lecciones"
- JP: レッスン
- Desc: "X / Y completadas" (calculado al vuelo)
- Path: `/lessons`
- Color: `var(--c-violet)` (o el que quede mejor en la paleta)

---

## 3. Progreso y almacenamiento

### Namespace localStorage

`jp_n5_lesson.<id>` → `{ status, lastBlock }`

- `status`: `"started"` | `"completed"`
- `lastBlock`: índice entero del último bloque visible (para restaurar posición al volver)

### Funciones (todas en `js/lessons.js`)

- `getLessonProgress(id)` → `{ status, lastBlock }` | `null`
- `setLessonStarted(id, blockIndex)` → escribe `started` + posición; se llama al abrir la lección (blockIndex=0) y se actualiza al hacer scroll hasta nuevos bloques
- `setLessonCompleted(id)` → escribe `completed`

### Racha diaria

Los ejercicios de una lección llaman a `recordExercise(n)` de `daily.js` al completar la lección (donde `n` = número de ejercicios respondidos). Esto los integra en la meta diaria y la racha.

### Sin SRS

Los ejercicios de lección son de comprensión inmediata. No alimentan el sistema Leitner. Para repaso espaciado el usuario usa los bloques de práctica existentes.

---

## 4. Estilo visual (`css/lessons.css`)

### Layout
- Ancho máximo: 680px, centrado con `margin: 0 auto`
- Padding horizontal: 1.5rem en desktop, 1rem en móvil
- El resto de la app usa ancho completo; las lecciones son la excepción deliberada

### Bloques
| Tipo | Estilo |
|---|---|
| `text` | Párrafo, `line-height: 1.7`, fuente base |
| `example` | Tarjeta con `background: var(--c-surface)`, JP en 1.4rem, ES en gris, romaji small |
| `table` | Tabla con `border-collapse: collapse`, cabecera en negrita, celdas con padding |
| `note` | `border-left: 3px solid var(--c-blue)`, fondo levemente tintado |
| `exercise-*` | Estética inline coherente con ejercicios actuales, sin pantalla completa |

### Indicadores de estado en el índice
- ○ pendiente: círculo vacío, color `--text-light`
- ◑ en curso: semicírculo, color `--c-orange`
- ● completada: círculo lleno, color `--c-green`

### Responsive
El ancho máximo acotado hace que el layout funcione en móvil sin media queries adicionales.

---

## 5. Contenido inicial (8 lecciones)

| # | ID | Título | Ejercicios al final |
|---|---|---|---|
| 1 | `l01-hiragana` | Hiragana: vocales y primeros sonidos | 3 mc + 2 tf |
| 2 | `l02-katakana` | Katakana: para palabras extranjeras | 3 mc + 2 tf |
| 3 | `l03-saludos` | Saludos y presentaciones | 2 mc + 2 gap |
| 4 | `l04-numeros` | Números del 1 al 100 | 3 mc + 2 gap |
| 5 | `l05-copula` | La cópula: です / ではありません | 2 mc + 2 gap |
| 6 | `l06-particulas` | Partículas は、が、を、に、で | 3 mc + 2 gap |
| 7 | `l07-verbos-masu` | Verbos en forma ます | 3 mc + 2 gap |
| 8 | `l08-adjetivos` | Adjetivos い y な | 2 mc + 2 tf + 1 gap |

Todo el vocabulario y ejemplos usa exclusivamente léxico presente en los JSON de datos existentes (restricción canónica N5).

---

## 6. Integración con archivos existentes

| Archivo | Cambio |
|---|---|
| `js/app.js` | Añadir ruta `else if (seg1 === 'lessons')` |
| `js/home.js` | Añadir entrada al array `BLOCKS` y al array `SECTIONS` |
| `index.html` | Añadir `<link rel="stylesheet" href="css/lessons.css">` |

No se modifica `js/exercise.js`, `js/srs.js` ni ningún `data/*.json` existente.
