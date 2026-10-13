import { BANNER, SITE_URL, type Lang } from '../i18n';
export function Banner({ lang }: { lang: Lang }) {
  const t = BANNER[lang];
  return (
    <aside className="banner" role="note">
      <span>{t.text}</span> <a href={`${SITE_URL}/${lang}/#contact`} target="_top">{t.cta}</a>
    </aside>
  );
}
