import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StudioSkeleton } from "./studio-skeleton";

describe("StudioSkeleton", () => {
  it("announces the loading state to assistive tech", () => {
    render(<StudioSkeleton />);

    expect(screen.getByRole("status")).toHaveTextContent(/loading/i);
    expect(screen.getByRole("main")).toHaveAttribute("aria-busy", "true");
  });

  it("keeps the wordmark visible while the project loads", () => {
    render(<StudioSkeleton />);

    expect(screen.getByText(/kathalis/i)).toBeInTheDocument();
  });

  it("exposes no interactive controls before data arrives", () => {
    render(<StudioSkeleton />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
