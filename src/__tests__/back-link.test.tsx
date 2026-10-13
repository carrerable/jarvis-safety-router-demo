import { render, screen, within } from '@testing-library/react';
import { BackToPortfolio } from '../components/BackToPortfolio';
import { Banner } from '../components/Banner';
import { Shell } from '../ui/Shell';

const SLUG = 'jarvis';
const SITE = 'https://carrerable.github.io';

test('enlace de regreso al caso en ingles', () => {
  render(<BackToPortfolio lang="en" />);
  const back = screen.getByRole('link', { name: /back to projects/i });
  expect(back).toHaveAttribute('href', `${SITE}/en/projects/${SLUG}/`);
  expect(back).toHaveAttribute('target', '_top');
  const all = screen.getByRole('link', { name: 'All projects' });
  expect(all).toHaveAttribute('href', `${SITE}/en/projects/`);
  expect(all).toHaveAttribute('target', '_top');
});

test('enlace de regreso al caso en espanol', () => {
  render(<BackToPortfolio lang="es" />);
  const back = screen.getByRole('link', { name: /volver a proyectos/i });
  expect(back).toHaveAttribute('href', `${SITE}/es/projects/${SLUG}/`);
  expect(back).toHaveAttribute('target', '_top');
  const all = screen.getByRole('link', { name: 'Todos los proyectos' });
  expect(all).toHaveAttribute('href', `${SITE}/es/projects/`);
  expect(all).toHaveAttribute('target', '_top');
});

test('el Shell muestra el enlace arriba del titulo', () => {
  render(<Shell lang="es" eyebrow="e" title="t" lead="l"><p>x</p></Shell>);
  const header = screen.getByRole('banner');
  const back = within(header).getByRole('link', { name: /volver a proyectos/i });
  expect(back).toHaveAttribute('href', `${SITE}/es/projects/${SLUG}/`);
  expect(back.compareDocumentPosition(screen.getByRole('heading', { level: 1 })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

test('la banda superior trae Back to projects junto a Contact me', () => {
  render(<Banner lang="en" />);
  const nota = screen.getByRole('note');
  expect(within(nota).getByRole('link', { name: 'Contact me' })).toHaveAttribute('target', '_top');
  const back = within(nota).getByRole('link', { name: 'Back to projects' });
  expect(back).toHaveAttribute('href', `${SITE}/en/projects/${SLUG}/`);
  expect(back).toHaveAttribute('target', '_top');
});
