"use server";

import { createExecuteService, createTaskService } from "../container";
import { ExecuteSchema } from "../schemas/execute";

type ActionResult<T = unknown> = { success: true; data: T } | { success: false; error: string };

export async function executeTask(input: unknown): Promise<ActionResult> {
  const parsed = ExecuteSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const data = parsed.data;
  const projects = createTaskService().getProjects();
  const projectDir = projects[data.project] || process.cwd();

  try {
    const result = await createExecuteService().execute({
      ...data,
      projectDir,
    });
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function interruptTask(project: string, taskId: number): Promise<ActionResult> {
  const result = createExecuteService().interrupt(project, taskId);
  if (result.error) return { success: false, error: result.error };
  return { success: true, data: { pane: result.pane } };
}
