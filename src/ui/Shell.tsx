import { useEffect, type ReactNode } from 'react';
import type { Lang } from '../i18n';
import { BackToPortfolio } from '../components/BackToPortfolio';

export function Shell({ lang, eyebrow, title, lead, children }: { lang: Lang; eyebrow: string; title: string; lead: string; children: ReactNode }) {
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  return (
    <>
      <header className="head">
        <div className="topbar">
          <BackToPortfolio lang={lang} />
          <nav className="langs mono" aria-label="Language">
            <a href="?lang=en" aria-current={lang === 'en'}>EN</a>
            <a href="?lang=es" aria-current={lang === 'es'}>ES</a>
          </nav>
        </div>
        <div className="eyebrow mono"><span>{eyebrow}</span></div>
        <h1>{title}</h1>
        <p className="lead">{lead}</p>
      </header>
      {children}
    </>
  );
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { id: T; label: string }[] }) {
  return (
    <div className="tabs" role="tablist">
      {items.map((i) => (
        <button key={i.id} role="tab" className="toggle" aria-selected={value === i.id} onClick={() => onChange(i.id)}>{i.label}</button>
      ))}
    </div>
  );
}
