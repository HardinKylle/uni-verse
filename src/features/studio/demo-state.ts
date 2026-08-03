import type { StudioState } from "./types";

// TODO(pre-production content): this demo copy — character names, message text,
// episode title/description — doubles as anonymous onboarding and e2e ground
// truth, and seeds every new account's first episode via bootstrap_workspace.
// It is placeholder writing to revisit before a production environment exists
// (PRD Further Notes). Changing the character names or message text here will
// break the specs that assert against them (e.g. "Message from Jaz").
export const demoState: StudioState = {
  dark: false,
  characters: [
    { id: "11111111-1111-4111-8111-111111111111", name: "Jaz", color: "#ff7a7a" },
    { id: "22222222-2222-4222-8222-222222222222", name: "Kylle", color: "#5aa9e6" },
  ],
  ownerId: "22222222-2222-4222-8222-222222222222",
  activeSenderId: "11111111-1111-4111-8111-111111111111",
  messages: [
    { id: "m1", senderId: "11111111-1111-4111-8111-111111111111", text: "are you still awake?" },
    { id: "m2", senderId: "22222222-2222-4222-8222-222222222222", text: "maybe. why?" },
    { id: "m3", senderId: "11111111-1111-4111-8111-111111111111", text: "i wanted to say goodnight" },
    { id: "m4", senderId: "22222222-2222-4222-8222-222222222222", text: "say it tomorrow. in person?" },
  ],
  editingCharacterId: null,
  status: "Delivered",
  day: "Today",
  time: "9:41",
  meridiem: "AM",
  inbox: 12,
  readTime: "10:01 PM",
  bubbleColor: "blue",
  draft: "",
  episodeTitle: "Untitled Episode",
  episodeDescription: "A new story...",
  isRightPanelOpen: true,
  showKeyboard: false,
  frameBreaks: [],
};
