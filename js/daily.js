const KEY = 'jp_n5_daily';
const DEFAULT_GOAL = 30;

export function todayDateString(now) {
  const d = new Date(now);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function yesterdayString(now) {
  return todayDateString(now - 24 * 60 * 60 * 1000);
}

function readRaw() {
  const raw = localStorage.getItem(KEY);
  if (!raw) {
    return { goal: DEFAULT_GOAL, todayCount: 0, todayDate: null, streak: 0, lastGoalDate: null };
  }
  return JSON.parse(raw);
}

function writeRaw(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function getDailyState(now = Date.now()) {
  const s = readRaw();
  const today = todayDateString(now);
  const yest = yesterdayString(now);
  let visualStreak = s.streak;
  if (s.lastGoalDate !== today && s.lastGoalDate !== yest) {
    visualStreak = 0;
  }
  return { ...s, streak: visualStreak };
}

export function recordPracticeTick(now = Date.now()) {
  const s = readRaw();
  const today = todayDateString(now);
  const yest = yesterdayString(now);
  if (s.todayDate !== today) {
    s.todayDate = today;
    s.todayCount = 0;
  }
  s.todayCount += 1;
  if (s.todayCount === s.goal && s.lastGoalDate !== today) {
    if (s.lastGoalDate === yest) s.streak += 1;
    else s.streak = 1;
    s.lastGoalDate = today;
  }
  writeRaw(s);
  return s;
}

export function setGoal(n) {
  const s = readRaw();
  s.goal = n;
  writeRaw(s);
}
