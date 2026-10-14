import { createClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Database } from "@/lib/supabase/database.types";
import { limitAuthRequests } from "./rate-limit";

vi.mock("server-only", () => ({}));

const response = (allowed: boolean) => new Response(JSON.stringify(allowed), {
  headers: { "Content-Type": "application/json" },
});

function setup() {
  const request = vi.fn<typeof fetch>().mockImplementation(async () => response(true));
  const admin = createClient<Database>("https://example.supabase.co", "test-service-key", {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: request },
  });
  return { admin, request };
}

beforeEach(() => {
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-key");
  vi.stubEnv("VERCEL", "1");
});

afterEach(() => vi.unstubAllEnvs());

describe("shared auth limits", () => {
  it("checks both IP and account limits for username sign-in without sending raw identifiers", async () => {
    const { admin, request } = setup();
    expect(await limitAuthRequests(admin, "username-signin", "private_writer", new Headers({
      "x-forwarded-for": "192.0.2.1",
    }))).toBe(true);

    const bodies = request.mock.calls.map((call) => JSON.parse(String(call[1]?.body)));
    expect(bodies).toHaveLength(2);
    expect(bodies.map((body) => body.p_limit)).toEqual([20, 10]);
    for (const body of bodies) {
      expect(body.p_key).toMatch(/^[a-f0-9]{64}$/);
      expect(body.p_window_seconds).toBe(60);
    }
    expect(bodies[0].p_key).not.toBe(bodies[1].p_key);
    expect(JSON.stringify(bodies)).not.toContain("private_writer");
    expect(JSON.stringify(bodies)).not.toContain("192.0.2.1");
  });

  it("blocks an IP before consuming the account limit", async () => {
    const { admin, request } = setup();
    request.mockResolvedValueOnce(response(false));
    expect(await limitAuthRequests(admin, "username-signin", "writer", new Headers())).toBe(false);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("limits username availability checks independently from sign-in", async () => {
    const { admin, request } = setup();
    expect(await limitAuthRequests(admin, "username-lookup", "writer", new Headers())).toBe(true);
    expect(request).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(request.mock.calls[0][1]?.body)).p_limit).toBe(60);
  });

  it("blocks requests when the database limiter fails", async () => {
    const { admin, request } = setup();
    request.mockImplementation(async () => new Response(JSON.stringify({ message: "RPC unavailable" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    }));
    expect(await limitAuthRequests(admin, "username-signin", "writer", new Headers())).toBe(false);
  });

  it("cannot be bypassed with forwarded headers outside the trusted Vercel proxy", async () => {
    vi.stubEnv("VERCEL", "");
    const { admin, request } = setup();
    await limitAuthRequests(admin, "username-lookup", "writer", new Headers({ "x-forwarded-for": "192.0.2.1" }));
    await limitAuthRequests(admin, "username-lookup", "writer", new Headers({ "x-forwarded-for": "192.0.2.2" }));
    const bodies = request.mock.calls.map((call) => JSON.parse(String(call[1]?.body)));
    expect(bodies[0].p_key).toBe(bodies[1].p_key);
  });

  it("blocks requests if the server secret is missing", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const { admin, request } = setup();
    expect(await limitAuthRequests(admin, "username-lookup", "writer", new Headers())).toBe(false);
    expect(request).not.toHaveBeenCalled();
  });
});
