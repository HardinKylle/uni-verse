export type Character = {
  id: string;
  name: string;
  color: string;
  avatar?: string;
};

export type Message = {
  id: string;
  senderId: string;
  text: string;
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
};
