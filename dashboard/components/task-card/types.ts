export type { Subtask, Task } from "@/lib/domain/types";
import type { Task } from "@/lib/domain/types";

export interface TaskCardProps {
  task: Task;
  project: string;
  taskNameMap?: Map<number, string>;
  allTaskIds?: number[];
  onExecute: (task: Task, project: string) => void;
  onStatusChange: (project: string, taskId: number, status: string) => void;
  onEdit: (project: string, taskId: number, fields: { title?: string; description?: string }) => void;
  onSubtaskAction: (project: string, taskId: number, action: string, payload: Record<string, unknown>) => void;
  onOpenChat?: (task: Task, project: string) => void;
  onTaskMasterAction?: (project: string, taskId: number, action: string, params?: Record<string, unknown>) => void;
}
