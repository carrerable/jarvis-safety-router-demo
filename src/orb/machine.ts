import { PROHIBITED, type Outcome } from '../lib/router';

export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'blocked' | 'confirm';

/** One step of the sequence. `ms: null` means the state is held until the next message. */
export interface Step { state: OrbState; ms: number | null }

/** The orb replays the simulated latency at a quarter of its length so the demo stays snappy. */
export const THINK_SCALE = 0.25;
export const LISTEN_MS = 600;
export const BLOCKED_MS = 1600;

const isProhibited = (tool?: string) => !!tool && (PROHIBITED as readonly string[]).includes(tool);

/** Pure: which states the orb passes through for a router outcome. */
export function planSequence(out: Outcome): Step[] {
  const head: Step[] = [
    { state: 'listening', ms: LISTEN_MS },
    { state: 'thinking', ms: Math.round(out.latencySec * 1000 * THINK_SCALE) },
  ];
  if (isProhibited(out.tool) && !out.executed) return [...head, { state: 'blocked', ms: BLOCKED_MS }, { state: 'idle', ms: null }];
  if (out.pending) return [...head, { state: 'confirm', ms: null }];
  const speak = Math.min(4000, Math.max(1200, out.reply.length * 40));
  return [...head, { state: 'speaking', ms: speak }, { state: 'idle', ms: null }];
}

type Timer = ReturnType<typeof setTimeout>;

/** Runs sequences with timers. The scheduler is injectable so tests need no WebGL and no real time. */
export function createOrbController(
  onState: (s: OrbState) => void,
  schedule: (fn: () => void, ms: number) => Timer = setTimeout,
  cancel: (t: Timer) => void = clearTimeout,
) {
  let timer: Timer | undefined;
  const stop = () => { if (timer !== undefined) cancel(timer); timer = undefined; };
  const play = (steps: Step[], i = 0) => {
    const step = steps[i];
    if (!step) return;
    onState(step.state);
    if (step.ms !== null) timer = schedule(() => play(steps, i + 1), step.ms);
  };
  return {
    run(out: Outcome) { stop(); play(planSequence(out)); },
    dispose: stop,
  };
}
