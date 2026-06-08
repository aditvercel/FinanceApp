import type { ChatRequest, ChatResponse } from "@/app/api/ai/contract";

export async function sendChatMessage(
  messages: ChatRequest["messages"]
): Promise<ChatResponse> {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages } satisfies ChatRequest),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Chat failed");
  return json.data as ChatResponse;
}

export async function sendStreamingChat(
  messages: ChatRequest["messages"],
  onDelta: (text: string) => void
): Promise<void> {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify({ messages } satisfies ChatRequest),
  });
  if (!res.ok) throw new Error("Stream chat failed");
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    onDelta(decoder.decode(value));
  }
}
