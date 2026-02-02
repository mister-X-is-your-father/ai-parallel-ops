export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { AiActionSchema } from "@/lib/schemas/ai";

const execFileAsync = promisify(execFile);
const CLAUDE_BIN = "/home/neo/.nvm/versions/node/v22.20.0/bin/claude";

const SYSTEM_PROMPTS: Record<string, string> = {
  "refine-task": `You are a task refinement assistant for a software project task board.
Given rough notes from a user, produce a structured task. Return JSON with:
{
  "title": "concise imperative title (max 80 chars)",
  "description": "clear description of what needs to be done",
  "priority": "high" | "medium" | "low",
  "subtasks": ["subtask title 1", "subtask title 2", ...]
}
Only return valid JSON, no markdown fences.`,

  "suggest-subtasks": `You are a task breakdown assistant. Given a task title and description, suggest subtasks.
Return JSON: { "subtasks": ["subtask 1", "subtask 2", ...] }
Only return valid JSON, no markdown fences.`,

  "suggest-tasks": `You are a project planning assistant. Given the current task list for a project, identify missing tasks that should be added.
Consider: gaps in the workflow, missing testing, missing documentation, overlooked dependencies, infrastructure needs, etc.
Return JSON:
{
  "suggestions": [
    { "title": "task title", "description": "why this is needed", "priority": "high|medium|low", "after": [1,2] }
  ]
}
"after" is an array of existing task IDs this new task depends on (can be empty).
Only return valid JSON, no markdown fences.`,

  chat: `You are a helpful project planning assistant embedded in a task board.
You help refine tasks, suggest improvements, identify missing requirements, and propose subtasks.
When you have actionable suggestions, include them as structured actions in your response.
Return JSON:
{
  "message": "your response text",
  "actions": [
    { "type": "add-subtask", "title": "subtask title" },
    { "type": "set-priority", "value": "high" | "medium" | "low" },
    { "type": "update-description", "value": "new description" },
    { "type": "update-title", "value": "new title" }
  ]
}
Actions array can be empty if no actionable suggestions. Only return valid JSON, no markdown fences.`,

  breakdown: `You are a task decomposition specialist. Your job is to break down a large task into concrete, actionable subtasks.

Rules:
- Each subtask should be small enough to complete in one focused session
- Subtasks should be ordered by dependency (independent ones first)
- Identify if any subtask needs further decomposition (mark with [COMPLEX])
- Consider: implementation, testing, documentation, edge cases

On FIRST message: analyze the task and propose an initial breakdown as actions.
On FOLLOW-UP messages: refine based on user feedback — add/remove/restructure subtasks.

Return JSON:
{
  "message": "your analysis and reasoning",
  "actions": [
    { "type": "add-subtask", "title": "subtask title" }
  ]
}
Only return valid JSON, no markdown fences.`,
};

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = AiActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map(i => i.message).join(", ") },
      { status: 400 },
    );
  }

  const { action, payload } = parsed.data;
  const systemPrompt = SYSTEM_PROMPTS[action];

  try {
    let userPrompt = "";
    if (action === "refine-task") {
      userPrompt = `Rough notes:\n${payload.notes}`;
      if (payload.project) userPrompt += `\nProject context: ${payload.project}`;
    } else if (action === "suggest-subtasks") {
      userPrompt = `Task: ${payload.title}\nDescription: ${payload.description}`;
    } else if (action === "suggest-tasks") {
      userPrompt = `Current tasks:\n${payload.tasks.map((t) => `#${t.id} [${t.status}] ${t.title} (deps: ${t.dependencies.length ? t.dependencies.join(",") : "none"})`).join("\n")}`;
    } else if (action === "chat" || action === "breakdown") {
      userPrompt = `Task: ${payload.title}\nDescription: ${payload.description}\n`;
      if (payload.subtasks?.length) {
        userPrompt += `Current subtasks: ${payload.subtasks.join(", ")}\n`;
      }
      userPrompt += `\nUser message: ${payload.message}`;
      if (payload.history?.length) {
        const historyText = payload.history
          .map((h) => `${h.role}: ${h.content}`)
          .join("\n");
        userPrompt = `Previous conversation:\n${historyText}\n\n${userPrompt}`;
      }
    }

    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

    const useHaiku = action === "refine-task" || action === "suggest-subtasks" || action === "suggest-tasks";
    const args = ["-p", fullPrompt, "--output-format", "json"];
    if (useHaiku) args.push("--model", "claude-haiku-4-5-20251001");
    const { stdout } = await execFileAsync(CLAUDE_BIN, args, {
      timeout: useHaiku ? 30000 : 120000,
    });

    let parsed2;
    try {
      const outer = JSON.parse(stdout);
      let inner = typeof outer.result === "string" ? outer.result : JSON.stringify(outer.result);
      inner = inner.replace(/^```(?:json)?\s*\n?/m, "").replace(/\n?```\s*$/m, "").trim();
      try {
        parsed2 = JSON.parse(inner);
      } catch {
        parsed2 = { message: inner };
      }
    } catch {
      try {
        parsed2 = JSON.parse(stdout);
      } catch {
        parsed2 = { message: stdout.trim() };
      }
    }

    return NextResponse.json(parsed2);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
