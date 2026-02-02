import { z } from "zod";

// Coerce string|number to number
const taskIdNum = z.coerce.number();

// --- Task CRUD schemas ---

export const CreateTaskSchema = z.object({
  action: z.literal("create"),
  project: z.string().min(1),
  title: z.string().min(1),
  description: z.string().default(""),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  subtasks: z.array(z.string()).optional(),
  contextFiles: z.array(z.string()).optional(),
});

export const DeleteTaskSchema = z.object({
  action: z.literal("delete"),
  project: z.string().min(1),
  taskId: taskIdNum,
});

export const AddChatSchema = z.object({
  action: z.literal("addChat"),
  project: z.string().min(1),
  taskId: taskIdNum,
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
  actions: z.array(z.object({
    type: z.string(),
    title: z.string().optional(),
    value: z.string().optional(),
  })).optional(),
});

export const SubtaskAddSchema = z.object({
  project: z.string().min(1),
  taskId: taskIdNum,
  subtaskAction: z.literal("add"),
  subtaskTitle: z.string().min(1),
});

export const SubtaskUpdateStatusSchema = z.object({
  project: z.string().min(1),
  taskId: taskIdNum,
  subtaskAction: z.literal("updateStatus"),
  subtaskId: z.coerce.number(),
  subtaskStatus: z.string().min(1),
});

export const SubtaskDeleteSchema = z.object({
  project: z.string().min(1),
  taskId: taskIdNum,
  subtaskAction: z.literal("delete"),
  subtaskId: z.coerce.number(),
});

export const UpdateStatusSchema = z.object({
  project: z.string().min(1),
  taskId: taskIdNum,
  status: z.string().min(1),
});

export const UpdateFieldsSchema = z.object({
  project: z.string().min(1),
  taskId: taskIdNum,
  title: z.string().optional(),
  description: z.string().optional(),
  contextFiles: z.array(z.string()).optional(),
  acceptanceCriteria: z.array(z.string()).optional(),
});
