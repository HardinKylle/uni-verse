export type Character = {
  id: string;
  name: string;
  color: string;
  /** Display URL: a data URL (demo/anon), an optimistic blob URL, or a resolved public URL. */
  avatar?: string;
  /** Storage object path — the persisted value the character-row diff writes to `avatar_path`. */
  avatarPath?: string;
};

export type MessageType = "text" | "timestamp";

export type Message = {
  id: string;
  senderId: string;
  text: string;
  type?: MessageType;
};

export type DeliveryStatus = "Delivered" | "Read" | "None";
export type BubbleColor = "blue" | "green";
export type Meridiem = "AM" | "PM";

export type StudioState = {
  dark: boolean;
  characters: Character[];
  ownerId: string;
  activeSenderId: string;
  messages: Message[];
  editingCharacterId: string | null;
  status: DeliveryStatus;
  day: string;
  time: string;
  meridiem: Meridiem;
  inbox: number | "";
  readTime: string;
  bubbleColor: BubbleColor;
  draft: string;
  projectName: string;
  projectDescription: string;
  isRightPanelOpen: boolean;
  showKeyboard: boolean;
  /** Message ids that force a new export frame to start immediately before them. */
  frameBreaks: string[];
};

export type StudioInitialData = {
  state: StudioState;
  projectId: string;
  userId: string;
  episode: { id: string; updatedAt: string };
};
