import { notFound } from "next/navigation";

import { requireProfiledUser } from "@/features/account/require-profiled-user";
import { Studio } from "@/features/studio/studio";
import { loadProject } from "@/features/studio/persistence/workspace";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { userId, username } = await requireProfiledUser();

  const { projectId } = await params;
  const initialData = await loadProject(projectId, userId);
  if (!initialData) notFound();

  return <Studio authenticatedUser={`@${username}`} initialData={initialData} />;
}
