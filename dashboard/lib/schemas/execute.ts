import { z } from "zod";

export const ExecuteSchema = z.object({
  project: z.string().min(1),
  taskId: z.coerce.number(),
  pane: z.string().min(1),
  taskTitle: z.string().default(""),
  taskDescription: z.string().default(""),
  mode: z.string().default(""),
  session: z.string().default("new"),
  contextFiles: z.array(z.string()).optional(),
  branchAction: z.enum(["stay", "checkout", "create"]).optional(),
  branchName: z.string().optional(),
  baseBranch: z.string().optional(),
});
