import { describe, it, assertEqual } from './runner.js';

describe('parseMd — negrita', () => {
  it('**texto** → <strong>texto</strong>', async () => {
    const { parseMd } = await import('../js/lessons.js?c=md1');
    assertEqual(parseMd('**hola**'), '<p><strong>hola</strong></p>');
  });
  it('texto mixto con negrita', async () => {
    const { parseMd } = await import('../js/lessons.js?c=md2');
    assertEqual(parseMd('el **hiragana** es'), '<p>el <strong>hiragana</strong> es</p>');
  });
});

describe('parseMd — cursiva', () => {
  it('*texto* → <em>texto</em>', async () => {
    const { parseMd } = await import('../js/lessons.js?c=md3');
    assertEqual(parseMd('*nota*'), '<p><em>nota</em></p>');
  });
});

describe('parseMd — código inline', () => {
  it('`código` → <code>código</code>', async () => {
    const { parseMd } = await import('../js/lessons.js?c=md4');
    assertEqual(parseMd('usa `です`'), '<p>usa <code>です</code></p>');
  });
});

describe('parseMd — párrafos', () => {
  it('doble newline genera dos párrafos', async () => {
    const { parseMd } = await import('../js/lessons.js?c=md5');
    assertEqual(parseMd('uno\n\ndos'), '<p>uno</p><p>dos</p>');
  });
  it('salto simple dentro del mismo párrafo', async () => {
    const { parseMd } = await import('../js/lessons.js?c=md6');
    assertEqual(parseMd('uno\ndos'), '<p>uno\ndos</p>');
  });
});

describe('parseMd — listas', () => {
  it('líneas con "- " forman <ul><li>', async () => {
    const { parseMd } = await import('../js/lessons.js?c=md7');
    const result = parseMd('- alfa\n- beta');
    assertEqual(result, '<ul><li>alfa</li><li>beta</li></ul>');
  });
});
