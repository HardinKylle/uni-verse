import { describe, expect, it, vi } from "vitest";

import { updateOutgoingBubbleGradient } from "./use-outgoing-bubble-gradient";

describe("updateOutgoingBubbleGradient", () => {
  it("anchors bubble gradients to their vertical screen position", () => {
    const container = document.createElement("div");
    const topBubble = document.createElement("div");
    const bottomBubble = document.createElement("div");
    topBubble.className = "outgoing-bubble";
    bottomBubble.className = "outgoing-bubble";
    container.append(topBubble, bottomBubble);

    vi.spyOn(container, "getBoundingClientRect").mockReturnValue({
      top: 100,
      height: 400,
    } as DOMRect);
    vi.spyOn(topBubble, "getBoundingClientRect").mockReturnValue({ top: 100 } as DOMRect);
    vi.spyOn(bottomBubble, "getBoundingClientRect").mockReturnValue({ top: 500 } as DOMRect);

    updateOutgoingBubbleGradient(container);

    expect(topBubble.style.getPropertyValue("--percent-top")).toBe("100%");
    expect(bottomBubble.style.getPropertyValue("--percent-top")).toBe("0%");
  });

  it("does nothing for a zero-height container", () => {
    const container = document.createElement("div");
    const bubble = document.createElement("div");
    bubble.className = "outgoing-bubble";
    container.append(bubble);
    vi.spyOn(container, "getBoundingClientRect").mockReturnValue({ height: 0 } as DOMRect);

    updateOutgoingBubbleGradient(container);

    expect(bubble.style.getPropertyValue("--percent-top")).toBe("");
  });
});
