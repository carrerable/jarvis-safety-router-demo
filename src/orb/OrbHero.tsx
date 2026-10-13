import { useEffect, useRef, useState } from 'react';
import type { Orb } from './Orb';
import type { OrbState } from './machine';

export function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

export interface OrbLabels { state: string; names: Record<OrbState, string>; honest: string }

/** Hero with the particle orb. Three.js is loaded with a dynamic import after the first paint. */
export function OrbHero({ state, labels }: { state: OrbState; labels: OrbLabels }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const orb = useRef<Orb | null>(null);
  const latest = useRef<OrbState>(state);
  const [ready, setReady] = useState(false);
  latest.current = state;

  useEffect(() => {
    if (!hasWebGL() || !canvas.current) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const raf = requestAnimationFrame(() => {
      timer = setTimeout(() => {
        import('./Orb').then((m) => {
          if (cancelled || !canvas.current) return;
          try {
            orb.current = m.createOrb(canvas.current);
            orb.current.setState(latest.current);
            setReady(true);
          } catch { /* stays on the CSS fallback */ }
        }).catch(() => { /* stays on the CSS fallback */ });
      }, 120);
    });
    return () => { cancelled = true; cancelAnimationFrame(raf); if (timer) clearTimeout(timer); orb.current?.dispose(); orb.current = null; };
  }, []);

  useEffect(() => { orb.current?.setState(state); }, [state]);

  return (
    <div>
      <div className="orb-hero" data-state={state} data-ready={ready}>
        <div className="orb-fallback" aria-hidden="true" />
        <canvas ref={canvas} className="orb-canvas" aria-hidden="true" />
        <p className="orb-status mono" aria-live="polite">{labels.state}: <strong>{labels.names[state]}</strong></p>
      </div>
      <p className="note orb-honest">{labels.honest}</p>
    </div>
  );
}
