import '@testing-library/jest-dom/vitest';

// jsdom has no WebGL: the orb falls back to the CSS circle.
HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement['getContext'];
