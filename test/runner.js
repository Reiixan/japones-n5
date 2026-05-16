// test/runner.js
const suites = [];
let currentSuite = null;

export function describe(name, fn) {
  currentSuite = { name, tests: [] };
  suites.push(currentSuite);
  fn();
  currentSuite = null;
}

export function it(name, fn) {
  if (!currentSuite) throw new Error('it() outside describe()');
  currentSuite.tests.push({ name, fn });
}

export function assert(cond, message = 'assertion failed') {
  if (!cond) throw new Error(message);
}

export function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

export async function run() {
  const root = document.getElementById('results');
  let pass = 0, fail = 0;
  for (const suite of suites) {
    const s = document.createElement('section');
    const h2 = document.createElement('h2');
    h2.textContent = suite.name;
    s.appendChild(h2);
    for (const t of suite.tests) {
      const line = document.createElement('div');
      try {
        await t.fn();
        line.textContent = `  ✓ ${t.name}`;
        line.style.color = 'green';
        pass++;
      } catch (e) {
        line.textContent = `  ✗ ${t.name} — `;
        const strong = document.createElement('strong');
        strong.textContent = e.message;
        line.appendChild(strong);
        line.style.color = 'red';
        fail++;
      }
      s.appendChild(line);
    }
    root.appendChild(s);
  }
  const summary = document.createElement('h3');
  summary.textContent = `${pass} passed, ${fail} failed`;
  summary.style.color = fail === 0 ? 'green' : 'red';
  root.prepend(summary);
}
