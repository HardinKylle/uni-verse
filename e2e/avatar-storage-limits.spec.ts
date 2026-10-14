import { createClient } from "@supabase/supabase-js";

import {
  createAdminClient,
  createConfirmedUser,
  deleteTestUser,
  env,
  expect,
  test,
  TINY_PNG,
} from "./fixtures";

test("Storage rejects disallowed avatar types and oversized files without the UI", async () => {
  const admin = createAdminClient();
  const user = await createConfirmedUser(admin);

  try {
    const client = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: signInError } = await client.auth.signInWithPassword({
      email: user.email,
      password: user.password,
    });
    expect(signInError).toBeNull();

    const bucket = client.storage.from("avatars");
    const prefix = `${user.id}/${crypto.randomUUID()}`;
    const valid = await bucket.upload(`${prefix}.png`, TINY_PNG, { contentType: "image/png" });
    expect(valid.error).toBeNull();

    const html = await bucket.upload(`${prefix}.html`, Buffer.from("<p>Not an avatar</p>"), {
      contentType: "text/html",
    });
    expect(html.error).not.toBeNull();
    expect(Number(html.error?.statusCode)).toBe(415);

    const svg = await bucket.upload(`${prefix}.svg`, Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), {
      contentType: "image/svg+xml",
    });
    expect(svg.error).not.toBeNull();
    expect(Number(svg.error?.statusCode)).toBe(415);

    const oversized = await bucket.upload(`${prefix}-large.png`, Buffer.alloc(2 * 1024 * 1024 + 1), {
      contentType: "image/png",
    });
    expect(oversized.error).not.toBeNull();
    expect(Number(oversized.error?.statusCode)).toBe(413);
  } finally {
    await deleteTestUser(admin, user.id);
  }
});
