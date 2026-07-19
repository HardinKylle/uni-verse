import { ClaimUsernameForm } from "@/features/account/claim-username-form";
import { Studio } from "@/features/studio/studio";
import { ensureFirstProject } from "@/features/studio/persistence/workspace";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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

  const firstProjectId = await ensureFirstProject(user.id);
  redirect(firstProjectId ? `/p/${firstProjectId}` : "/dashboard");
}
