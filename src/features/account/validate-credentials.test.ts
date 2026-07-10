import { describe, expect, it } from "vitest";
import { confirmPasswordError, MIN_PASSWORD_LENGTH, passwordError } from "./validate-credentials";

describe("passwordError", () => {
  it("rejects an empty password", () => {
    expect(passwordError("")).toBe("Password must be at least 8 characters.");
  });

  it("rejects a password shorter than the minimum", () => {
    expect(passwordError("Abc123")).toBe("Password must be at least 8 characters.");
  });

  it("rejects a password missing a lowercase letter", () => {
    expect(passwordError("ABCD1234")).toBe("Password must include a lowercase letter.");
  });

  it("rejects a password missing an uppercase letter", () => {
    expect(passwordError("abcd1234")).toBe("Password must include an uppercase letter.");
  });

  it("rejects a password missing a digit", () => {
    expect(passwordError("Abcdefgh")).toBe("Password must include a number.");
  });

  it("accepts a password meeting length and character-class requirements", () => {
    expect(passwordError("Abcd1234")).toBeNull();
  });

  it("accepts a longer password meeting character-class requirements", () => {
    expect(passwordError("A-very-long-password-1")).toBeNull();
  });

  it("exposes the minimum length used by the message", () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8);
  });
});

describe("confirmPasswordError", () => {
  it("rejects a confirmation that doesn't match the password", () => {
    expect(confirmPasswordError("Abcd1234", "Abcd1235")).toBe("Passwords do not match.");
  });

  it("rejects an empty confirmation", () => {
    expect(confirmPasswordError("Abcd1234", "")).toBe("Passwords do not match.");
  });

  it("accepts a confirmation matching the password", () => {
    expect(confirmPasswordError("Abcd1234", "Abcd1234")).toBeNull();
  });
});
