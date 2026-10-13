import { vi } from 'vitest';
import { route } from '../lib/router';
import { BLOCKED_MS, LISTEN_MS, THINK_SCALE, createOrbController, planSequence, type OrbState } from '../orb/machine';

const now = new Date(2026, 9, 14, 15, 30);
const states = (q: string, lang: 'en' | 'es' = 'en') => planSequence(route(q, lang, undefined, now)).map((s) => s.state);

test('mensaje seguro: listening, thinking, speaking, idle', () => {
  expect(states('what time is it')).toEqual(['listening', 'thinking', 'speaking', 'idle']);
  expect(states('hola', 'es')).toEqual(['listening', 'thinking', 'speaking', 'idle']);
  expect(states('/pc')).toEqual(['listening', 'thinking', 'speaking', 'idle']);
});

test('LLM simulado usa la latencia larga y termina hablando', () => {
  const fast = planSequence(route('what time is it', 'en', undefined, now));
  const llm = planSequence(route('tell me a story', 'en', undefined, now));
  expect(fast[0].ms).toBe(LISTEN_MS);
  expect(fast[1].ms).toBe(Math.round(2.7 * 1000 * THINK_SCALE));
  expect(llm[1].ms).toBe(Math.round(8.6 * 1000 * THINK_SCALE));
  expect(llm.map((s) => s.state)).toEqual(['listening', 'thinking', 'speaking', 'idle']);
});

test('herramienta prohibida dispara blocked y luego idle', () => {
  for (const q of ['delete the file report.txt', 'run the shell command ls', 'manda un mensaje a Ana']) {
    const seq = planSequence(route(q, 'en', undefined, now));
    expect(seq.map((s) => s.state)).toEqual(['listening', 'thinking', 'blocked', 'idle']);
    expect(seq[2].ms).toBe(BLOCKED_MS);
  }
});

test('herramienta peligrosa dispara confirm y se queda ahi', () => {
  const seq = planSequence(route('open docs', 'en', undefined, now));
  expect(seq.map((s) => s.state)).toEqual(['listening', 'thinking', 'confirm']);
  expect(seq[2].ms).toBeNull();
});

test('confirmar ejecuta y habla; no hay blocked ni confirm', () => {
  const p = route('open docs', 'en', undefined, now).pending;
  const after = planSequence(route('confirm', 'en', p, now)).map((s) => s.state);
  expect(after).toEqual(['listening', 'thinking', 'speaking', 'idle']);
});

test('blocked y confirm no aparecen en mensajes que no los merecen', () => {
  for (const q of ['what time is it', 'hello', 'no open docs', 'open nothing', '/ls']) {
    const s = states(q);
    expect(s).not.toContain('blocked');
    expect(s).not.toContain('confirm');
  }
});

test('el controlador reproduce la secuencia con tiempo falso y un mensaje nuevo la cancela', () => {
  vi.useFakeTimers();
  const seen: OrbState[] = [];
  const ctl = createOrbController((s) => seen.push(s));
  ctl.run(route('delete the file a.txt', 'en', undefined, now));
  expect(seen).toEqual(['listening']);
  vi.advanceTimersByTime(LISTEN_MS);
  expect(seen).toEqual(['listening', 'thinking']);
  vi.advanceTimersByTime(Math.round(8.6 * 1000 * THINK_SCALE));
  expect(seen.at(-1)).toBe('blocked');
  vi.advanceTimersByTime(BLOCKED_MS);
  expect(seen.at(-1)).toBe('idle');
  ctl.run(route('open docs', 'en', undefined, now));
  vi.advanceTimersByTime(10_000);
  expect(seen.at(-1)).toBe('confirm');
  ctl.run(route('what time is it', 'en', undefined, now));
  ctl.dispose();
  vi.advanceTimersByTime(20_000);
  expect(seen.at(-1)).toBe('listening');
  vi.useRealTimers();
});
