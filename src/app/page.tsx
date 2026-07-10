import { ClaimUsernameForm } from "@/features/account/claim-username-form";
import { Studio } from "@/features/studio/studio";
import { loadOrCreateWorkspace } from "@/features/studio/persistence/workspace";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) return <Studio />;

  const supabase = await createSupabaseServerClient();
  const profile = await supabase.from("profiles").select("username").eq("id", user.id).maybeSingle();
  if (profile.error) throw profile.error;

  if (!profile.data?.username) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F3EF] px-6 py-12">
        <ClaimUsernameForm />
      </main>
    );
  }

  const initialData = await loadOrCreateWorkspace(user.id);
  return <Studio authenticatedUser={`@${profile.data.username}`} initialData={initialData} />;
}
