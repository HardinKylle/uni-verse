import { beforeEach, describe, expect, it, vi } from "vitest";

import { isUsernameTaken, signInWithUsername } from "./actions";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  serverClient: vi.fn(),
  headers: vi.fn(),
  limit: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.createClient }));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.serverClient }));
vi.mock("./rate-limit", () => ({
  limitAuthRequests: mocks.limit,
  AUTH_RATE_LIMIT_MESSAGE: "Please wait a minute and try again.",
}));

const admin = { from: vi.fn(), auth: { admin: { getUserById: vi.fn() } } };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createClient.mockReturnValue(admin);
  mocks.headers.mockResolvedValue(new Headers());
  mocks.limit.mockResolvedValue(false);
});

describe("auth action boundaries", () => {
  it("does not query profiles or authenticate when username sign-in is throttled", async () => {
    expect(await signInWithUsername("@Writer", "Password1")).toEqual({ error: "Please wait a minute and try again." });
    expect(mocks.limit).toHaveBeenCalledWith(admin, "username-signin", "writer", expect.any(Headers));
    expect(admin.from).not.toHaveBeenCalled();
    expect(admin.auth.admin.getUserById).not.toHaveBeenCalled();
    expect(mocks.serverClient).not.toHaveBeenCalled();
  });

  it("does not report a username as available when the lookup is throttled", async () => {
    expect(await isUsernameTaken("writer")).toEqual({ error: "Please wait a minute and try again." });
    expect(admin.from).not.toHaveBeenCalled();
  });

  it("rejects malformed action inputs before privileged work", async () => {
    expect(await signInWithUsername({ username: "writer" }, "Password1")).toEqual({ error: "Invalid login credentials" });
    expect(await signInWithUsername("writer", { password: "Password1" })).toEqual({ error: "Invalid login credentials" });
    expect(await isUsernameTaken(null)).toEqual({ taken: false });
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.limit).not.toHaveBeenCalled();
  });

  it("fails closed if the request context is unavailable", async () => {
    mocks.headers.mockRejectedValueOnce(new Error("Unavailable"));
    expect(await signInWithUsername("writer", "Password1")).toEqual({ error: "Please wait a minute and try again." });
    expect(admin.from).not.toHaveBeenCalled();
  });
});
