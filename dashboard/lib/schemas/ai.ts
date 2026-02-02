import { z } from "zod";

const historyEntry = z.object({
  role: z.string(),
  content: z.string(),
});

export const RefineTaskSchema = z.object({
  action: z.literal("refine-task"),
  payload: z.object({
    notes: z.string().min(1),
    project: z.string().optional(),
  }),
});

export const SuggestSubtasksSchema = z.object({
  action: z.literal("suggest-subtasks"),
  payload: z.object({
    title: z.string().min(1),
    description: z.string(),
  }),
});

export const SuggestTasksSchema = z.object({
  action: z.literal("suggest-tasks"),
  payload: z.object({
    tasks: z.array(z.object({
      id: z.number(),
      title: z.string(),
      status: z.string(),
      dependencies: z.array(z.number()),
    })),
  }),
});

export const ChatSchema = z.object({
  action: z.enum(["chat", "breakdown"]),
  payload: z.object({
    title: z.string().min(1),
    description: z.string(),
    subtasks: z.array(z.string()).optional(),
    message: z.string().min(1),
    history: z.array(historyEntry).optional(),
  }),
});

export const AiActionSchema = z.discriminatedUnion("action", [
  RefineTaskSchema,
  SuggestSubtasksSchema,
  SuggestTasksSchema,
  ChatSchema,
]);
