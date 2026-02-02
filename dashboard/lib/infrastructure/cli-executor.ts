import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface CommandExecutor {
  execute(args: string[], cwd: string, timeoutMs: number): Promise<unknown>;
}

export class TaskMasterExecutor implements CommandExecutor {
  constructor(private binPath: string) {}

  async execute(
    args: string[],
    cwd: string,
    timeoutMs: number
  ): Promise<unknown> {
    const fullArgs = [...args, "--format", "json", "-p", cwd];
    const { stdout } = await execFileAsync(this.binPath, fullArgs, {
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024,
    });
    try {
      return JSON.parse(stdout);
    } catch {
      return { raw: stdout };
    }
  }
}
