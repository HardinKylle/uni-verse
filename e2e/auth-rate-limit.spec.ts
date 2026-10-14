import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

import { createAdminClient, createConfirmedUser, deleteTestUser, env, expect, test } from "./fixtures";

test.setTimeout(60_000);

test("auth counters enforce concurrent limits, expire, and deny browser access", async () => {
  const admin = createAdminClient();
  const key = createHash("sha256").update(crypto.randomUUID()).digest("hex");
  const user = await createConfirmedUser(admin);

  try {
    const args = { p_key: key, p_limit: 3, p_window_seconds: 60 };
    const results = await Promise.all(Array.from({ length: 12 }, () => admin.rpc("consume_auth_rate_limit", args)));
    for (const result of results) expect(result.error).toBeNull();
    expect(results.filter((result) => result.data === true)).toHaveLength(3);

    const expired = await admin.from("auth_request_limits")
      .update({ expires_at: new Date(Date.now() - 1000).toISOString() }).eq("key", key);
    expect(expired.error).toBeNull();
    const reset = await admin.rpc("consume_auth_rate_limit", args);
    expect(reset.error).toBeNull();
    expect(reset.data).toBe(true);

    const browser = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    expect((await browser.rpc("consume_auth_rate_limit", args)).error?.code).toBe("42501");
    expect((await browser.from("auth_request_limits").select("*")).error?.code).toBe("42501");

    const signIn = await browser.auth.signInWithPassword({ email: user.email, password: user.password });
    expect(signIn.error).toBeNull();
    expect((await browser.rpc("consume_auth_rate_limit", args)).error?.code).toBe("42501");
    expect((await browser.from("auth_request_limits").delete().eq("key", key)).error?.code).toBe("42501");
  } finally {
    await admin.from("auth_request_limits").delete().eq("key", key);
    await deleteTestUser(admin, user.id);
  }
});
