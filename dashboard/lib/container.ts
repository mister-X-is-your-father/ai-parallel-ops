import { execSync } from "child_process";
import { FileTaskRepository } from "./infrastructure/task-repository";
import { TaskService } from "./services/task-service";
import { TaskMasterService } from "./services/task-master-service";
import { GitService, type ShellExecutor } from "./services/git-service";
import { ExecuteService, type TmuxExecutor } from "./services/execute-service";
import { PATHS } from "./config";

// --- Singletons ---

let _taskService: TaskService | null = null;
let _taskMasterService: TaskMasterService | null = null;
let _gitService: GitService | null = null;
let _executeService: ExecuteService | null = null;

// --- Project resolver ---

export function resolveProjectDir(project: string): string {
  if (project === "hub" || project === "default") return "/home/neo";
  try {
    const { readFileSync } = require("fs");
    const projects = JSON.parse(readFileSync(PATHS.projectsFile, "utf-8"));
    if (projects[project]) return projects[project];
  } catch {}
  return "/home/neo";
}

// --- Factories ---

export function createTaskService(): TaskService {
  if (!_taskService) {
    const repo = new FileTaskRepository(PATHS.hubTasks, PATHS.projectsFile);
    _taskService = new TaskService(repo);
  }
  return _taskService;
}

export function createTaskMasterService(): TaskMasterService {
  if (!_taskMasterService) {
    _taskMasterService = new TaskMasterService(resolveProjectDir);
  }
  return _taskMasterService;
}

export function createGitService(): GitService {
  if (!_gitService) {
    const shell: ShellExecutor = {
      execSync(cmd, opts) {
        return execSync(cmd, { ...opts, encoding: "utf-8" });
      },
    };
    _gitService = new GitService(shell);
  }
  return _gitService;
}

export function createExecuteService(): ExecuteService {
  if (!_executeService) {
    const tmux: TmuxExecutor = {
      sendKeys(pane, keys) {
        execSync(`tmux send-keys -t ${pane} "${keys}" Enter`, { encoding: "utf-8" });
      },
      setEnv(session, key, value) {
        execSync(`tmux set-environment -t ${session} ${key} '${value}'`, { encoding: "utf-8" });
      },
    };
    _executeService = new ExecuteService(
      tmux,
      createGitService(),
      createTaskMasterService(),
      createTaskService()
    );
  }
  return _executeService;
}

/** Reset singletons (for testing) */
export function resetContainer(): void {
  _taskService = null;
  _taskMasterService = null;
  _gitService = null;
  _executeService = null;
}
