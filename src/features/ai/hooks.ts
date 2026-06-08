"use client";

import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { sendChatMessage, sendStreamingChat } from "./api";
import type { ChatRequest } from "@/app/api/ai/contract";

export function useChat() {
  return useMutation({
    mutationFn: (messages: ChatRequest["messages"]) =>
      sendChatMessage(messages),
  });
}

export function useStreamingChat() {
  const [buffer, setBuffer] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const stream = useCallback(
    async (messages: ChatRequest["messages"]) => {
      setBuffer("");
      setIsStreaming(true);
      try {
        await sendStreamingChat(messages, (text) => {
          setBuffer((prev) => prev + text);
        });
      } finally {
        setIsStreaming(false);
      }
    },
    []
  );

  return { buffer, isStreaming, stream };
}
