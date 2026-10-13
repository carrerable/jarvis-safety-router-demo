import { render, screen, fireEvent } from '@testing-library/react';
import { PROHIBITED, route, runTool } from '../lib/router';
import { Demo } from '../Demo';

const now = new Date(2026, 9, 14, 15, 30);

test('herramienta peligrosa sin confirmacion no se ejecuta', () => {
  const o = route('open docs', 'en', undefined, now);
  expect(o.tool).toBe('open_url');
  expect(o.executed).toBe(false);
  expect(o.pending).toEqual({ tool: 'open_url', arg: 'https://example.com/docs' });
  expect(o.reply).toContain('confirm');
});

test('herramienta peligrosa con confirmacion se ejecuta (ES y EN)', () => {
  const p = route('abre docs', 'es', undefined, now).pending!;
  const o = route('confirmo', 'es', p, now);
  expect(o.executed).toBe(true);
  expect(o.reply).toContain('https://example.com/docs');
  expect(route('confirm', 'en', route('open board', 'en', undefined, now).pending, now).executed).toBe(true);
});

test('otra frase cancela la accion pendiente', () => {
  const p = route('open docs', 'en', undefined, now).pending!;
  const o = route('what time is it', 'en', p, now);
  expect(o.trace).toContain('pending action cancelled');
  expect(o.pending).toBeUndefined();
});

test('una herramienta prohibida nunca se ejecuta', () => {
  const o = route('delete the file report.txt', 'en', undefined, now);
  expect(o.executed).toBe(false);
  expect(o.reply).toContain('Prohibited by code, not by the model');
  for (const tool of PROHIBITED) expect(runTool(tool, 'x', 'en', now).executed).toBe(false);
  expect(route('run the shell command ls', 'en', undefined, now).executed).toBe(false);
  expect(route('manda un mensaje a Ana', 'es', undefined, now).tool).toBe('send_message');
});

test('ruta rapida en ES y en EN sin pasar por el LLM', () => {
  const en = route('what time is it', 'en', undefined, now);
  const es = route('¿qué hora es?', 'es', undefined, now);
  expect(en.path).toBe('fast');
  expect(es.path).toBe('fast');
  expect(en.executed && es.executed).toBe(true);
  expect(en.latencySec).toBe(2.7);
  expect(route('estado de la pc', 'es', undefined, now).tool).toBe('pc_status');
  expect(route('hola', 'es', undefined, now).path).toBe('fast');
});

test('una palabra de veto manda siempre al LLM', () => {
  const o = route('no abras docs', 'es', undefined, now);
  expect(o.path).toBe('llm');
  expect(o.executed).toBe(false);
  expect(o.latencySec).toBe(8.6);
  expect(route('remove the time from my notes', 'en', undefined, now).path).toBe('llm');
});

test('la interfaz muestra la traza', () => {
  render(<Demo lang="en" />);
  fireEvent.click(screen.getByRole('button', { name: 'open docs' }));
  expect(screen.getByText('dangerous: waiting for confirmation')).toBeInTheDocument();
});
