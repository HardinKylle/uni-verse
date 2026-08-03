import { createClient } from "@supabase/supabase-js";
import {
  createAdminClient,
  createConfirmedUser,
  deleteTestUser,
  env,
  expect,
  storageObjectExists,
  test,
  TINY_PNG,
} from "./fixtures";
import type { Database } from "../src/lib/supabase/database.types";

// Cross-user isolation is a property of the API/RLS boundary, not the UI: the
// studio never offers a way to reach another user's data, so driving two
// browsers proves nothing here. Instead we hit the same path the browser does
// — the anon PostgREST/storage endpoints carrying a real per-user JWT — and
// assert Postgres row-level security denies every cross-user read and write.

/** An anon-key client authenticated as one user — exactly what the browser holds. */
async function signInAs(email: string, password: string) {
  const client = createClient<Database>(env("NEXT_PUBLIC_SUPABASE_URL"), env("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}

test("user B cannot read or write user A's stories, episodes, characters, or avatar objects", async () => {
  const admin = createAdminClient();
  const userA = await createConfirmedUser(admin);
  const userB = await createConfirmedUser(admin);

  try {
    const a = await signInAs(userA.email, userA.password);
    const b = await signInAs(userB.email, userB.password);

    // --- A builds a full workspace, then reads back the ids it owns. ---
    const characterId = crypto.randomUUID();
    const { error: bootstrapError } = await a.rpc("bootstrap_workspace", {
      p_script: {},
      p_characters: [{ id: characterId, name: "A-hero", color: "#ff7a7a", avatar: null }],
    });
    expect(bootstrapError).toBeNull();

    const { data: aProjects } = await a.from("projects").select("id");
    const projectId = aProjects?.[0]?.id;
    expect(projectId).toBeTruthy();
    const { data: aEpisodes } = await a.from("episodes").select("id").eq("project_id", projectId!);
    const episodeId = aEpisodes?.[0]?.id;
    expect(episodeId).toBeTruthy();

    // A uploads an avatar into its own user-scoped folder.
    const objectPath = `${userA.id}/${characterId}-${Date.now()}.png`;
    const { error: aUploadError } = await a.storage
      .from("avatars")
      .upload(objectPath, TINY_PNG, { contentType: "image/png" });
    expect(aUploadError).toBeNull();

    // --- B reads A's rows: RLS filters them out entirely (no leak, no error). ---
    expect((await b.from("projects").select("*").eq("id", projectId!)).data).toEqual([]);
    expect((await b.from("episodes").select("*").eq("id", episodeId!)).data).toEqual([]);
    expect((await b.from("characters").select("*").eq("id", characterId)).data).toEqual([]);

    // --- B writes A's rows: updates/deletes match zero rows; inserts are rejected. ---
    expect((await b.from("projects").update({ title: "hijacked" }).eq("id", projectId!).select()).data).toEqual([]);
    expect((await b.from("episodes").update({ title: "hijacked" }).eq("id", episodeId!).select()).data).toEqual([]);
    expect((await b.from("characters").update({ name: "hijacked" }).eq("id", characterId).select()).data).toEqual([]);
    expect((await b.from("characters").delete().eq("id", characterId).select()).data).toEqual([]);

    // Inserting a character into A's project violates the WITH CHECK policy.
    const insert = await b
      .from("characters")
      .insert({ id: crypto.randomUUID(), project_id: projectId!, name: "intruder", color: "#000000" })
      .select();
    expect(insert.error).not.toBeNull();

    // --- Storage: B cannot write into A's folder. (Public read is intentional —
    // avatars are destined for public screenshots — so only writes are guarded.)
    const bUpload = await b.storage
      .from("avatars")
      .upload(`${userA.id}/intruder-${Date.now()}.png`, TINY_PNG, { contentType: "image/png" });
    expect(bUpload.error).not.toBeNull();

    const bRemove = await b.storage.from("avatars").remove([objectPath]);
    expect(bRemove.data ?? []).toEqual([]);

    // --- A's data survived every attempt untouched. ---
    const { data: intactProject } = await a.from("projects").select("title").eq("id", projectId!).single();
    expect(intactProject?.title).not.toBe("hijacked");
    const { data: intactCharacter } = await a.from("characters").select("name").eq("id", characterId).single();
    expect(intactCharacter?.name).toBe("A-hero");
    expect(await storageObjectExists(admin, objectPath)).toBe(true);
  } finally {
    await deleteTestUser(admin, userA.id);
    await deleteTestUser(admin, userB.id);
  }
});
