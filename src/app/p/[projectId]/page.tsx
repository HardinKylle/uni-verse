import { notFound } from "next/navigation";

import { requireProfiledUser } from "@/features/account/require-profiled-user";
import { Studio } from "@/features/studio/studio";
import { loadProject } from "@/features/studio/persistence/workspace";

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ episode?: string | string[] }>;
}) {
  const { userId, username } = await requireProfiledUser();

  const { projectId } = await params;
  const episodeParam = (await searchParams).episode;
  const initialData = await loadProject(
    projectId,
    userId,
    typeof episodeParam === "string" ? episodeParam : undefined,
  );
  if (!initialData) notFound();

  return (
    <Studio
      key={initialData.episode.id}
      authenticatedUser={`@${username}`}
      initialData={initialData}
    />
  );
}
