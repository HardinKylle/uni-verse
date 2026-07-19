import { redirect } from "next/navigation";

import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";

/**
 * Gate for pages that only make sense once a visitor has both a session and a
 * claimed username. Sends anonymous visitors to sign in and unnamed accounts
 * back to `/`, where the claim form lives.
 */
export async function requireProfiledUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createSupabaseServerClient();
  const profile = await supabase.from("profiles").select("username").eq("id", user.id).maybeSingle();
  if (profile.error) throw profile.error;
  if (!profile.data?.username) redirect("/");

  return { userId: user.id, username: profile.data.username };
}
