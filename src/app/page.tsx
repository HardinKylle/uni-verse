import { Studio } from "./_components/studio/studio";
import { loadOrCreateWorkspace } from "./_components/studio/workspace";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function Home() {
  const user = await getCurrentUser();

  const displayName = user
    ? (user.user_metadata.full_name as string | undefined) ?? user.email ?? "Signed-in writer"
    : undefined;
  const initialData = user ? await loadOrCreateWorkspace(user.id) : undefined;

  return <Studio authenticatedUser={displayName} initialData={initialData} />;
}
