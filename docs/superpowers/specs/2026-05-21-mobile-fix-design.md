# Mobile layout fix

**Fecha**: 2026-05-21
**Estado**: aprobado

## Contexto

La app se usa en escritorio y móvil (LAN). En móvil (Chromium/Brave en Android) hay dos problemas:
1. Al abrir el teclado virtual (p.ej. en kana-words), el layout usa `100dvh` como referencia de altura, pero `dvh` no se actualiza cuando aparece el teclado en Chromium. El kana o los botones quedan cortados por debajo.
2. Tamaños de fuente fijos (7 rem para kana, 6 rem para kanji) desbordaban en pantallas pequeñas. Touch targets insuficientes en `.choice-btn`.

## Solución

### 1. `js/viewport.js` (nuevo)

Exporta `initViewport()`. Se llama una sola vez desde `app.js` al arrancar.

```js
export function initViewport() {
  function update() {
    const h = window.visualViewport?.height ?? window.innerHeight;
    document.documentElement.style.setProperty('--viewport-height', h + 'px');
  }
  update();
  (window.visualViewport ?? window).addEventListener('resize', update);
}
```

Resultado: `--viewport-height` siempre refleja la altura visible real, incluyendo cuando el teclado virtual reduce el viewport.

### 2. `js/app.js`

Añadir al inicio:
```js
import { initViewport } from './viewport.js';
```
Llamar `initViewport()` justo antes de `navigate(window.location.pathname)`.

### 3. `css/styles.css` — reemplazos de altura

| Selector | Antes | Después |
|---|---|---|
| `body` | `min-height: 100dvh` | `min-height: var(--viewport-height, 100dvh)` |
| `#app` | `min-height: 100dvh` | `min-height: var(--viewport-height, 100dvh)` |

El `min-height: 60vh` de `.loading-screen` y `min-height: 80vh` de `.summary` no se tocan: son pantallas que no tienen input activo y el centrado relativo es correcto.

### 4. `css/exercise.css` — reemplazos de altura + responsive

**Altura:**

| Selector | Antes | Después |
|---|---|---|
| `.ex-wrap` | `min-height: 100dvh` | `min-height: var(--viewport-height, 100dvh)` |

**Tamaños de fuente responsivos (clamp):**

| Selector | Antes | Después |
|---|---|---|
| `.kana-display` | `font-size: 7rem` | `font-size: clamp(4rem, 18vw, 7rem)` |
| `.kanji-display` | `font-size: 6rem` | `font-size: clamp(3.5rem, 16vw, 6rem)` |
| `.romaji-display` | `font-size: 3.5rem` | `font-size: clamp(2rem, 9vw, 3.5rem)` |
| `.vocab-kanji` | `font-size: 3rem` | `font-size: clamp(2rem, 8vw, 3rem)` |
| `.particle-sentence` | `font-size: 1.6rem` | `font-size: clamp(1.2rem, 4.5vw, 1.6rem)` |

**Touch targets:**

```css
.choice-btn    { min-height: 52px; }
.kana-choice-btn { min-height: 64px; }
```

### 5. `css/styles.css` — touch targets en config de sesión

```css
.size-btn  { min-height: 44px; min-width: 52px; }
.group-check, .pref-row { min-height: 44px; align-items: center; }
```

## Archivos afectados

| Archivo | Cambio |
|---|---|
| `js/viewport.js` | nuevo |
| `js/app.js` | +import + 1 llamada |
| `css/styles.css` | 2 reemplazos dvh + 2 reglas touch target |
| `css/exercise.css` | 1 reemplazo dvh + 5 clamp + 2 min-height |

## Lo que NO cambia

- Motor de ejercicios (`exercise.js`, `srs.js`)
- Layout de escritorio (los cambios son compatibles hacia arriba: `clamp` devuelve el máximo en pantallas grandes, `var(--viewport-height, 100dvh)` usa `100dvh` como fallback si el JS no cargó)
- Estructura del HTML

## Testing

No hay tests unitarios posibles (Visual Viewport API es browser-only). Verificar en DevTools con emulación de dispositivo:

1. **iPhone SE (375×667)**: kana-choice, kana-words (abrir teclado), kana-flash, vocab, kanji
2. **Pixel 7 (412×915)**: mismos modos
3. Screens: home, session config, exercise, resumen
4. Confirmar: al abrir el teclado en kana-words, el prompt y los botones permanecen visibles (el `ex-body` queda dentro del viewport reducido)
5. Confirmar en escritorio (1280px): el layout no cambia
