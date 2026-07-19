import { demoState } from "../demo-state";
import { deserializeEpisode, serializeEpisode } from "./episode-doc";
import type { Character, StudioInitialData } from "../types";
import type { Json } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function createWorkspaceSeed() {
  const senderIds = [crypto.randomUUID(), crypto.randomUUID()];
  const idMap = new Map(demoState.characters.map(({ id }, index) => [id, senderIds[index]]));

  return {
    ...demoState,
    characters: demoState.characters.map((character, index) => ({
      ...character,
      id: senderIds[index],
    })),
    messages: demoState.messages.map((message) => ({
      ...message,
      senderId: idMap.get(message.senderId) ?? senderIds[0],
    })),
    ownerId: idMap.get(demoState.ownerId) ?? senderIds[0],
    activeSenderId: idMap.get(demoState.activeSenderId) ?? senderIds[0],
  };
}

export async function ensureFirstProject(userId: string): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const initialProject = await supabase
    .from("projects")
    .select("id")
    .eq("owner_id", userId)
    .order("created_at")
    .limit(1)
    .maybeSingle();

  if (initialProject.error) throw initialProject.error;
  if (initialProject.data) return null;

  const seed = createWorkspaceSeed();
  const { error } = await supabase.rpc("bootstrap_workspace", {
    p_script: serializeEpisode(seed) as unknown as Json,
    p_characters: seed.characters as unknown as Json,
  });
  if (error) throw error;

  const result = await supabase
    .from("projects")
    .select("id")
    .eq("owner_id", userId)
    .order("created_at")
    .limit(1)
    .single();
  if (result.error) throw result.error;
  return result.data.id;
}

export async function loadProject(
  projectId: string,
  userId: string,
  requestedEpisodeId?: string,
): Promise<StudioInitialData | null> {
  const supabase = await createSupabaseServerClient();
  // RLS already scopes this to the owner; the explicit filter keeps the
  // guarantee visible in the query rather than resting on policy alone.
  const projectResult = await supabase
    .from("projects")
    .select("id, title")
    .eq("id", projectId)
    .eq("owner_id", userId)
    .maybeSingle();

  if (projectResult.error) throw projectResult.error;
  if (!projectResult.data) return null;
  const project = projectResult.data;

  const [charactersResult, episodeListResult] = await Promise.all([
    supabase
      .from("characters")
      .select("id, name, color, avatar_path")
      .eq("project_id", project.id)
      .order("position"),
    supabase
      .from("episodes")
      .select("id, title, position")
      .eq("project_id", project.id)
      .order("position"),
  ]);

  if (charactersResult.error) throw charactersResult.error;
  if (episodeListResult.error) throw episodeListResult.error;
  const selectedEpisode =
    episodeListResult.data.find(({ id }) => id === requestedEpisodeId) ?? episodeListResult.data[0];
  if (!selectedEpisode) throw new Error(`Project ${project.id} has no episodes`);

  const episodeResult = await supabase
    .from("episodes")
    .select("id, title, description, script, updated_at")
    .eq("id", selectedEpisode.id)
    .single();
  if (episodeResult.error) throw episodeResult.error;
  const episode = episodeResult.data;

  const characters: Character[] = charactersResult.data.map((character) => ({
    id: character.id,
    name: character.name,
    color: character.color,
    ...(character.avatar_path
      ? {
          avatarPath: character.avatar_path,
          avatar: supabase.storage.from("avatars").getPublicUrl(character.avatar_path).data.publicUrl,
        }
      : {}),
  }));
  const state = deserializeEpisode(episode.script, characters);
  state.episodeTitle = episode.title;
  state.episodeDescription = episode.description;

  return {
    state,
    projectId: project.id,
    projectTitle: project.title,
    userId,
    episode: {
      id: episode.id,
      updatedAt: episode.updated_at,
    },
    episodes: episodeListResult.data,
  };
}
