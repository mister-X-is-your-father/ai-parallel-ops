export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { createTaskService, createTaskMasterService, createGitService, resolveProjectDir } from "@/lib/container";
import { computeDependencyMetadata } from "@/lib/domain/dependency";
import { isValidTmStatus } from "@/lib/domain/validators";
import { resultToResponse } from "@/lib/schemas/result-response";
import {
  CreateTaskSchema, DeleteTaskSchema, AddChatSchema,
  SubtaskAddSchema, SubtaskUpdateStatusSchema, SubtaskDeleteSchema,
  UpdateStatusSchema, UpdateFieldsSchema,
} from "@/lib/schemas/tasks";

const taskService = createTaskService();
const tmService = createTaskMasterService();
const gitService = createGitService();

function zodError(e: ZodError) {
  return NextResponse.json({ error: e.issues.map(i => i.message).join(", ") }, { status: 400 });
}

export async function GET() {
  const allTasks = taskService.getAllTasks();
  const enriched: Record<string, unknown> = {};
  for (const [name, data] of Object.entries(allTasks)) {
    enriched[name] = {
      ...data,
      tasks: computeDependencyMetadata(data.tasks),
    };
  }
  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.action === "create") {
    const parsed = CreateTaskSchema.safeParse(body);
    if (!parsed.success) return zodError(parsed.error);
    const { project, title, description, priority, subtasks, contextFiles } = parsed.data;
    const task = taskService.addTask(project, { title, description, priority, subtasks, contextFiles });
    return task
      ? NextResponse.json({ success: true, task })
      : NextResponse.json({ error: "project not found" }, { status: 404 });
  }

  if (body.action === "delete") {
    const parsed = DeleteTaskSchema.safeParse(body);
    if (!parsed.success) return zodError(parsed.error);
    return resultToResponse(await tmService.removeTask(parsed.data.project, parsed.data.taskId));
  }

  if (body.action === "addChat") {
    const parsed = AddChatSchema.safeParse(body);
    if (!parsed.success) return zodError(parsed.error);
    const { project, taskId, role, content, actions } = parsed.data;
    const ok = taskService.addChatMessage(project, taskId, {
      role, content, timestamp: Date.now(), actions,
    });
    return NextResponse.json({ success: ok });
  }

  if (body.subtaskAction) {
    if (body.subtaskAction === "add") {
      const parsed = SubtaskAddSchema.safeParse(body);
      if (!parsed.success) return zodError(parsed.error);
      return resultToResponse(await tmService.addSubtask(parsed.data.project, parsed.data.taskId, parsed.data.subtaskTitle));
    }
    if (body.subtaskAction === "updateStatus") {
      const parsed = SubtaskUpdateStatusSchema.safeParse(body);
      if (!parsed.success) return zodError(parsed.error);
      const { project, taskId, subtaskId, subtaskStatus } = parsed.data;
      const ok = taskService.updateSubtaskStatus(project, taskId, subtaskId, subtaskStatus);
      return NextResponse.json({ success: ok });
    }
    if (body.subtaskAction === "delete") {
      const parsed = SubtaskDeleteSchema.safeParse(body);
      if (!parsed.success) return zodError(parsed.error);
      return resultToResponse(await tmService.removeSubtask(parsed.data.project, `${parsed.data.taskId}.${parsed.data.subtaskId}`));
    }
    return NextResponse.json({ error: "unknown subtaskAction" }, { status: 400 });
  }

  if (body.status) {
    const parsed = UpdateStatusSchema.safeParse(body);
    if (!parsed.success) return zodError(parsed.error);
    const { project, taskId, status } = parsed.data;

    if (isValidTmStatus(status)) {
      const result = await tmService.setStatus(project, taskId, status);
      if (result.isOk() && (status === "done" || status === "review")) {
        try {
          const allTasks = taskService.getAllTasks();
          const task = allTasks[project]?.tasks?.find((t) => t.id === taskId);
          if (task) {
            const dir = resolveProjectDir(project);
            const prUrl = gitService.autoCreatePr(dir, task);
            if (prUrl) taskService.updateTaskFields(project, taskId, { prUrl });
          }
        } catch { /* Non-critical */ }
      }
      return resultToResponse(result);
    } else {
      const ok = taskService.updateTaskStatus(project, taskId, status);
      return NextResponse.json({ success: ok });
    }
  }

  const fieldsParsed = UpdateFieldsSchema.safeParse(body);
  if (fieldsParsed.success) {
    const { project, taskId, title, description, contextFiles, acceptanceCriteria } = fieldsParsed.data;
    if (title !== undefined || description !== undefined || contextFiles !== undefined || acceptanceCriteria !== undefined) {
      const ok = taskService.updateTaskFields(project, taskId, { title, description, contextFiles, acceptanceCriteria });
      return NextResponse.json({ success: ok });
    }
  }

  return NextResponse.json({ error: "no fields to update" }, { status: 400 });
}
