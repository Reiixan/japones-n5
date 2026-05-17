import { describe, it, assertEqual } from './runner.js';

const KEY = 'jp_n5_daily';

function dayMs(y, m, d, h = 12) {
  return new Date(y, m - 1, d, h).getTime();
}

describe('daily.todayDateString', () => {
  it('formato YYYY-MM-DD', async () => {
    const { todayDateString } = await import('../js/daily.js?c=d1');
    const ts = dayMs(2026, 5, 17);
    assertEqual(todayDateString(ts), '2026-05-17');
  });
});

describe('daily.recordPracticeTick', () => {
  it('primer tick del día', async () => {
    localStorage.removeItem(KEY);
    const { recordPracticeTick } = await import('../js/daily.js?c=d2');
    const ts = dayMs(2026, 5, 17);
    const s = recordPracticeTick(ts);
    assertEqual(s.todayCount, 1);
    assertEqual(s.todayDate, '2026-05-17');
    assertEqual(s.goal, 30);
    assertEqual(s.streak, 0);
    localStorage.removeItem(KEY);
  });

  it('al alcanzar meta sin racha previa: streak=1', async () => {
    localStorage.setItem(KEY, JSON.stringify({ goal: 3, todayCount: 2, todayDate: '2026-05-17', streak: 0, lastGoalDate: null }));
    const { recordPracticeTick } = await import('../js/daily.js?c=d3');
    const ts = dayMs(2026, 5, 17);
    const s = recordPracticeTick(ts);
    assertEqual(s.todayCount, 3);
    assertEqual(s.streak, 1);
    assertEqual(s.lastGoalDate, '2026-05-17');
    localStorage.removeItem(KEY);
  });

  it('al alcanzar meta con lastGoalDate=ayer: streak++', async () => {
    localStorage.setItem(KEY, JSON.stringify({ goal: 2, todayCount: 1, todayDate: '2026-05-17', streak: 5, lastGoalDate: '2026-05-16' }));
    const { recordPracticeTick } = await import('../js/daily.js?c=d4');
    const ts = dayMs(2026, 5, 17);
    const s = recordPracticeTick(ts);
    assertEqual(s.streak, 6);
    localStorage.removeItem(KEY);
  });

  it('al alcanzar meta con lastGoalDate hace 2 días: streak=1 (rota)', async () => {
    localStorage.setItem(KEY, JSON.stringify({ goal: 2, todayCount: 1, todayDate: '2026-05-17', streak: 5, lastGoalDate: '2026-05-15' }));
    const { recordPracticeTick } = await import('../js/daily.js?c=d5');
    const ts = dayMs(2026, 5, 17);
    const s = recordPracticeTick(ts);
    assertEqual(s.streak, 1);
    localStorage.removeItem(KEY);
  });

  it('cambio de día resetea todayCount', async () => {
    localStorage.setItem(KEY, JSON.stringify({ goal: 30, todayCount: 12, todayDate: '2026-05-16', streak: 3, lastGoalDate: '2026-05-15' }));
    const { recordPracticeTick } = await import('../js/daily.js?c=d6');
    const ts = dayMs(2026, 5, 17);
    const s = recordPracticeTick(ts);
    assertEqual(s.todayDate, '2026-05-17');
    assertEqual(s.todayCount, 1);
    localStorage.removeItem(KEY);
  });

  it('no incrementa streak en segundo tick del día post-meta', async () => {
    localStorage.setItem(KEY, JSON.stringify({ goal: 2, todayCount: 5, todayDate: '2026-05-17', streak: 3, lastGoalDate: '2026-05-17' }));
    const { recordPracticeTick } = await import('../js/daily.js?c=d7');
    const ts = dayMs(2026, 5, 17);
    const s = recordPracticeTick(ts);
    assertEqual(s.streak, 3);
    assertEqual(s.todayCount, 6);
    localStorage.removeItem(KEY);
  });
});

describe('daily.getDailyState - racha rota visualmente', () => {
  it('si lastGoalDate hace 3 días devuelve streak=0 visual', async () => {
    localStorage.setItem(KEY, JSON.stringify({ goal: 30, todayCount: 0, todayDate: '2026-05-17', streak: 5, lastGoalDate: '2026-05-14' }));
    const { getDailyState } = await import('../js/daily.js?c=d8');
    const ts = dayMs(2026, 5, 17);
    const s = getDailyState(ts);
    assertEqual(s.streak, 0);  // visual = 0
    // Pero en storage sigue siendo 5 (no se modifica)
    const raw = JSON.parse(localStorage.getItem(KEY));
    assertEqual(raw.streak, 5);
    localStorage.removeItem(KEY);
  });

  it('si lastGoalDate=ayer devuelve streak persistido', async () => {
    localStorage.setItem(KEY, JSON.stringify({ goal: 30, todayCount: 0, todayDate: '2026-05-17', streak: 5, lastGoalDate: '2026-05-16' }));
    const { getDailyState } = await import('../js/daily.js?c=d9');
    const ts = dayMs(2026, 5, 17);
    const s = getDailyState(ts);
    assertEqual(s.streak, 5);
    localStorage.removeItem(KEY);
  });
});
