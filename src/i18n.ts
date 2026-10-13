export type Lang = 'en' | 'es';
export function getLang(search: string = window.location.search): Lang {
  return new URLSearchParams(search).get('lang') === 'es' ? 'es' : 'en';
}
export const SITE_URL = 'https://carrerable.github.io';
export const BANNER = {
  en: { text: 'Public mini-demo with fictional data. The full product is private. Want to see more?', cta: 'Contact me' },
  es: { text: 'Mini-demo pública con datos ficticios. La versión completa es privada. ¿Quieres ver más?', cta: 'Escríbeme' },
};

// Slug del caso en el portafolio (site/src/content/projects/en/<slug>.mdx). Se sustituye por demo.
export const PROJECT_SLUG = 'jarvis';
export const BACK = {
  en: { back: '← Back to projects', all: 'All projects', banner: 'Back to projects', nav: 'Portfolio' },
  es: { back: '← Volver a proyectos', all: 'Todos los proyectos', banner: 'Volver a proyectos', nav: 'Portafolio' },
};
export const projectUrl = (lang: Lang, slug: string = PROJECT_SLUG) => `${SITE_URL}/${lang}/projects/${slug}/`;
export const projectsUrl = (lang: Lang) => `${SITE_URL}/${lang}/projects/`;
