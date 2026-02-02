export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createExecuteService, createTaskService } from "@/lib/container";
import { ExecuteSchema } from "@/lib/schemas/execute";

const executeService = createExecuteService();
const taskService = createTaskService();

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = ExecuteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map(i => i.message).join(", ") },
      { status: 400 },
    );
  }

  const data = parsed.data;

  // Handle interrupt
  if (req.headers.get("x-action") === "interrupt") {
    const result = executeService.interrupt(data.project, data.taskId);
    if (result.error) {
      return NextResponse.json({ success: false, reason: result.error });
    }
    return NextResponse.json({ success: true, pane: result.pane });
  }

  // Resolve project directory
  const projects = taskService.getProjects();
  const projectDir = projects[data.project] || process.cwd();

  try {
    const result = await executeService.execute({
      ...data,
      projectDir,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
