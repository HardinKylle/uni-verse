import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DashboardSkeleton } from "./dashboard-skeleton";

describe("DashboardSkeleton", () => {
  it("announces the loading state to assistive tech", () => {
    render(<DashboardSkeleton />);

    expect(screen.getByRole("status")).toHaveTextContent(/loading/i);
    expect(screen.getByRole("main")).toHaveAttribute("aria-busy", "true");
  });

  it("keeps the static page chrome visible while data loads", () => {
    render(<DashboardSkeleton />);

    expect(screen.getByRole("img", { name: "Kathalis" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Stories" })).toBeInTheDocument();
  });

  it("exposes no interactive controls before data arrives", () => {
    render(<DashboardSkeleton />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
