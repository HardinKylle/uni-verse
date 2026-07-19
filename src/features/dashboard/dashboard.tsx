"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, LoaderCircle, Pencil, Plus } from "lucide-react";

import { createBlankProjectSeed } from "./new-project";
import { Button } from "@heroui/react";

import { SignOutButton } from "@/features/account/sign-out-button";
import type { ProjectSummary } from "./types";
import type { Json } from "@/lib/supabase/database.types";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function Dashboard({
  username,
  projects: initialProjects,
}: {
  username: string;
  projects: ProjectSummary[];
}) {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [openingProjectId, setOpeningProjectId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function createProject() {
    if (isCreating) return;
    setIsCreating(true);
    setError(null);

    const seed = createBlankProjectSeed();
    const { data, error: createError } = await getSupabaseBrowserClient().rpc("create_project", {
      p_title: seed.title,
      p_script: seed.script as unknown as Json,
      p_characters: seed.characters as unknown as Json,
    });

    if (createError || !data) {
      setIsCreating(false);
      setError("The story could not be created. Please try again.");
      return;
    }

    router.push(`/p/${data}`);
  }

  function beginEdit(project: ProjectSummary) {
    setEditingId(project.id);
    setDraftTitle(project.title);
    setDraftDescription(project.description);
    setError(null);
  }

  async function commitEdit(project: ProjectSummary) {
    if (editingId !== project.id) return;

    const nextTitle = draftTitle.trim() || "Untitled Story";
    const nextDescription = draftDescription.trim();
    setEditingId(null);
    if (nextTitle === project.title && nextDescription === project.description) return;

    setProjects((current) => current.map((item) => (
      item.id === project.id
        ? { ...item, title: nextTitle, description: nextDescription, updatedAt: new Date().toISOString() }
        : item
    )));
    setError(null);

    const { error: saveError } = await getSupabaseBrowserClient()
      .from("projects")
      .update({ title: nextTitle, description: nextDescription })
      .eq("id", project.id)
      .select("id")
      .single();

    if (saveError) {
      setProjects((current) => current.map((item) => (
        item.id === project.id ? project : item
      )));
      setError("The story could not be updated. Please try again.");
    }
  }

  return (
    <main className="min-h-screen bg-[#F7F3EF] text-sand-900">
      <header className="border-b border-sand-200/80 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link
            href="/dashboard"
            className="rounded-sm font-display text-2xl leading-none text-sand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
          >
            Kathalis<span className="text-accent-500">.</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden max-w-56 truncate text-xs text-sand-500 sm:block">
              Signed in as {username}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="flex flex-col gap-5 border-b border-sand-200 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-accent-600">Your library</p>
            <h1 className="mt-2 font-display text-4xl text-sand-900 sm:text-5xl">Stories</h1>
          </div>
          <Button
            variant="primary"
            size="lg"
            className="self-start sm:self-auto"
            isDisabled={isCreating}
            onPress={createProject}
          >
            {isCreating ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
            ) : (
              <Plus className="size-4" aria-hidden />
            )}
            {isCreating ? "Creating…" : "New story"}
          </Button>
        </div>

        {error ? (
          <p role="alert" className="mt-6 rounded-lg border border-accent-200 bg-accent-100 px-4 py-3 text-sm text-accent-800">
            {error}
          </p>
        ) : null}

        <section aria-label="Projects" className="divide-y divide-sand-200">
          {projects.map((project) => (
            <article
              key={project.id}
              aria-busy={openingProjectId === project.id}
              className="group relative py-6 pr-24 sm:py-7 sm:pr-28"
            >
              {editingId === project.id ? (
                <form
                  className="max-w-2xl space-y-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void commitEdit(project);
                  }}
                  onBlur={(event) => {
                    if (event.currentTarget.contains(event.relatedTarget)) return;
                    void commitEdit(project);
                  }}
                >
                  <label className="block">
                    <span className="sr-only">Story title</span>
                    <input
                      autoFocus
                      value={draftTitle}
                      onChange={(event) => setDraftTitle(event.target.value)}
                      className="h-11 w-full rounded-lg border border-accent-500 bg-white px-3 font-display text-2xl text-sand-900 outline-none ring-2 ring-accent-100"
                    />
                  </label>
                  <label className="block">
                    <span className="sr-only">Story description</span>
                    <textarea
                      rows={2}
                      value={draftDescription}
                      placeholder="What is this story about?"
                      onChange={(event) => setDraftDescription(event.target.value)}
                      className="w-full resize-none rounded-lg border border-sand-200 bg-white px-3 py-2 text-sm leading-6 text-sand-700 outline-none placeholder:text-sand-400 focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
                    />
                  </label>
                </form>
              ) : (
                <Link
                  href={`/p/${project.id}`}
                  onClick={() => setOpeningProjectId(project.id)}
                  className="block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                >
                  <h2 className="font-display text-2xl text-sand-900 transition-colors group-hover:text-accent-600">
                    {project.title}
                  </h2>
                  <p className={`mt-2 line-clamp-2 max-w-2xl text-sm leading-6 ${project.description ? "text-sand-600" : "italic text-sand-400"}`}>
                    {project.description || "No description yet"}
                  </p>
                  <time dateTime={project.updatedAt} className="mt-3 block text-xs text-sand-400">
                    Updated {formatUpdatedAt(project.updatedAt)}
                  </time>
                </Link>
              )}

              {editingId !== project.id ? (
                <div className="absolute right-0 top-6 flex items-center gap-1 sm:top-7">
                  <Button
                    variant="ghost"
                    isIconOnly
                    aria-label={`Edit ${project.title}`}
                    onPress={() => beginEdit(project)}
                  >
                    <Pencil className="size-4" aria-hidden />
                  </Button>
                  <Link
                    href={`/p/${project.id}`}
                    onClick={() => setOpeningProjectId(project.id)}
                    className="flex size-9 items-center justify-center rounded-lg text-sand-400 transition-colors hover:bg-white hover:text-accent-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                    aria-label={`Open ${project.title}`}
                    title="Open story"
                  >
                    {openingProjectId === project.id ? (
                      <LoaderCircle className="size-4 animate-spin text-accent-500" aria-hidden />
                    ) : (
                      <ArrowUpRight className="size-4" aria-hidden />
                    )}
                  </Link>
                </div>
              ) : null}
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
