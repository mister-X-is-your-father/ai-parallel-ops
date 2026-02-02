import { join } from "path";

export const CONFIG = {
  claudeBin: process.env.CLAUDE_BIN || "claude",
  taskmasterBase: process.env.TASKMASTER_BASE || join(process.cwd(), "..", ".taskmaster"),
  wsPort: Number(process.env.WS_PORT) || 5571,
} as const;

export const PATHS = {
  projectsFile: join(CONFIG.taskmasterBase, "projects.json"),
  hubTasks: join(CONFIG.taskmasterBase, "tasks", "tasks.json"),
} as const;
