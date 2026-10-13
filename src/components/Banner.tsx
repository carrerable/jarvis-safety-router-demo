import { BACK, BANNER, SITE_URL, projectUrl, type Lang } from '../i18n';
export function Banner({ lang }: { lang: Lang }) {
  const t = BANNER[lang];
  return (
    <aside className="banner" role="note">
      <span>{t.text}</span>
      <a href={`${SITE_URL}/${lang}/#contact`} target="_top">{t.cta}</a>
      <a className="banner-back" href={projectUrl(lang)} target="_top">{BACK[lang].banner}</a>
    </aside>
  );
}
