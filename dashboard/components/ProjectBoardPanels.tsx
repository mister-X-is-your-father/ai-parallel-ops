"use client";

import { useState } from "react";
import * as tmActions from "@/lib/actions/task-master";
import { aiAction } from "@/lib/actions/ai";
import { createTask } from "@/lib/actions/tasks";

// --- Generic result display panel ---

export function ResultPanel({
  title, result, colorClass, onClose,
}: {
  title: string; result: string; colorClass: string; onClose: () => void;
}) {
  return (
    <div className={`border-b border-crt-gray/50 ${colorClass} px-4 py-2`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px] font-mono tracking-wider" style={{ color: "inherit" }}>{title}</span>
        <button onClick={onClose} className="text-[9px] text-crt-gray-text hover:text-gray-200">&#x2715;</button>
      </div>
      <pre className="text-[9px] font-mono text-gray-300 whitespace-pre-wrap max-h-[200px] overflow-y-auto">{result}</pre>
    </div>
  );
}

// --- Research panel (owns its own state) ---

export function ResearchPanel({ project, onClose }: { project: string; onClose: () => void }) {
  const [prompt, setPrompt] = useState("");
  const [researching, setResearching] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleResearch = async () => {
    if (!prompt.trim()) return;
    setResearching(true);
    setResult(null);
    try {
      const res = await tmActions.research({ action: "research", project, prompt: prompt.trim() });
      setResult(res.success ? JSON.stringify(res.data, null, 2) : res.error);
    } catch (e: unknown) { setResult(e instanceof Error ? e.message : String(e)); }
    setResearching(false);
  };

  return (
    <div className="border-b border-crt-gray/50 bg-crt-cyan/5 px-4 py-2">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[9px] font-mono text-crt-cyan tracking-wider">RESEARCH</span>
        <button onClick={onClose} className="text-[9px] text-crt-gray-text hover:text-gray-200">&#x2715;</button>
      </div>
      <div className="flex gap-1.5 mb-1.5">
        <input value={prompt} onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleResearch(); }}
          placeholder="Research prompt..."
          className="flex-1 bg-crt-black border border-crt-gray rounded px-2 py-1 text-[10px] font-mono text-gray-300 focus:border-crt-cyan/40 focus:outline-none" />
        <button onClick={handleResearch} disabled={researching || !prompt.trim()}
          className="px-2 py-1 text-[9px] font-mono rounded border border-crt-cyan/40 bg-crt-cyan/10 text-crt-cyan"
          style={researching ? { opacity: 0.5 } : undefined}>
          {researching ? "..." : "GO"}
        </button>
      </div>
      {result && <pre className="text-[9px] font-mono text-gray-300 whitespace-pre-wrap max-h-[200px] overflow-y-auto">{result}</pre>}
    </div>
  );
}

// --- PRD Import panel ---

export function PrdImportPanel({ project, onClose }: { project: string; onClose: () => void }) {
  const [prdPath, setPrdPath] = useState("");
  const [importing, setImporting] = useState(false);

  const handleImport = async () => {
    if (!prdPath.trim()) return;
    setImporting(true);
    try {
      const res = await tmActions.parsePrd({ action: "parse-prd", project, inputFile: prdPath.trim() });
      if (!res.success) alert(res.error);
      else { onClose(); }
    } catch (e: unknown) { alert(e instanceof Error ? e.message : String(e)); }
    setImporting(false);
  };

  return (
    <div className="border-b border-crt-gray/50 bg-crt-green/5 px-4 py-2">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[9px] font-mono text-crt-green tracking-wider">IMPORT PRD</span>
        <button onClick={onClose} className="text-[9px] text-crt-gray-text hover:text-gray-200">&#x2715;</button>
      </div>
      <div className="flex gap-1.5">
        <input value={prdPath} onChange={(e) => setPrdPath(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleImport(); }}
          placeholder="/path/to/prd.md"
          className="flex-1 bg-crt-black border border-crt-gray rounded px-2 py-1 text-[10px] font-mono text-gray-300 focus:border-crt-green/40 focus:outline-none" />
        <button onClick={handleImport} disabled={importing || !prdPath.trim()}
          className="px-2 py-1 text-[9px] font-mono rounded border border-crt-green/40 bg-crt-green/10 text-crt-green"
          style={importing ? { opacity: 0.5 } : undefined}>
          {importing ? "..." : "IMPORT"}
        </button>
      </div>
    </div>
  );
}

// --- Bulk Update panel ---

export function BulkUpdatePanel({ project, onClose }: { project: string; onClose: () => void }) {
  const [fromId, setFromId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [updating, setUpdating] = useState(false);

  const handleUpdate = async () => {
    if (!fromId.trim() || !prompt.trim()) return;
    setUpdating(true);
    try {
      const res = await tmActions.updateBulk({ action: "update-bulk", project, fromId: fromId.trim(), prompt: prompt.trim() });
      if (!res.success) alert(res.error);
      else { onClose(); }
    } catch (e: unknown) { alert(e instanceof Error ? e.message : String(e)); }
    setUpdating(false);
  };

  return (
    <div className="border-b border-crt-gray/50 bg-crt-amber/5 px-4 py-2">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[9px] font-mono text-crt-amber tracking-wider">BULK UPDATE</span>
        <button onClick={onClose} className="text-[9px] text-crt-gray-text hover:text-gray-200">&#x2715;</button>
      </div>
      <div className="flex gap-1.5 mb-1.5">
        <input value={fromId} onChange={(e) => setFromId(e.target.value)}
          placeholder="From task ID"
          className="w-24 bg-crt-black border border-crt-gray rounded px-2 py-1 text-[10px] font-mono text-gray-300 focus:border-crt-amber/40 focus:outline-none" />
        <input value={prompt} onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleUpdate(); }}
          placeholder="Update prompt..."
          className="flex-1 bg-crt-black border border-crt-gray rounded px-2 py-1 text-[10px] font-mono text-gray-300 focus:border-crt-amber/40 focus:outline-none" />
        <button onClick={handleUpdate} disabled={updating || !fromId.trim() || !prompt.trim()}
          className="px-2 py-1 text-[9px] font-mono rounded border border-crt-amber/40 bg-crt-amber/10 text-crt-amber"
          style={updating ? { opacity: 0.5 } : undefined}>
          {updating ? "..." : "UPDATE"}
        </button>
      </div>
    </div>
  );
}

// --- AI Suggestions panel ---

export function SuggestionsPanel({
  project, tasks, taskNameMap, onClose,
}: {
  project: string;
  tasks: { id: number; title: string; status: string; dependencies: number[] }[];
  taskNameMap: Map<number, string>;
  onClose: () => void;
}) {
  const [suggesting, setSuggesting] = useState(true);
  const [suggestions, setSuggestions] = useState<{ title: string; description: string; priority: string; after: number[] }[]>([]);

  // Fetch on mount
  useState(() => {
    (async () => {
      try {
        const result = await aiAction({
          action: "suggest-tasks",
          payload: { tasks: tasks.map((t) => ({ id: t.id, title: t.title, status: t.status, dependencies: t.dependencies })) },
        });
        if (result.success) setSuggestions((result.data as { suggestions: typeof suggestions }).suggestions || []);
      } catch {}
      setSuggesting(false);
    })();
  });

  const handleAccept = async (s: typeof suggestions[0]) => {
    await createTask({ action: "create", project, title: s.title, description: s.description, priority: s.priority });
    setSuggestions((prev) => prev.filter((x) => x !== s));
  };

  if (suggesting) return (
    <div className="border-b border-crt-gray/50 bg-crt-amber/5 px-4 py-2">
      <span className="text-[9px] font-mono text-crt-amber">AI SUGGESTING...</span>
    </div>
  );

  if (suggestions.length === 0) return null;

  return (
    <div className="border-b border-crt-gray/50 bg-crt-amber/5 px-4 py-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] font-mono text-crt-amber tracking-wider">AI SUGGESTIONS ({suggestions.length})</span>
        <button onClick={onClose} className="text-[9px] text-crt-gray-text hover:text-gray-200">&#x2715;</button>
      </div>
      <div className="space-y-1.5">
        {suggestions.map((s, i) => (
          <div key={i} className="flex items-start gap-2 bg-crt-dark/50 rounded px-2.5 py-1.5 border border-crt-amber/20">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-mono text-gray-200">{s.title}</div>
              <div className="text-[9px] text-crt-gray-text mt-0.5">{s.description}</div>
              {s.after.length > 0 && (
                <div className="text-[8px] text-crt-gray-text/60 mt-0.5">
                  after: {s.after.map((id) => `#${id} ${taskNameMap.get(id) || ""}`).join(", ")}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className={`text-[8px] font-mono ${s.priority === "high" ? "text-crt-red" : s.priority === "low" ? "text-crt-blue" : "text-crt-amber"}`}>
                {s.priority?.toUpperCase()}
              </span>
              <button onClick={() => handleAccept(s)}
                className="px-1.5 py-0.5 text-[8px] font-mono rounded border border-crt-green/30 bg-crt-green/10 text-crt-green hover:bg-crt-green/20 transition-all">
                + ADD
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
