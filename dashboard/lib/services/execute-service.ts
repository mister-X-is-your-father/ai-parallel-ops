import type { TaskService } from "./task-service";
import type { TaskMasterService } from "./task-master-service";
import type { GitService } from "./git-service";

export interface TmuxExecutor {
  sendKeys(pane: string, keys: string): void;
  setEnv(session: string, key: string, value: string): void;
}

export interface TaskInfo {
  project: string;
  projectDir: string;
  taskId: number;
  taskTitle: string;
  taskDescription: string;
  contextFiles?: string[];
}

export interface GitConfig {
  branchAction?: "stay" | "checkout" | "create";
  branchName?: string;
  baseBranch?: string;
}

export interface TmuxTarget {
  pane: string;
  mode: string;
  session: string;
}

export type ExecuteParams = TaskInfo & GitConfig & TmuxTarget;

export interface ExecuteResult {
  success: boolean;
  error?: string;
  pane?: string;
}

// Direct claude-chill commands (bypasses _cc_auto_esc wrapper in cc-* aliases).
// Dashboard sends prompts via args — the 2s Escape from _cc_auto_esc would interrupt input.
const CMD_MAP: Record<string, Record<string, string>> = {
  new:      { auto: "claude-chill -a 0 -- claude --dangerously-skip-permissions -p",   manual: "claude-chill -a 0 claude -p" },
  resume:   { auto: "claude-chill -a 0 -- claude -r --dangerously-skip-permissions -p", manual: "claude-chill -a 0 claude -r -p" },
  continue: { auto: "claude-chill -a 0 -- claude -c --dangerously-skip-permissions -p", manual: "claude-chill -a 0 claude -c -p" },
};

export class ExecuteService {
  private taskPaneMap = new Map<string, string>();

  constructor(
    private tmux: TmuxExecutor,
    private git: GitService,
    private taskMaster: TaskMasterService,
    private taskService: TaskService
  ) {}

  buildPrompt(params: ExecuteParams): string {
    let prompt = `Task ID:${params.taskId} ${params.taskTitle}. ${params.taskDescription}. タスク管理ルール: task-master MCPツールを使い、サブタスクの追加(add_subtask)・ステータス更新(set_task_status)を行うこと。作業開始時に、このタスクの完了条件(acceptance criteria)を3-5個生成し、update_taskでacceptanceCriteriaフィールドに保存すること。作業完了時はset_task_status id:${params.taskId} status:doneを実行すること。`;
    if (params.contextFiles?.length) {
      prompt += ` 参考ファイル: ${params.contextFiles.join(", ")}`;
    }
    return prompt.replace(/'/g, "\\'");
  }

  resolveCommand(session: string, mode: string): string {
    return CMD_MAP[session || "new"]?.[mode] || CMD_MAP.new.auto;
  }

  async execute(params: ExecuteParams): Promise<ExecuteResult> {
    const { project, projectDir, taskId, pane, mode, session } = params;

    // Handle branch selection/creation
    try {
      if (params.branchAction === "checkout" && params.branchName) {
        this.git.checkoutBranch(projectDir, params.branchName);
        const startCommit = this.git.getCurrentCommit(projectDir);
        this.taskService.updateTaskFields(project, taskId, { startCommit, branch: params.branchName });
      } else if (params.branchAction === "create" && params.branchName) {
        const startCommit = this.git.getCurrentCommit(projectDir);
        if (params.baseBranch) {
          this.git.createBranchFrom(projectDir, params.branchName, params.baseBranch);
        } else {
          this.git.createBranch(projectDir, params.branchName);
        }
        this.taskService.updateTaskFields(project, taskId, { startCommit, branch: params.branchName });
      } else if (params.branchAction !== "stay") {
        // Default: auto-create task branch
        const startCommit = this.git.getCurrentCommit(projectDir);
        const branchName = `task/${taskId}-${Date.now()}`;
        this.git.createBranch(projectDir, branchName);
        this.taskService.updateTaskFields(project, taskId, { startCommit, branch: branchName });
      }
    } catch {
      // Not a git repo or branch operation failed — skip
    }

    // Set env vars for Stop hook fallback
    const sessionName = pane.split(":")[0];
    this.tmux.setEnv(sessionName, "TASK_ID", String(taskId));
    this.tmux.setEnv(sessionName, "TASK_PROJECT", project);

    // Send command to pane
    const ccCmd = this.resolveCommand(session, mode);
    const prompt = this.buildPrompt(params);
    this.tmux.sendKeys(pane, `cd '${projectDir}' && ${ccCmd} '${prompt}'`);

    // Track pane for interrupt
    this.taskPaneMap.set(`${project}:${taskId}`, pane);

    // Update task status via CLI
    await this.taskMaster.setStatus(project, taskId, "in-progress");

    return { success: true };
  }

  interrupt(project: string, taskId: number): ExecuteResult {
    const key = `${project}:${taskId}`;
    const targetPane = this.taskPaneMap.get(key);
    if (!targetPane) {
      return { success: false, error: "no pane tracked" };
    }
    this.tmux.sendKeys(targetPane, "Escape");
    return { success: true, pane: targetPane };
  }
}
