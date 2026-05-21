# Mobile Layout Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the virtual-keyboard layout breakage on Chromium mobile and improve general mobile usability (responsive font sizes + touch targets).

**Architecture:** A new `js/viewport.js` module registers a `visualViewport.resize` listener and writes `--viewport-height` as a CSS custom property on `:root`; all full-height containers switch from `100dvh` to `var(--viewport-height, 100dvh)`. Font sizes use `clamp()` so they scale down on small screens without changing the desktop look. Touch targets get a `min-height`.

**Tech Stack:** Vanilla JS ES modules, CSS custom properties, Visual Viewport API (with `window.resize` fallback).

---

## File Map

| File | Action |
|---|---|
| `js/viewport.js` | CREATE — `initViewport()` function |
| `js/app.js` | MODIFY — add import + call `initViewport()` |
| `css/styles.css` | MODIFY — 2× `100dvh` → var, `.size-btn` min-height |
| `css/exercise.css` | MODIFY — 1× `100dvh` → var, 5× font clamp, 2× min-height |

---

## Task 1: Create `js/viewport.js` and wire it into `app.js`

**Files:**
- Create: `js/viewport.js`
- Modify: `js/app.js`

This is the core fix. The module keeps `--viewport-height` in sync with the real visible area. When the soft keyboard opens, `visualViewport.height` shrinks; the property updates and the layout reacts.

- [ ] **Step 1: Create `js/viewport.js`**

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

- [ ] **Step 2: Add import to `js/app.js`**

The current imports end at line 18 (`import { migrateV1ToV2 } from './storage.js?v=2';`). Add the new import immediately after:

```js
import { initViewport } from './viewport.js';
```

- [ ] **Step 3: Call `initViewport()` in `js/app.js`**

Find the initialization block (currently around line 112):

```js
// Run migration from v1 to v2 storage keys
migrateV1ToV2();
```

Add `initViewport()` on the next line:

```js
// Run migration from v1 to v2 storage keys
migrateV1ToV2();
initViewport();
```

- [ ] **Step 4: Verify in browser**

Serve the app (`python3 -m http.server 8765` from `/home/hugo/japones-n5`).

Open DevTools → toggle device toolbar → select iPhone SE (375×667).

Open any exercise with a text input (e.g. `/hiragana/words`). Tap the input field. The soft keyboard appears in the emulator.

Expected: the exercise container height shrinks to fit above the keyboard (the kana prompt and answer buttons remain visible — they do not get pushed below the fold).

- [ ] **Step 5: Commit**

```bash
git add js/viewport.js js/app.js
git commit -m "feat: add viewport.js to track visual viewport height via CSS custom property"
```

---

## Task 2: Replace `100dvh` with `var(--viewport-height, 100dvh)`

**Files:**
- Modify: `css/styles.css` (lines 47, 81)
- Modify: `css/exercise.css` (line 13)

`100dvh` does not update when the soft keyboard opens in Chromium mobile. Replacing it with the CSS variable (which `viewport.js` keeps current) fixes the jump.

- [ ] **Step 1: Update `css/styles.css` — `body`**

Current (line 47):
```css
  min-height: 100dvh;
```
Replace with:
```css
  min-height: var(--viewport-height, 100dvh);
```

- [ ] **Step 2: Update `css/styles.css` — `#app`**

Current (line 81):
```css
  min-height: 100dvh;
```
Replace with:
```css
  min-height: var(--viewport-height, 100dvh);
```

- [ ] **Step 3: Update `css/exercise.css` — `.ex-wrap`**

Current (line 13):
```css
  min-height: 100dvh;
```
Replace with:
```css
  min-height: var(--viewport-height, 100dvh);
```

- [ ] **Step 4: Verify in browser**

In DevTools iPhone SE (375×667), open the kana-words exercise. Tap the text field so the keyboard appears.

Expected: `.ex-wrap` (the exercise container) shrinks to the visible area above the keyboard. No content is hidden behind the keyboard.

Also confirm desktop (1280px) still looks identical — `var(--viewport-height, 100dvh)` evaluates to the full window height when the keyboard is not open.

- [ ] **Step 5: Commit**

```bash
git add css/styles.css css/exercise.css
git commit -m "fix: use --viewport-height CSS var instead of 100dvh to fix soft-keyboard layout on Chromium mobile"
```

---

## Task 3: Responsive font sizes and touch targets

**Files:**
- Modify: `css/exercise.css` (font clamp + choice-btn min-height)
- Modify: `css/styles.css` (size-btn min-height)

On a 375px screen, 7 rem = 112px; the kana overflowed. `clamp()` scales the font down on narrow screens while leaving it unchanged on desktop (≥640px). Touch targets get a `min-height` so they are comfortably tappable.

- [ ] **Step 1: Update font sizes in `css/exercise.css`**

Apply these five replacements (use exact surrounding context for each edit):

**`.kana-display`** (currently line 61–66):
```css
.kana-display {
  font-family: var(--font-jp);
  font-size: clamp(4rem, 18vw, 7rem); line-height: 1; font-weight: 400;
  color: var(--text);
  text-align: center;
}
```

**`.kanji-display`** (currently line 67–70):
```css
.kanji-display {
  font-family: var(--font-jp);
  font-size: clamp(3.5rem, 16vw, 6rem); line-height: 1; font-weight: 400;
  color: var(--text);
}
```

**`.romaji-display`** (currently line 72–75):
```css
.romaji-display {
  font-size: clamp(2rem, 9vw, 3.5rem); font-weight: 700; letter-spacing: .04em;
  color: var(--text);
}
```

**`.vocab-kanji`** (currently line 81–83):
```css
.vocab-kanji {
  font-family: var(--font-jp);
  font-size: clamp(2rem, 8vw, 3rem); font-weight: 700; color: var(--text);
}
```

**`.particle-sentence`** (currently line 97–101):
```css
.particle-sentence {
  font-family: var(--font-jp);
  font-size: clamp(1.2rem, 4.5vw, 1.6rem); line-height: 1.6;
  text-align: center; color: var(--text);
}
```

- [ ] **Step 2: Add touch targets to `.choice-btn` and `.kana-choice-btn` in `css/exercise.css`**

`.choice-btn` already has `padding: .9rem .75rem`. Add `min-height` on the same rule block (line 158):

```css
.choice-btn {
  background: var(--bg-card);
  border: 2px solid var(--border);
  border-radius: var(--radius-sm);
  padding: .9rem .75rem;
  min-height: 52px;
  font-size: 1rem; font-weight: 600;
  color: var(--text);
  transition: all .15s;
  display: flex; align-items: center; gap: .5rem;
  text-align: left; line-height: 1.3;
}
```

`.kana-choice-btn` (line 184):

```css
.kana-choice-btn {
  font-family: var(--font-jp);
  font-size: 2rem; justify-content: center;
  padding: 1.2rem .5rem;
  min-height: 64px;
  flex-direction: column; align-items: center; gap: .35rem;
}
```

- [ ] **Step 3: Add touch targets to `css/styles.css` (session-config elements)**

**`.size-btn`** (currently line 308):

```css
.size-btn {
  flex: 1;
  padding: .6rem;
  min-height: 44px;
  background: var(--bg-card);
  border: 1.5px solid var(--border);
  border-radius: var(--radius-sm);
  font-weight: 600; font-size: .9rem;
  transition: all .15s;
}
```

**`.group-check`** (currently line 296) — add `min-height: 44px`:

```css
.group-check {
  display: flex; align-items: center; gap: .4rem;
  background: var(--bg-card); border: 1.5px solid var(--border);
  border-radius: var(--radius-sm); padding: .4rem .75rem;
  min-height: 44px;
  cursor: pointer; font-size: .85rem;
  transition: border-color .15s, background .15s;
}
```

**`.pref-row`** (currently line 385) — add `min-height: 44px`:

```css
.pref-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 44px;
  cursor: pointer;
}
```

- [ ] **Step 4: Verify in browser**

In DevTools iPhone SE (375×667):

1. Home → any kana block → kana-choice: confirm kana characters are readable (≈4 rem, not overflowing).
2. Vocab block: confirm kanji display is readable (≈3.2 rem).
3. Particles block: confirm sentence fits on screen without horizontal scroll.
4. Session config: confirm the 10/20/50/Todo buttons are at least 44px tall and easy to tap.
5. Switch to Pixel 7 (412×915): check the same screens.
6. Switch to 1280px desktop: confirm fonts are at their original maximum (7 rem kana, 6 rem kanji).

- [ ] **Step 5: Commit**

```bash
git add css/exercise.css css/styles.css
git commit -m "fix: responsive font sizes with clamp() and 44-64px touch targets for mobile"
```
