import '@testing-library/jest-dom';

// recharts' ResponsiveContainer relies on these browser APIs that jsdom lacks.
class ResizeObserver { observe() {} unobserve() {} disconnect() {} }
(globalThis as any).ResizeObserver = ResizeObserver;
(globalThis as any).matchMedia = (globalThis as any).matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {} }));
