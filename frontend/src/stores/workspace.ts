import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AgentResponse } from "@/lib/schemas";

export type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  status?: "pending" | "error";
  pageTitle?: string;
  pageUrl?: string;
  result?: AgentResponse;
};
type WorkspaceState = {
  theme: "light" | "dark";
  assistantOpen: boolean;
  messages: Message[];
  toggleTheme: () => void;
  toggleAssistant: () => void;
  addUserMessage: (text: string, page?: { title: string; url: string }) => string;
  addAssistantResult: (id: string, result: AgentResponse) => void;
  addAssistantError: (id: string, text: string) => void;
  clearMessages: () => void;
};

export const useWorkspace = create<WorkspaceState>()(persist((set) => ({
  theme: "light",
  assistantOpen: true,
  messages: [],
  toggleTheme: () => set((state) => ({ theme: state.theme === "light" ? "dark" : "light" })),
  toggleAssistant: () => set((state) => ({ assistantOpen: !state.assistantOpen })),
  addUserMessage: (text, page) => {
    const id = crypto.randomUUID();
    set((state) => ({ messages: [...state.messages, { id, role: "user", text, pageTitle: page?.title, pageUrl: page?.url }, { id: `${id}-pending`, role: "assistant", text: "", status: "pending" }] }));
    return `${id}-pending`;
  },
  addAssistantResult: (id, result) => set((state) => ({ messages: state.messages.map((message) => message.id === id ? { ...message, text: result.answer, status: undefined, result } : message) })),
  addAssistantError: (id, text) => set((state) => ({ messages: state.messages.map((message) => message.id === id ? { ...message, text, status: "error" } : message) })),
  clearMessages: () => set({ messages: [] }),
}), {
  name: "nexus-workspace",
  version: 2,
  // A request that never settled (app closed mid-run) must not persist as "working".
  partialize: (state) => ({ theme: state.theme, assistantOpen: state.assistantOpen, messages: state.messages.map((m) => m.status === "pending" ? { ...m, text: "This request was interrupted.", status: "error" as const } : m) }),
  migrate: (persisted) => ({ ...(persisted as object), messages: [] }) as never,
}));
