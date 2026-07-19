import type { ProjectSummary } from "./types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function listProjects(userId: string): Promise<ProjectSummary[]> {
  const supabase = await createSupabaseServerClient();
  const result = await supabase
    .from("projects")
    .select("id, title, description, updated_at, episodes(updated_at)")
    .eq("owner_id", userId);

  if (result.error) throw result.error;

  // `projects.updated_at` only moves when the metadata itself changes, so writing
  // inside an episode would never surface here. Take the most recent touch of
  // either the project or any of its episodes.
  return result.data
    .map((project) => ({
      id: project.id,
      title: project.title,
      description: project.description,
      updatedAt: [project.updated_at, ...project.episodes.map((episode) => episode.updated_at)]
        .reduce((latest, candidate) => (candidate > latest ? candidate : latest)),
    }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
