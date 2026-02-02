export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createTaskMasterService } from "@/lib/container";
import { TaskMasterActionSchema } from "@/lib/schemas/task-master";
import { resultToResponse } from "@/lib/schemas/result-response";

const tmService = createTaskMasterService();

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = TaskMasterActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map(i => i.message).join(", ") },
      { status: 400 },
    );
  }

  const data = parsed.data;

  switch (data.action) {
    case "expand":
      return resultToResponse(await tmService.expand(data.project, data.taskId, {
        num: data.num, research: data.research,
      }));
    case "ai-update":
      return resultToResponse(await tmService.updateTask(data.project, data.taskId, data.prompt));
    case "ai-update-subtask":
      return resultToResponse(await tmService.updateSubtask(data.project, data.subtaskId, data.prompt));
    case "ai-create":
      return resultToResponse(await tmService.addTask(data.project, data.prompt, {
        priority: data.priority, dependencies: data.dependencies,
      }));
    case "research":
      return resultToResponse(await tmService.research(data.project, data.prompt, data.taskIds));
    case "complexity":
      return resultToResponse(await tmService.analyzeComplexity(data.project, data.taskIds));
    case "parse-prd":
      return resultToResponse(await tmService.parsePrd(data.project, data.inputFile));
    case "next":
      return resultToResponse(await tmService.next(data.project));
    case "show":
      return resultToResponse(await tmService.show(data.project, data.taskId));
    case "add-dependency":
      return resultToResponse(await tmService.addDependency(data.project, data.taskId, data.dependsOn));
    case "remove-dependency":
      return resultToResponse(await tmService.removeDependency(data.project, data.taskId, data.dependsOn));
    case "delete":
      return resultToResponse(await tmService.removeTask(data.project, data.taskId));
  }
}
