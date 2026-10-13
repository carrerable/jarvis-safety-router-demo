export type Lang = 'en' | 'es';
export function getLang(search: string = window.location.search): Lang {
  return new URLSearchParams(search).get('lang') === 'es' ? 'es' : 'en';
}
export const SITE_URL = 'https://carrerable.github.io';
export const BANNER = {
  en: { text: 'Public mini-demo with fictional data. The full product is private. Want to see more?', cta: 'Contact me' },
  es: { text: 'Mini-demo pública con datos ficticios. La versión completa es privada. ¿Quieres ver más?', cta: 'Escríbeme' },
};
