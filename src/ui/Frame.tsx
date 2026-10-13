import type { ReactNode } from 'react';
export function Frame({ children, tl, tr }: { children: ReactNode; tl?: string; tr?: string }) {
  return (
    <section className="frame">
      <span className="corner tl" aria-hidden="true" />
      <span className="corner tr" aria-hidden="true" />
      <span className="corner bl" aria-hidden="true" />
      <span className="corner br" aria-hidden="true" />
      {tl && <span className="tc tcl" aria-hidden="true">{tl}</span>}
      {tr && <span className="tc" aria-hidden="true">{tr}</span>}
      {children}
    </section>
  );
}
