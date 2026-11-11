import { z } from "zod";

export const pageSchema = z.object({ url: z.string(), title: z.string() });
export const agentResponseSchema = z.object({
  model: z.string(), answer: z.string(),
  actions: z.array(z.object({ tool: z.string(), ok: z.boolean(), error: z.string().optional() })),
  page: z.object({ url: z.string(), title: z.string(), pageText: z.string(), controls: z.array(z.unknown()) }),
});
export type AgentResponse = z.infer<typeof agentResponseSchema>;
