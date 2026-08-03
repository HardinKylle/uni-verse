import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SmallScreenNotice } from "./small-screen-notice";

describe("SmallScreenNotice", () => {
  it("recommends a laptop or iPad", () => {
    render(<SmallScreenNotice />);

    expect(screen.getByRole("heading")).toHaveTextContent(/bigger screen/i);
    expect(screen.getByText(/laptop or an ipad/i)).toBeInTheDocument();
  });

  it("exposes no interactive controls", () => {
    render(<SmallScreenNotice />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
