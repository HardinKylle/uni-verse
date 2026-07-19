import { redirect } from "next/navigation";

import { requireProfiledUser } from "@/features/account/require-profiled-user";
import { Dashboard } from "@/features/dashboard/dashboard";
import { listProjects } from "@/features/dashboard/projects";

export default async function DashboardPage() {
  const { userId, username } = await requireProfiledUser();

  const projects = await listProjects(userId);
  if (projects.length === 0) redirect("/");

  return <Dashboard username={`@${username}`} projects={projects} />;
}
