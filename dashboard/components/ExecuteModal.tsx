"use client";

import { useEffect, useState } from "react";
import { listPanes, listBranches } from "@/lib/actions/git";
import type { Task } from "@/lib/domain/types";

interface Pane {
  target: string;
  command: string;
  size: string;
}

interface BranchInfo {
  current: string;
  branches: string[];
}

interface ExecuteModalProps {
  task: Task;
  project: string;
  onClose: () => void;
  onExecute: (
    pane: string,
    mode: "auto" | "manual",
    session?: "new" | "resume" | "continue",
    branchAction?: "stay" | "checkout" | "create",
    branchName?: string,
    baseBranch?: string,
  ) => void;
}

export default function ExecuteModal({
  task,
  project,
  onClose,
  onExecute,
}: ExecuteModalProps) {
  const [panes, setPanes] = useState<Pane[]>([]);
  const [selectedPane, setSelectedPane] = useState("");
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [session, setSession] = useState<"new" | "resume" | "continue">("new");
  const [loading, setLoading] = useState(true);

  // Branch state
  const [branchInfo, setBranchInfo] = useState<BranchInfo | null>(null);
  const [branchAction, setBranchAction] = useState<"stay" | "checkout" | "create">("stay");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [newBranchName, setNewBranchName] = useState("");
  const [baseBranch, setBaseBranch] = useState("");

  useEffect(() => {
    listPanes()
      .then((data) => {
        setPanes(data);
        if (data.length > 0) setSelectedPane(data[0].target);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    listBranches(project)
      .then((data) => {
        setBranchInfo(data);
        if (data.current) setSelectedBranch(data.current);
        if (data.branches.length > 0) setBaseBranch(data.branches[0]);
      })
      .catch(() => {});
  }, [project]);

  const handleExecute = () => {
    if (!selectedPane) return;
    onExecute(
      selectedPane,
      mode,
      session,
      branchAction,
      branchAction === "checkout" ? selectedBranch : branchAction === "create" ? newBranchName : undefined,
      branchAction === "create" ? baseBranch : undefined,
    );
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && selectedPane && !(e.target instanceof HTMLInputElement)) handleExecute();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, handleExecute, selectedPane, mode]);

  return (
    <div
      className="fixed inset-0 z-50 modal-backdrop flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-crt-dark border border-crt-gray rounded-lg p-3 sm:p-5 w-[95vw] sm:w-full max-w-md animate-slide-in max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-sm glow-green tracking-wider">
            EXECUTE TASK
          </h2>
          <button
            onClick={onClose}
            className="text-crt-gray-text hover:text-gray-300 text-xs"
          >
            [ESC]
          </button>
        </div>

        <div className="mb-4 p-3 bg-crt-black rounded border border-crt-gray">
          <div className="text-[10px] text-crt-gray-text mb-1 font-mono">
            {project} / #{task.id}
          </div>
          <div className="text-xs text-gray-200">{task.title}</div>
          {task.description && (
            <div className="text-[10px] text-crt-gray-text mt-1 line-clamp-2">
              {task.description}
            </div>
          )}
          {task.contextFiles && task.contextFiles.length > 0 && (
            <div className="mt-2 pt-2 border-t border-crt-gray/20">
              <div className="text-[9px] font-mono text-crt-gray-text tracking-wider mb-1">CONTEXT FILES</div>
              {task.contextFiles.map((f, i) => (
                <div key={i} className="text-[10px] font-mono text-crt-cyan truncate">{f}</div>
              ))}
            </div>
          )}
        </div>

        {/* Branch Selection */}
        {branchInfo && branchInfo.branches.length > 0 && (
          <div className="mb-4">
            <label className="text-[10px] text-crt-gray-text font-mono block mb-2 tracking-wider">
              BRANCH
              <span className="ml-2 text-crt-cyan opacity-70">{branchInfo.current}</span>
            </label>
            <div className="flex gap-2 mb-2">
              {([
                { key: "stay" as const, label: "STAY", desc: "現在のまま" },
                { key: "checkout" as const, label: "SWITCH", desc: "既存ブランチ" },
                { key: "create" as const, label: "NEW", desc: "新規作成" },
              ]).map((b) => (
                <button
                  key={b.key}
                  onClick={() => setBranchAction(b.key)}
                  className={`flex-1 py-1.5 text-xs font-mono rounded border transition-all ${
                    branchAction === b.key
                      ? "border-crt-purple/40 bg-crt-purple/10 text-crt-purple"
                      : "border-crt-gray text-crt-gray-text hover:border-crt-gray-light"
                  }`}
                >
                  {b.label}
                  <div className="text-[9px] opacity-60 mt-0.5">{b.desc}</div>
                </button>
              ))}
            </div>

            {branchAction === "checkout" && (
              <div className="space-y-1 max-h-28 overflow-y-auto">
                {branchInfo.branches.map((b) => (
                  <button
                    key={b}
                    onClick={() => setSelectedBranch(b)}
                    className={`w-full text-left px-3 py-1 rounded text-xs font-mono transition-all ${
                      selectedBranch === b
                        ? "bg-crt-gray border border-crt-purple/30 text-crt-purple"
                        : "bg-crt-black border border-transparent text-crt-gray-text hover:border-crt-gray-light"
                    }`}
                  >
                    {b}
                    {b === branchInfo.current && <span className="ml-2 text-[9px] opacity-50">current</span>}
                  </button>
                ))}
              </div>
            )}

            {branchAction === "create" && (
              <div className="space-y-2">
                <input
                  type="text"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="feature/new-branch"
                  className="w-full px-3 py-1.5 bg-crt-black border border-crt-gray rounded text-xs font-mono text-gray-200 placeholder-crt-gray-text/50 focus:border-crt-purple/50 focus:outline-none"
                />
                <div>
                  <div className="text-[9px] text-crt-gray-text font-mono mb-1 tracking-wider">BASE BRANCH</div>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {branchInfo.branches.map((b) => (
                      <button
                        key={b}
                        onClick={() => setBaseBranch(b)}
                        className={`w-full text-left px-3 py-1 rounded text-xs font-mono transition-all ${
                          baseBranch === b
                            ? "bg-crt-gray border border-crt-purple/30 text-crt-purple"
                            : "bg-crt-black border border-transparent text-crt-gray-text hover:border-crt-gray-light"
                        }`}
                      >
                        {b}
                        {b === branchInfo.current && <span className="ml-2 text-[9px] opacity-50">current</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mb-4">
          <label className="text-[10px] text-crt-gray-text font-mono block mb-2 tracking-wider">
            TARGET PANE
          </label>
          {loading ? (
            <div className="text-xs text-crt-gray-text">Scanning tmux...</div>
          ) : panes.length === 0 ? (
            <div className="text-xs text-crt-red">
              No tmux panes found. Start a tmux session first.
            </div>
          ) : (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {panes.map((p) => (
                <button
                  key={p.target}
                  onClick={() => setSelectedPane(p.target)}
                  className={`w-full text-left px-3 py-1.5 rounded text-xs font-mono transition-all ${
                    selectedPane === p.target
                      ? "bg-crt-gray border border-crt-green/30 text-crt-green"
                      : "bg-crt-black border border-transparent text-crt-gray-text hover:border-crt-gray-light"
                  }`}
                >
                  <span>{p.target}</span>
                  <span className="ml-2 text-[10px] opacity-60">
                    {p.command} ({p.size})
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mb-4">
          <label className="text-[10px] text-crt-gray-text font-mono block mb-2 tracking-wider">
            SESSION
          </label>
          <div className="flex gap-2">
            {([
              { key: "new" as const, label: "NEW", icon: "\u2795", desc: "新規セッション" },
              { key: "resume" as const, label: "RESUME", icon: "\u21BA", desc: "前回を再開" },
              { key: "continue" as const, label: "CONTINUE", icon: "\u25B6", desc: "直近に追加" },
            ]).map((s) => (
              <button
                key={s.key}
                onClick={() => setSession(s.key)}
                className={`flex-1 py-2 text-xs font-mono rounded border transition-all ${
                  session === s.key
                    ? "border-crt-cyan/40 bg-crt-cyan/10 text-crt-cyan"
                    : "border-crt-gray text-crt-gray-text hover:border-crt-gray-light"
                }`}
              >
                {s.icon} {s.label}
                <div className="text-[9px] opacity-60 mt-0.5">{s.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <label className="text-[10px] text-crt-gray-text font-mono block mb-2 tracking-wider">
            MODE
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setMode("auto")}
              className={`flex-1 py-2 text-xs font-mono rounded border transition-all ${
                mode === "auto"
                  ? "border-crt-green/40 bg-crt-green/10 text-crt-green"
                  : "border-crt-gray text-crt-gray-text hover:border-crt-gray-light"
              }`}
            >
              &#x26A1; AUTO
              <div className="text-[9px] opacity-60 mt-0.5">
                skip-permissions
              </div>
            </button>
            <button
              onClick={() => setMode("manual")}
              className={`flex-1 py-2 text-xs font-mono rounded border transition-all ${
                mode === "manual"
                  ? "border-crt-amber/40 bg-crt-amber/10 text-crt-amber"
                  : "border-crt-gray text-crt-gray-text hover:border-crt-gray-light"
              }`}
            >
              &#x1F6E1; MANUAL
              <div className="text-[9px] opacity-60 mt-0.5">
                confirm each action
              </div>
            </button>
          </div>
        </div>

        <button
          onClick={handleExecute}
          disabled={!selectedPane || panes.length === 0}
          className={`w-full py-2.5 rounded font-display text-sm tracking-wider transition-all ${
            selectedPane && panes.length > 0
              ? "bg-crt-green/15 border border-crt-green/40 text-crt-green hover:bg-crt-green/25 hover:shadow-[0_0_15px_rgba(0,255,65,0.15)]"
              : "bg-crt-gray/30 border border-crt-gray text-crt-gray-text cursor-not-allowed"
          }`}
        >
          &#x25B6; LAUNCH CLAUDE CODE [ENTER]
        </button>
      </div>
    </div>
  );
}
