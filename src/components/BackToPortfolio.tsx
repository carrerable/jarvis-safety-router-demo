import { BACK, projectUrl, projectsUrl, type Lang } from '../i18n';

export function BackToPortfolio({ lang }: { lang: Lang }) {
  const t = BACK[lang];
  return (
    <nav className="backnav mono" aria-label={t.nav}>
      <a className="back-main" href={projectUrl(lang)} target="_top">{t.back}</a>
      <a className="back-all" href={projectsUrl(lang)} target="_top">{t.all}</a>
    </nav>
  );
}
