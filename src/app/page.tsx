import { Studio } from "./_components/studio/studio";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const displayName = user
    ? (user.user_metadata.full_name as string | undefined) ?? user.email ?? "Signed-in writer"
    : undefined;

  return <Studio authenticatedUser={displayName} />;
}
