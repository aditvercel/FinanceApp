export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface MessageThread {
  id: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}
