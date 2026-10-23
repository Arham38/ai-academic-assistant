import '@testing-library/jest-dom';

// Polyfill window.matchMedia in jsdom environment
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// Polyfill requestAnimationFrame and cancelAnimationFrame for RTK / jsdom
if (typeof window !== 'undefined') {
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = (callback: FrameRequestCallback) =>
      setTimeout(() => callback(Date.now()), 0) as unknown as number;
  }
  if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = (id: number) => clearTimeout(id);
  }
}
