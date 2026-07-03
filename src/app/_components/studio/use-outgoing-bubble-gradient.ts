import { type RefObject, useEffect } from "react";

/**
 * iMessage renders each outgoing bubble's blue gradient anchored to the
 * *screen* (not the bubble), so as the conversation scrolls, a bubble's
 * fill shifts to match wherever it currently sits on screen. There's no
 * pure-CSS way to express "gradient position depends on this element's
 * scroll-relative offset", so this hook measures each `.outgoing-bubble`
 * on scroll/resize/content-change and writes the result into a CSS custom
 * property (`--percent-top`) that the bubble's own `color-mix()` background
 * reads. This is the one place in the studio that manipulates the DOM
 * directly instead of going through React state — it's isolated here so
 * the imperative part stays out of the render path.
 */
export function useOutgoingBubbleGradient(scrollRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const updatePositions = () => {
      const containerRect = scrollEl.getBoundingClientRect();
      const bubbles = scrollEl.querySelectorAll<HTMLElement>(".outgoing-bubble");

      bubbles.forEach((bubble) => {
        const rect = bubble.getBoundingClientRect();
        // 0 at the top of the scroll viewport, 1 at the bottom.
        const percent = Math.min(Math.max((rect.top - containerRect.top) / containerRect.height, 0), 1);
        bubble.style.setProperty("--percent-top", `${(1 - percent) * 100}%`);
      });
    };

    const resizeObserver = new ResizeObserver(updatePositions);
    resizeObserver.observe(scrollEl);

    const mutationObserver = new MutationObserver(updatePositions);
    mutationObserver.observe(scrollEl, { childList: true, subtree: true });

    scrollEl.addEventListener("scroll", updatePositions, { passive: true });
    requestAnimationFrame(updatePositions);

    return () => {
      scrollEl.removeEventListener("scroll", updatePositions);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [scrollRef]);
}
