import type { Character, DeliveryStatus, Meridiem, Message, StudioState } from "../types";

export type EpisodeDocument = {
  version: 1;
  messages: Message[];
  frameBreaks: string[];
  ownerId: string;
  activeSenderId: string;
  skin: {
    dark: boolean;
    status: DeliveryStatus;
    day: string;
    time: string;
    meridiem: Meridiem;
    inbox: number | "";
    readTime: string;
    bubbleColor: "blue" | "green";
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const stringValue = (value: unknown, fallback: string) =>
  typeof value === "string" ? value : fallback;

export function serializeEpisode(state: StudioState): EpisodeDocument {
  return {
    version: 1,
    messages: state.messages.map(({ id, senderId, text, type }) => ({
      id,
      senderId,
      text,
      ...(type ? { type } : {}),
    })),
    frameBreaks: [...state.frameBreaks],
    ownerId: state.ownerId,
    activeSenderId: state.activeSenderId,
    skin: {
      dark: state.dark,
      status: state.status,
      day: state.day,
      time: state.time,
      meridiem: state.meridiem,
      inbox: state.inbox,
      readTime: state.readTime,
      bubbleColor: state.bubbleColor,
    },
  };
}

export function deserializeEpisode(document: unknown, characters: Character[]): StudioState {
  const doc = isRecord(document) && document.version === 1 ? document : {};
  const skin = isRecord(doc.skin) ? doc.skin : {};
  const fallbackSender = characters[0]?.id ?? "";
  const senderIds = new Set(characters.map(({ id }) => id));
  const messages = Array.isArray(doc.messages)
    ? doc.messages.flatMap((value): Message[] => {
        if (!isRecord(value) || typeof value.id !== "string" || typeof value.text !== "string") return [];
        const type = value.type === "timestamp" ? "timestamp" : undefined;
        return [{
          id: value.id,
          senderId: typeof value.senderId === "string" && senderIds.has(value.senderId)
            ? value.senderId
            : fallbackSender,
          text: value.text,
          ...(type ? { type } : {}),
        }];
      })
    : [];
  const messageIds = new Set(messages.map(({ id }) => id));
  const ownerId = typeof doc.ownerId === "string" && senderIds.has(doc.ownerId)
    ? doc.ownerId
    : fallbackSender;
  const activeSenderId = typeof doc.activeSenderId === "string" && senderIds.has(doc.activeSenderId)
    ? doc.activeSenderId
    : fallbackSender;

  return {
    dark: typeof skin.dark === "boolean" ? skin.dark : false,
    characters,
    ownerId,
    activeSenderId,
    messages,
    editingCharacterId: null,
    status: skin.status === "Read" || skin.status === "None" ? skin.status : "Delivered",
    day: stringValue(skin.day, "Today"),
    time: stringValue(skin.time, "9:41"),
    meridiem: skin.meridiem === "PM" ? "PM" : "AM",
    inbox: typeof skin.inbox === "number" || skin.inbox === "" ? skin.inbox : 12,
    readTime: stringValue(skin.readTime, "10:01 PM"),
    bubbleColor: skin.bubbleColor === "green" ? "green" : "blue",
    draft: "",
    projectName: "Untitled Episode",
    projectDescription: "A new story...",
    isRightPanelOpen: true,
    showKeyboard: false,
    frameBreaks: Array.isArray(doc.frameBreaks)
      ? doc.frameBreaks.filter((id): id is string => typeof id === "string" && messageIds.has(id))
      : [],
  };
}
