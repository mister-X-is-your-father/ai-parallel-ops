import { z } from "zod";

const base = z.object({
  project: z.string().min(1),
});

// --- Existing ---

export const ExpandSchema = base.extend({
  action: z.literal("expand"),
  taskId: z.union([z.string(), z.number()]),
  num: z.number().optional(),
  research: z.boolean().optional(),
});

export const AiUpdateSchema = base.extend({
  action: z.literal("ai-update"),
  taskId: z.union([z.string(), z.number()]),
  prompt: z.string().min(1),
});

export const AiUpdateSubtaskSchema = base.extend({
  action: z.literal("ai-update-subtask"),
  subtaskId: z.string().min(1),
  prompt: z.string().min(1),
});

export const AiCreateSchema = base.extend({
  action: z.literal("ai-create"),
  prompt: z.string().min(1),
  priority: z.string().optional(),
  dependencies: z.string().optional(),
});

export const ResearchSchema = base.extend({
  action: z.literal("research"),
  prompt: z.string().min(1),
  taskIds: z.string().optional(),
});

export const ComplexitySchema = base.extend({
  action: z.literal("complexity"),
  taskIds: z.string().optional(),
});

export const ParsePrdSchema = base.extend({
  action: z.literal("parse-prd"),
  inputFile: z.string().min(1),
});

export const NextSchema = base.extend({
  action: z.literal("next"),
});

export const ShowSchema = base.extend({
  action: z.literal("show"),
  taskId: z.union([z.string(), z.number()]),
});

export const DependencySchema = base.extend({
  action: z.enum(["add-dependency", "remove-dependency"]),
  taskId: z.union([z.string(), z.number()]),
  dependsOn: z.union([z.string(), z.number()]),
});

export const TmDeleteSchema = base.extend({
  action: z.literal("delete"),
  taskId: z.union([z.string(), z.number()]),
});

// --- New: Move, Clear, Expand All, Bulk Update, Complexity Report ---

export const MoveTaskSchema = base.extend({
  action: z.literal("move-task"),
  taskId: z.union([z.string(), z.number()]),
  toTag: z.string().min(1),
});

export const ClearSubtasksSchema = base.extend({
  action: z.literal("clear-subtasks"),
  taskIds: z.string().optional(), // comma-separated or omit for all
});

export const ExpandAllSchema = base.extend({
  action: z.literal("expand-all"),
  num: z.number().optional(),
  research: z.boolean().optional(),
});

export const UpdateBulkSchema = base.extend({
  action: z.literal("update-bulk"),
  fromId: z.union([z.string(), z.number()]),
  prompt: z.string().min(1),
});

export const ComplexityReportSchema = base.extend({
  action: z.literal("complexity-report"),
});

export const ValidateDepsSchema = base.extend({
  action: z.literal("validate-deps"),
});

export const FixDepsSchema = base.extend({
  action: z.literal("fix-deps"),
});

// --- New: Tag management ---

export const CreateTagSchema = base.extend({
  action: z.literal("create-tag"),
  tagName: z.string().min(1),
});

export const DeleteTagSchema = base.extend({
  action: z.literal("delete-tag"),
  tagName: z.string().min(1),
});

export const ListTagsSchema = base.extend({
  action: z.literal("list-tags"),
});

export const UseTagSchema = base.extend({
  action: z.literal("use-tag"),
  tagName: z.string().min(1),
});

export const RenameTagSchema = base.extend({
  action: z.literal("rename-tag"),
  oldName: z.string().min(1),
  newName: z.string().min(1),
});

export const CopyTagSchema = base.extend({
  action: z.literal("copy-tag"),
  srcTag: z.string().min(1),
  destTag: z.string().min(1),
});

// --- Initialize & Models ---

export const InitializeProjectSchema = base.extend({
  action: z.literal("initialize-project"),
});

export const ModelsSchema = base.extend({
  action: z.literal("models"),
});

// --- Union ---

export const TaskMasterActionSchema = z.discriminatedUnion("action", [
  ExpandSchema, AiUpdateSchema, AiUpdateSubtaskSchema, AiCreateSchema,
  ResearchSchema, ComplexitySchema, ParsePrdSchema, NextSchema, ShowSchema,
  DependencySchema, TmDeleteSchema,
  MoveTaskSchema, ClearSubtasksSchema, ExpandAllSchema, UpdateBulkSchema,
  ComplexityReportSchema, ValidateDepsSchema, FixDepsSchema,
  CreateTagSchema, DeleteTagSchema, ListTagsSchema, UseTagSchema,
  RenameTagSchema, CopyTagSchema,
  InitializeProjectSchema, ModelsSchema,
]);
