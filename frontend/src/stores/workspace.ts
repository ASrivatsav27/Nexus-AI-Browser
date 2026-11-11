import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AgentResponse } from "@/lib/schemas";

type Message = { id: string; role: "user" | "assistant"; text: string; result?: AgentResponse };
type WorkspaceState = {
  theme: "light" | "dark";
  messages: Message[];
  toggleTheme: () => void;
  addUserMessage: (text: string) => string;
  addAssistantResult: (id: string, result: AgentResponse) => void;
  addAssistantError: (id: string, text: string) => void;
};

export const useWorkspace = create<WorkspaceState>()(persist((set) => ({
  theme: "light",
  messages: [],
  toggleTheme: () => set((state) => ({ theme: state.theme === "light" ? "dark" : "light" })),
  addUserMessage: (text) => {
    const id = crypto.randomUUID();
    set((state) => ({ messages: [...state.messages, { id, role: "user", text }, { id: `${id}-pending`, role: "assistant", text: "Working on it…" }] }));
    return `${id}-pending`;
  },
  addAssistantResult: (id, result) => set((state) => ({ messages: state.messages.map((message) => message.id === id ? { ...message, text: result.answer, result } : message) })),
  addAssistantError: (id, text) => set((state) => ({ messages: state.messages.map((message) => message.id === id ? { ...message, text } : message) })),
}), { name: "nexus-workspace", partialize: (state) => ({ theme: state.theme, messages: state.messages }) }));
