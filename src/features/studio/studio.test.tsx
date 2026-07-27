import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Studio } from "./studio";
import { demoState } from "./demo-state";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

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
      projectTitle: "Test Project",
      episode: { id: "episode-1", updatedAt: "2026-07-06T00:00:00.000Z" },
      episodes: [{ id: "episode-1", position: 0, title: "Episode 1" }],
    }} />);

    expect(screen.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByText("Test Project")).toBeInTheDocument();
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

  it("disables deletion at two characters and explains the minimum", async () => {
    const user = userEvent.setup();
    render(<Studio />);

    await user.click(screen.getAllByRole("button", { name: "Edit" })[1]);

    expect(screen.getByRole("button", { name: "Delete character" })).toBeDisabled();
    expect(screen.getByText("A story needs at least two characters.")).toBeInTheDocument();
  });

  it("warns about ownership transfer and cancel leaves the cast unchanged", async () => {
    const user = userEvent.setup();
    render(<Studio />);

    await user.click(screen.getByRole("button", { name: "Add character" }));
    await user.click(screen.getAllByRole("button", { name: "Edit" })[1]);
    await user.click(screen.getByRole("button", { name: "Delete character" }));

    const dialog = screen.getByRole("alertdialog", { name: "Delete Kylle?" });
    expect(within(dialog).getByText(/currently “me”/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(3);
    expect(screen.getAllByText("Kylle").length).toBeGreaterThan(0);
  });

  it("closes the character deletion dialog from its header", async () => {
    const user = userEvent.setup();
    render(<Studio />);

    await user.click(screen.getByRole("button", { name: "Add character" }));
    await user.click(screen.getAllByRole("button", { name: "Edit" })[1]);
    await user.click(screen.getByRole("button", { name: "Delete character" }));

    const dialog = screen.getByRole("alertdialog", { name: "Delete Kylle?" });
    await user.click(within(dialog).getByRole("button", { name: "Close delete dialog" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(3);
  });

  it("applies the chosen reassignment before closing the usage dialog", async () => {
    const user = userEvent.setup();
    render(<Studio />);

    await user.click(screen.getByRole("button", { name: "Add character" }));
    await user.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    await user.click(screen.getByRole("button", { name: "Delete character" }));

    const dialog = screen.getByRole("alertdialog", { name: "Delete Jaz?" });
    const reassignment = within(dialog).getByRole("button", {
      name: /Reassign messages to/,
    });
    await user.click(reassignment);
    await user.click(screen.getByRole("option", { name: "Kylle" }));
    await user.click(within(dialog).getByRole("button", { name: "Reassign and delete" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(2);
    expect(screen.getAllByRole("textbox", { name: "Message from Kylle" })).toHaveLength(4);
  });

  it("supports keyboard selection in properties dropdowns", async () => {
    const user = userEvent.setup();
    render(<Studio />);

    // HeroUI's Select trigger is a button labelled by its value plus its label,
    // so the name is a substring match rather than the old `combobox` role.
    const ownerSelect = screen.getByRole("button", { name: /Whose phone/ });
    ownerSelect.focus();
    await user.keyboard("{Enter}{ArrowUp}{Enter}");

    expect(ownerSelect).toHaveTextContent("Jaz");
    expect(screen.getAllByText("This phone")[0]).toBeInTheDocument();
  });

  it("provides accessible names for editable project and read-time fields", () => {
    render(<Studio />);

    expect(screen.getByRole("textbox", { name: "Episode title" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Episode description" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Read time" })).toBeInTheDocument();
  });
});
