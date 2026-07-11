import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Studio } from "./studio";
import { demoState } from "./demo-state";

describe("Studio", () => {
  it("renders the header bar with the wordmark, auth CTA, export, and properties toggle", () => {
    render(<Studio />);

    const header = screen.getByRole("banner");
    expect(within(header).getByRole("link", { name: "Kathalis." })).toHaveAttribute("href", "/");
    expect(within(header).getByRole("link", { name: "Sign in" })).toBeInTheDocument();
    expect(within(header).getByRole("button", { name: "Export" })).toBeInTheDocument();
    expect(within(header).getByRole("button", { name: "Close properties" })).toBeInTheDocument();
  });

  it("shows the sign-in CTA only to anonymous writers", () => {
    const { rerender } = render(<Studio />);

    expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument();

    rerender(<Studio authenticatedUser="writer@example.com" initialData={{
      state: {
        ...demoState,
        characters: demoState.characters.map((character) => ({ ...character })),
        messages: demoState.messages.map((message) => ({ ...message })),
      },
      projectId: "project-1",
      userId: "user-1",
      episode: { id: "episode-1", updatedAt: "2026-07-06T00:00:00.000Z" },
    }} />);

    expect(screen.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
  });

  it("warns that demo edits are not carried over only once the demo is edited", async () => {
    const user = userEvent.setup();
    render(<Studio />);

    expect(screen.queryByText(/won't be carried over/)).not.toBeInTheDocument();

    const composer = screen.getByRole("textbox", { name: /new message/i });
    await user.type(composer, "an edit{Enter}");

    expect(screen.getByText(/won't be carried over/)).toBeInTheDocument();
  });

  it("caps the anonymous cast at three characters with a sign-in nudge", async () => {
    const user = userEvent.setup();
    render(<Studio />);

    const addCharacter = screen.getByRole("button", { name: "Add character" });
    expect(addCharacter).toBeEnabled();

    await user.click(addCharacter);

    expect(addCharacter).toBeDisabled();
    expect(screen.getByText("Sign in to add more characters.")).toBeInTheDocument();
  });

  it("keeps character edits synchronized with the phone preview", async () => {
    const user = userEvent.setup();
    render(<Studio />);

    const preview = screen.getByRole("region", { name: "Message preview" });
    expect(within(preview).getByText("maybe. why?")).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    const nameInput = screen.getByRole("textbox", { name: "Character name" });
    await user.clear(nameInput);
    await user.type(nameInput, "Jazz");

    expect(within(preview).getByText("Jazz")).toBeInTheDocument();
  });

  it("adds messages with Enter without advancing to the next sender", async () => {
    const user = userEvent.setup();
    render(<Studio />);

    const composer = screen.getByRole("textbox", { name: /new message/i });
    await user.type(composer, "new message{Enter}");

    expect(screen.getAllByText("3").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("Message from Jaz", { selector: "textarea" }).at(-1)).toHaveValue(
      "new message",
    );
    expect(screen.getByText("Writing as")).toBeInTheDocument();
    expect(screen.getAllByText("Jaz")[1]).toBeInTheDocument();
  });

  it("updates screen settings and delivery status", async () => {
    const user = userEvent.setup();
    render(<Studio />);

    await user.click(screen.getByRole("button", { name: /Dark/ }));
    await user.click(screen.getByRole("button", { name: "Green" }));
    await user.click(screen.getByRole("button", { name: "Read" }));

    const preview = screen.getByRole("region", { name: "Message preview" });
    const screenElement = preview.querySelector("[data-bubble='green']");
    expect(screenElement).toHaveAttribute("data-theme", "dark");
    expect(within(preview).getByText("Read 10:01 PM")).toBeInTheDocument();
  });

  it("reassigns ownership when the phone owner is deleted", async () => {
    const user = userEvent.setup();
    render(<Studio />);

    await user.click(screen.getAllByRole("button", { name: "Edit" })[1]);
    await user.click(screen.getByRole("button", { name: "Delete character" }));

    expect(screen.queryByText("Kylle")).not.toBeInTheDocument();
    expect(screen.getByText("This phone")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(1);
  });

  it("supports keyboard selection in properties dropdowns", async () => {
    const user = userEvent.setup();
    render(<Studio />);

    const ownerSelect = screen.getByRole("combobox", { name: "Whose phone" });
    ownerSelect.focus();
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");

    expect(ownerSelect).toHaveTextContent("Jaz");
    expect(screen.getAllByText("This phone")[0]).toBeInTheDocument();
  });

  it("provides accessible names for editable project and read-time fields", () => {
    render(<Studio />);

    expect(screen.getByRole("textbox", { name: "Project name" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Project description" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Read time" })).toBeInTheDocument();
  });
});
