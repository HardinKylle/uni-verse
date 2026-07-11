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

export async function loadOrCreateWorkspace(userId: string): Promise<StudioInitialData> {
  const supabase = await createSupabaseServerClient();
  const initialProject = await supabase
    .from("projects")
    .select("id, title, description")
    .eq("owner_id", userId)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  let project = initialProject.data;

  if (initialProject.error) throw initialProject.error;
  if (!project) {
    const seed = createWorkspaceSeed();
    const { error } = await supabase.rpc("bootstrap_workspace", {
      p_script: serializeEpisode(seed) as unknown as Json,
      p_characters: seed.characters as unknown as Json,
    });
    if (error) throw error;

    const result = await supabase
      .from("projects")
      .select("id, title, description")
      .eq("owner_id", userId)
      .order("created_at")
      .limit(1)
      .single();
    if (result.error) throw result.error;
    project = result.data;
  }

  const [charactersResult, episodeResult] = await Promise.all([
    supabase
      .from("characters")
      .select("id, name, color, avatar_path")
      .eq("project_id", project.id)
      .order("position"),
    supabase
      .from("episodes")
      .select("id, script, updated_at")
      .eq("project_id", project.id)
      .order("position")
      .limit(1)
      .single(),
  ]);

  if (charactersResult.error) throw charactersResult.error;
  if (episodeResult.error) throw episodeResult.error;

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
  const state = deserializeEpisode(episodeResult.data.script, characters);
  state.projectName = project.title;
  state.projectDescription = project.description;

  return {
    state,
    projectId: project.id,
    userId,
    episode: {
      id: episodeResult.data.id,
      updatedAt: episodeResult.data.updated_at,
    },
  };
}
