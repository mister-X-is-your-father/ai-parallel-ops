"use client";

import { useEffect, useState } from "react";
import { searchDirectories, addProject, removeProject } from "@/lib/actions/projects";

interface ProjectSelectorProps {
  projects: Record<string, string>;
  hubProjects: string[];
  onToggle: (project: string, enabled: boolean) => void;
  onProjectsChanged: () => void;
  enabledProjects: Set<string>;
}

export default function ProjectSelector({
  projects,
  hubProjects,
  onToggle,
  onProjectsChanged,
  enabledProjects,
}: ProjectSelectorProps) {
  const [time, setTime] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState("");
  const [addNameManual, setAddNameManual] = useState(false);
  const [addPath, setAddPath] = useState("");
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [dirSuggestions, setDirSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [homeDir, setHomeDir] = useState("");

  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString("ja-JP", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const allProjects = [
    ...new Set([...hubProjects, ...Object.keys(projects)]),
  ];

  const fetchDirs = async (q: string) => {
    try {
      const data = await searchDirectories(q);
      setDirSuggestions(data.dirs || []);
      if (data.home) setHomeDir(data.home);
      setShowSuggestions((data.dirs || []).length > 0);
      setSelectedIdx(-1);
    } catch {
      setDirSuggestions([]);
    }
  };

  const handlePathChange = (val: string) => {
    setAddPath(val);
    if (!addNameManual) {
      const parts = val.replace(/\/+$/, "").split("/");
      const last = parts[parts.length - 1];
      if (last && last !== "~") setAddName(last);
    }
    fetchDirs(val);
  };

  const selectSuggestion = (path: string) => {
    setAddPath(path + "/");
    if (!addNameManual) {
      const base = path.split("/").pop() || "";
      if (base) setAddName(base);
    }
    setShowSuggestions(false);
    fetchDirs(path + "/");
  };

  const handlePathKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, dirSuggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Tab" || e.key === "Enter") {
      if (selectedIdx >= 0 && selectedIdx < dirSuggestions.length) {
        e.preventDefault();
        selectSuggestion(dirSuggestions[selectedIdx]);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const displayPath = (p: string) =>
    homeDir ? p.replace(homeDir, "~") : p;

  const handleAdd = async () => {
    if (!addName.trim() || !addPath.trim()) {
      setAddError("Name and path are required");
      return;
    }
    setAdding(true);
    setAddError("");
    try {
      const result = await addProject(addName.trim(), addPath.trim());
      if (!result.success) {
        setAddError(result.error);
      } else {
        setShowAddModal(false);
        setAddName("");
        setAddPath("");
        onProjectsChanged();
      }
    } catch {
      setAddError("Request failed");
    }
    setAdding(false);
  };

  const handleRemove = async (name: string) => {
    await removeProject(name);
    setRemoveTarget(null);
    onProjectsChanged();
  };

  return (
    <>
      <header className="border-b border-crt-gray px-3 sm:px-6 py-2 sm:py-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3 sm:gap-6 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-crt-green shadow-[0_0_6px_rgba(0,255,65,0.6)] status-pulse" />
              <h1 className="font-display text-lg glow-green tracking-widest">
                TASK OPS
              </h1>
            </div>

            <div className="h-4 w-px bg-crt-gray" />

            <div className="flex items-center gap-3 flex-wrap">
              {allProjects.map((name) => (
                <div key={name} className="flex items-center gap-1 group">
                  <button
                    onClick={() => onToggle(name, !enabledProjects.has(name))}
                    className="flex items-center gap-2"
                  >
                    <div
                      className={`toggle-track ${enabledProjects.has(name) ? "active" : ""}`}
                    >
                      <div className="toggle-thumb" />
                    </div>
                    <span
                      className={`text-xs font-mono transition-colors ${
                        enabledProjects.has(name)
                          ? "text-crt-green"
                          : "text-crt-gray-text"
                      }`}
                    >
                      {name}
                    </span>
                  </button>
                  {/* Remove button - only for registered projects, not hub */}
                  {Object.keys(projects).includes(name) && (
                    <button
                      onClick={() => setRemoveTarget(name)}
                      className="text-[9px] text-crt-gray-text hover:text-crt-red transition-colors opacity-0 group-hover:opacity-100 ml-0.5"
                      title="Remove project"
                    >
                      &#x2715;
                    </button>
                  )}
                </div>
              ))}

              <button
                onClick={() => { setShowAddModal(true); setAddNameManual(false); setAddPath(""); setAddName(""); setDirSuggestions([]); }}
                className="flex items-center gap-1 px-2 py-1 text-[10px] font-mono text-crt-gray-text border border-crt-gray rounded hover:border-crt-green/30 hover:text-crt-green transition-all"
              >
                <span>+</span>
                <span>ADD</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-crt-gray-text font-mono">
            <span className="glow-green font-display tracking-wider">{time}</span>
          </div>
        </div>
      </header>

      {/* Add Project Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 modal-backdrop flex items-center justify-center"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-crt-dark border border-crt-gray rounded-lg p-3 sm:p-5 w-[95vw] sm:w-full max-w-md animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-sm glow-green tracking-wider">
                ADD PROJECT
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-crt-gray-text hover:text-gray-300 text-xs"
              >
                [ESC]
              </button>
            </div>

            <div className="mb-3 relative">
              <label className="text-[10px] text-crt-gray-text font-mono block mb-1 tracking-wider">
                PROJECT PATH
              </label>
              <input
                type="text"
                value={addPath}
                onChange={(e) => handlePathChange(e.target.value)}
                onKeyDown={handlePathKeyDown}
                onFocus={() => { if (dirSuggestions.length > 0) setShowSuggestions(true); }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="~/my-project (type to search)"
                autoFocus
                className="w-full bg-crt-black border border-crt-gray rounded px-3 py-2 text-xs font-mono text-gray-200 focus:border-crt-green/40 focus:outline-none transition-colors"
              />
              {showSuggestions && dirSuggestions.length > 0 && (
                <div className="absolute z-10 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-crt-dark border border-crt-gray rounded shadow-lg">
                  {dirSuggestions.map((dir, i) => (
                    <button
                      key={dir}
                      onMouseDown={() => selectSuggestion(dir)}
                      className={`w-full text-left px-3 py-1.5 text-xs font-mono truncate transition-colors ${
                        i === selectedIdx
                          ? "bg-crt-green/15 text-crt-green"
                          : "text-gray-300 hover:bg-crt-green/10 hover:text-crt-green"
                      }`}
                    >
                      {displayPath(dir)}
                    </button>
                  ))}
                </div>
              )}
              <p className="text-[9px] text-crt-gray-text mt-1">
                .taskmaster/tasks/tasks.json must exist in this directory
              </p>
            </div>

            <div className="mb-4">
              <label className="text-[10px] text-crt-gray-text font-mono block mb-1 tracking-wider">
                PROJECT NAME
              </label>
              <input
                type="text"
                value={addName}
                onChange={(e) => { setAddName(e.target.value); setAddNameManual(true); }}
                placeholder="Auto-filled from path"
                className="w-full bg-crt-black border border-crt-gray rounded px-3 py-2 text-xs font-mono text-gray-200 focus:border-crt-green/40 focus:outline-none transition-colors"
              />
            </div>

            {addError && (
              <div className="mb-3 text-[10px] text-crt-red font-mono bg-crt-red/5 border border-crt-red/20 rounded px-3 py-2">
                {addError}
              </div>
            )}

            <button
              onClick={handleAdd}
              disabled={adding}
              className="w-full py-2.5 rounded font-display text-sm tracking-wider bg-crt-green/15 border border-crt-green/40 text-crt-green hover:bg-crt-green/25 hover:shadow-[0_0_15px_rgba(0,255,65,0.15)] transition-all disabled:opacity-50"
            >
              {adding ? "ADDING..." : "+ ADD PROJECT"}
            </button>
          </div>
        </div>
      )}

      {/* Remove Confirmation */}
      {removeTarget && (
        <div
          className="fixed inset-0 z-50 modal-backdrop flex items-center justify-center"
          onClick={() => setRemoveTarget(null)}
        >
          <div
            className="bg-crt-dark border border-crt-gray rounded-lg p-3 sm:p-5 w-[95vw] sm:w-full max-w-sm animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-sm glow-red tracking-wider mb-3">
              REMOVE PROJECT
            </h2>
            <p className="text-xs text-gray-300 mb-4">
              Remove <span className="text-crt-amber font-mono">{removeTarget}</span> from the dashboard?
              <br />
              <span className="text-[10px] text-crt-gray-text">Task files will not be deleted.</span>
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setRemoveTarget(null)}
                className="flex-1 py-2 text-xs font-mono rounded border border-crt-gray text-crt-gray-text hover:border-crt-gray-light transition-all"
              >
                CANCEL
              </button>
              <button
                onClick={() => handleRemove(removeTarget)}
                className="flex-1 py-2 text-xs font-mono rounded border border-crt-red/40 bg-crt-red/10 text-crt-red hover:bg-crt-red/20 transition-all"
              >
                REMOVE
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
