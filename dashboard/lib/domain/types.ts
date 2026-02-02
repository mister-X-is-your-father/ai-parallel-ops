export type TaskStatus = "pending" | "in-progress" | "done" | "verified" | "review" | "paused" | "deferred" | "cancelled" | "blocked";
export type TaskPriority = "high" | "medium" | "low" | "critical";

export interface Subtask {
  id: number;
  title: string;
  status: TaskStatus;
  subtasks?: Subtask[];
}

export interface ChatAction {
  type: string;
  title?: string;
  value?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  actions?: ChatAction[];
}

export interface Task {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dependencies: number[];
  details?: string;
  testStrategy?: string;
  contextFiles?: string[];
  acceptanceCriteria?: string[];
  startCommit?: string;
  branch?: string;
  prUrl?: string;
  subtasks: Subtask[];
  chatHistory?: ChatMessage[];
  blockedBy?: number[];
  isIndependent?: boolean;
  depth?: number;
}

export interface EnrichedTask extends Task {
  blockedBy: number[];
  dependents: number[];
  isIndependent: boolean;
  depth: number;
}

export interface ProjectTasks {
  tasks: Task[];
  metadata: Record<string, unknown>;
}
