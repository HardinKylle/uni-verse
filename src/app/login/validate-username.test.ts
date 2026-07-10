import { describe, expect, it } from "vitest";
import { normalizeUsername, RESERVED_USERNAMES, usernameError } from "./validate-username";

describe("normalizeUsername", () => {
  it("trims surrounding whitespace", () => {
    expect(normalizeUsername("  jaz  ")).toBe("jaz");
  });

  it("drops a single leading @", () => {
    expect(normalizeUsername("@jaz")).toBe("jaz");
  });

  it("lowercases the result", () => {
    expect(normalizeUsername("@Jaz_Writer")).toBe("jaz_writer");
  });

  it("combines trimming, @-stripping, and lowercasing", () => {
    expect(normalizeUsername("  @Jaz  ")).toBe("jaz");
  });
});

describe("usernameError", () => {
  it("rejects a username shorter than the minimum", () => {
    expect(usernameError("ab")).toBe(
      "Usernames are 3–20 characters, using lowercase letters, numbers, and underscores.",
    );
  });

  it("rejects a username longer than the maximum", () => {
    expect(usernameError("a".repeat(21))).toBe(
      "Usernames are 3–20 characters, using lowercase letters, numbers, and underscores.",
    );
  });

  it("rejects uppercase characters", () => {
    expect(usernameError("Jazwriter")).toBe(
      "Usernames are 3–20 characters, using lowercase letters, numbers, and underscores.",
    );
  });

  it("rejects invalid characters like hyphens", () => {
    expect(usernameError("jaz-writer")).toBe(
      "Usernames are 3–20 characters, using lowercase letters, numbers, and underscores.",
    );
  });

  it("rejects reserved names", () => {
    for (const reserved of RESERVED_USERNAMES) {
      expect(usernameError(reserved)).toBe("That username is reserved.");
    }
  });

  it("accepts a valid username", () => {
    expect(usernameError("jaz_writer")).toBeNull();
  });

  it("accepts a username at the minimum length", () => {
    expect(usernameError("abc")).toBeNull();
  });

  it("accepts a username at the maximum length", () => {
    expect(usernameError("a".repeat(20))).toBeNull();
  });
});
