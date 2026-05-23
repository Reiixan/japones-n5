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

describe('getLessonProgress — sin datos', () => {
  it('devuelve null si no hay entrada en localStorage', async () => {
    localStorage.removeItem('jp_n5_lesson.l01-hiragana');
    const { getLessonProgress } = await import('../js/lessons.js?c=lp1');
    assertEqual(getLessonProgress('l01-hiragana'), null);
  });
});

describe('setLessonStarted / getLessonProgress', () => {
  it('graba status=started y lastBlock', async () => {
    localStorage.removeItem('jp_n5_lesson.test-abc');
    const { setLessonStarted, getLessonProgress } = await import('../js/lessons.js?c=lp2');
    setLessonStarted('test-abc', 3);
    const p = getLessonProgress('test-abc');
    assertEqual(p.status, 'started');
    assertEqual(p.lastBlock, 3);
    localStorage.removeItem('jp_n5_lesson.test-abc');
  });
});

describe('setLessonCompleted / getLessonProgress', () => {
  it('graba status=completed', async () => {
    localStorage.removeItem('jp_n5_lesson.test-xyz');
    const { setLessonCompleted, getLessonProgress } = await import('../js/lessons.js?c=lp3');
    setLessonCompleted('test-xyz');
    const p = getLessonProgress('test-xyz');
    assertEqual(p.status, 'completed');
    localStorage.removeItem('jp_n5_lesson.test-xyz');
  });
  it('setLessonCompleted preserva lastBlock si ya existía', async () => {
    localStorage.setItem('jp_n5_lesson.test-xyz2', JSON.stringify({ status: 'started', lastBlock: 5 }));
    const { setLessonCompleted, getLessonProgress } = await import('../js/lessons.js?c=lp4');
    setLessonCompleted('test-xyz2');
    const p = getLessonProgress('test-xyz2');
    assertEqual(p.status, 'completed');
    assertEqual(p.lastBlock, 5);
    localStorage.removeItem('jp_n5_lesson.test-xyz2');
  });
});
