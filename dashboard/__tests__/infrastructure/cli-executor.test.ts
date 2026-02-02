import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("child_process", () => ({
  execFile: vi.fn((_bin: string, _args: string[], _opts: object, cb: Function) => {
    cb(null, "{}", "");
    return {};
  }),
}));

vi.mock("util", async () => {
  const actual = await vi.importActual("util");
  return {
    ...actual,
    promisify: (fn: Function) => (...args: unknown[]) =>
      new Promise((resolve, reject) => {
        fn(...args, (err: Error | null, stdout: string, stderr: string) => {
          if (err) reject(err);
          else resolve({ stdout, stderr });
        });
      }),
  };
});

import { TaskMasterExecutor } from "../../lib/infrastructure/cli-executor";
import { execFile } from "child_process";

const mockExecFile = vi.mocked(execFile);

describe("TaskMasterExecutor", () => {
  const executor = new TaskMasterExecutor("/usr/bin/tm");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parses JSON stdout", async () => {
    mockExecFile.mockImplementation((_b, _a, _o, cb: any) => {
      cb(null, JSON.stringify({ ok: true }), "");
      return {} as any;
    });
    const result = await executor.execute(["show", "1"], "/tmp", 5000);
    expect(result).toEqual({ ok: true });
  });

  it("falls back to raw on non-JSON", async () => {
    mockExecFile.mockImplementation((_b, _a, _o, cb: any) => {
      cb(null, "plain text", "");
      return {} as any;
    });
    const result = await executor.execute(["next"], "/tmp", 5000);
    expect(result).toEqual({ raw: "plain text" });
  });

  it("rejects on error", async () => {
    mockExecFile.mockImplementation((_b, _a, _o, cb: any) => {
      cb(new Error("timeout"), "", "");
      return {} as any;
    });
    await expect(executor.execute(["x"], "/tmp", 5000)).rejects.toThrow("timeout");
  });

  it("passes --format json flag", async () => {
    mockExecFile.mockImplementation((_b, _a, _o, cb: any) => {
      cb(null, "{}", "");
      return {} as any;
    });
    await executor.execute(["show", "1"], "/proj", 10000);
    const args = mockExecFile.mock.calls[0][1] as string[];
    expect(args).toContain("--format");
    expect(args).toContain("json");
  });
});
