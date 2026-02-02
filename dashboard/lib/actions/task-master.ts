"use server";

import type { z } from "zod";
import type { Result } from "neverthrow";
import { createTaskMasterService } from "../container";
import type { AppError } from "../services/task-master-service";
import {
  ExpandSchema, AiUpdateSchema, AiUpdateSubtaskSchema, AiCreateSchema,
  ResearchSchema, ComplexitySchema, ParsePrdSchema, NextSchema,
  ShowSchema, DependencySchema, TmDeleteSchema,
  MoveTaskSchema, ClearSubtasksSchema, ExpandAllSchema, UpdateBulkSchema,
  ComplexityReportSchema, ValidateDepsSchema, FixDepsSchema,
  CreateTagSchema, DeleteTagSchema, ListTagsSchema, UseTagSchema,
  RenameTagSchema, CopyTagSchema,
  InitializeProjectSchema, ModelsSchema,
} from "../schemas/task-master";

type ActionResult<T = unknown> = { success: true; data: T } | { success: false; error: string };

const svc = () => createTaskMasterService();

function fromResult(result: Result<unknown, AppError>): ActionResult {
  return result.match(
    (data) => ({ success: true as const, data }),
    (error) => ({ success: false as const, error: error.message }),
  );
}

async function run<T>(schema: z.ZodType<T>, input: unknown, fn: (d: T) => Promise<Result<unknown, AppError>> | Result<unknown, AppError>): Promise<ActionResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };
  return fromResult(await fn(parsed.data));
}

// --- Task operations ---

export async function expand(input: unknown): Promise<ActionResult> {
  return run(ExpandSchema, input, (d) => svc().expand(d.project, d.taskId, { num: d.num, research: d.research }));
}
export async function aiUpdate(input: unknown): Promise<ActionResult> {
  return run(AiUpdateSchema, input, (d) => svc().updateTask(d.project, d.taskId, d.prompt));
}
export async function aiUpdateSubtask(input: unknown): Promise<ActionResult> {
  return run(AiUpdateSubtaskSchema, input, (d) => svc().updateSubtask(d.project, d.subtaskId, d.prompt));
}
export async function aiCreate(input: unknown): Promise<ActionResult> {
  return run(AiCreateSchema, input, (d) => svc().addTask(d.project, d.prompt, { priority: d.priority, dependencies: d.dependencies }));
}
export async function research(input: unknown): Promise<ActionResult> {
  return run(ResearchSchema, input, (d) => svc().research(d.project, d.prompt, d.taskIds));
}
export async function complexity(input: unknown): Promise<ActionResult> {
  return run(ComplexitySchema, input, (d) => svc().analyzeComplexity(d.project, d.taskIds));
}
export async function parsePrd(input: unknown): Promise<ActionResult> {
  return run(ParsePrdSchema, input, (d) => svc().parsePrd(d.project, d.inputFile));
}
export async function nextTask(input: unknown): Promise<ActionResult> {
  return run(NextSchema, input, (d) => svc().next(d.project));
}
export async function showTask(input: unknown): Promise<ActionResult> {
  return run(ShowSchema, input, (d) => svc().show(d.project, d.taskId));
}
export async function addDependency(input: unknown): Promise<ActionResult> {
  return run(DependencySchema, input, (d) => svc().addDependency(d.project, d.taskId, d.dependsOn));
}
export async function removeDependency(input: unknown): Promise<ActionResult> {
  return run(DependencySchema, input, (d) => svc().removeDependency(d.project, d.taskId, d.dependsOn));
}
export async function tmDeleteTask(input: unknown): Promise<ActionResult> {
  return run(TmDeleteSchema, input, (d) => svc().removeTask(d.project, d.taskId));
}

// --- Move, Clear, Expand All, Bulk, Reports ---

export async function moveTask(input: unknown): Promise<ActionResult> {
  return run(MoveTaskSchema, input, (d) => svc().moveTask(d.project, d.taskId, d.toTag));
}
export async function clearSubtasks(input: unknown): Promise<ActionResult> {
  return run(ClearSubtasksSchema, input, (d) => svc().clearSubtasks(d.project, d.taskIds));
}
export async function expandAll(input: unknown): Promise<ActionResult> {
  return run(ExpandAllSchema, input, (d) => svc().expandAll(d.project, { num: d.num, research: d.research }));
}
export async function updateBulk(input: unknown): Promise<ActionResult> {
  return run(UpdateBulkSchema, input, (d) => svc().updateBulk(d.project, d.fromId, d.prompt));
}
export async function complexityReport(input: unknown): Promise<ActionResult> {
  return run(ComplexityReportSchema, input, () => svc().complexityReport());
}
export async function validateDeps(input: unknown): Promise<ActionResult> {
  return run(ValidateDepsSchema, input, (d) => svc().validateDeps(d.project));
}
export async function fixDeps(input: unknown): Promise<ActionResult> {
  return run(FixDepsSchema, input, (d) => svc().fixDeps(d.project));
}

// --- Tag management ---

export async function createTag(input: unknown): Promise<ActionResult> {
  return run(CreateTagSchema, input, (d) => svc().createTag(d.project, d.tagName));
}
export async function deleteTag(input: unknown): Promise<ActionResult> {
  return run(DeleteTagSchema, input, (d) => svc().deleteTag(d.project, d.tagName));
}
export async function listTags(input: unknown): Promise<ActionResult> {
  return run(ListTagsSchema, input, (d) => svc().listTags(d.project));
}
export async function useTag(input: unknown): Promise<ActionResult> {
  return run(UseTagSchema, input, (d) => svc().useTag(d.project, d.tagName));
}
export async function renameTag(input: unknown): Promise<ActionResult> {
  return run(RenameTagSchema, input, (d) => svc().renameTag(d.project, d.oldName, d.newName));
}
export async function copyTag(input: unknown): Promise<ActionResult> {
  return run(CopyTagSchema, input, (d) => svc().copyTag(d.project, d.srcTag, d.destTag));
}

// --- Initialize & Models ---

export async function initializeProject(input: unknown): Promise<ActionResult> {
  return run(InitializeProjectSchema, input, (d) => svc().initializeProject(d.project));
}
export async function getModels(input: unknown): Promise<ActionResult> {
  return run(ModelsSchema, input, (d) => svc().getModels(d.project));
}
