import "@testing-library/jest-dom/vitest";

// jsdom doesn't implement ResizeObserver. The studio's outgoing-bubble
// gradient effect (see use-outgoing-bubble-gradient.ts) relies on it to
// track scroll position, so tests need a no-op stand-in to render at all.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}
