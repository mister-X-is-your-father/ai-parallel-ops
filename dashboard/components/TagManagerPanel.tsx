"use client";

import { useState, useEffect, useRef } from "react";
import * as tmActions from "@/lib/actions/task-master";

interface TagManagerPanelProps {
  project: string;
  onClose: () => void;
}

export default function TagManagerPanel({ project, onClose }: TagManagerPanelProps) {
  const [tagList, setTagList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [copying, setCopying] = useState<string | null>(null);
  const [copyValue, setCopyValue] = useState("");
  const [busy, setBusy] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchTags = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await tmActions.listTags({ action: "list-tags", project });
      if (result.success) {
        const data = result.data as { tags?: string[] };
        setTagList(data?.tags || []);
      } else {
        setError(result.error);
      }
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    setLoading(false);
  };

  useEffect(() => { fetchTags(); }, [project]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const handleCreate = async () => {
    if (!newTagName.trim() || busy) return;
    setBusy(true);
    const result = await tmActions.createTag({ action: "create-tag", project, tagName: newTagName.trim() });
    if (!result.success) setError(result.error);
    setNewTagName("");
    setBusy(false);
    await fetchTags();
  };

  const handleUse = async (tag: string) => {
    if (busy) return;
    setBusy(true);
    const result = await tmActions.useTag({ action: "use-tag", project, tagName: tag });
    if (!result.success) setError(result.error);
    setBusy(false);
    await fetchTags();
  };

  const handleDelete = async (tag: string) => {
    if (busy || !confirm(`Delete tag "${tag}"?`)) return;
    setBusy(true);
    const result = await tmActions.deleteTag({ action: "delete-tag", project, tagName: tag });
    if (!result.success) setError(result.error);
    setBusy(false);
    await fetchTags();
  };

  const handleRename = async (oldName: string) => {
    if (!renameValue.trim() || busy) return;
    setBusy(true);
    const result = await tmActions.renameTag({ action: "rename-tag", project, oldName, newName: renameValue.trim() });
    if (!result.success) setError(result.error);
    setRenaming(null);
    setRenameValue("");
    setBusy(false);
    await fetchTags();
  };

  const handleCopy = async (srcTag: string) => {
    if (!copyValue.trim() || busy) return;
    setBusy(true);
    const result = await tmActions.copyTag({ action: "copy-tag", project, srcTag, destTag: copyValue.trim() });
    if (!result.success) setError(result.error);
    setCopying(null);
    setCopyValue("");
    setBusy(false);
    await fetchTags();
  };

  return (
    <div ref={panelRef} className="absolute right-0 top-full mt-1 z-50 bg-crt-dark border border-crt-gray/50 rounded shadow-lg min-w-[220px] max-w-[320px]">
      <div className="px-3 py-2 border-b border-crt-gray/30 flex items-center justify-between">
        <span className="text-[9px] font-mono text-crt-cyan tracking-wider">TAGS — {project}</span>
        <button onClick={onClose} className="text-[9px] text-crt-gray-text hover:text-gray-200">&#x2715;</button>
      </div>

      {error && <div className="px-3 py-1 text-[9px] font-mono text-crt-red">{error}</div>}

      {loading ? (
        <div className="px-3 py-3 text-[9px] font-mono text-crt-gray-text text-center">Loading...</div>
      ) : (
        <div className="max-h-[300px] overflow-y-auto">
          {tagList.map((tag) => (
            <div key={tag} className="px-3 py-1.5 flex items-center gap-1.5 group hover:bg-crt-gray/20 transition-colors">
              <span className="text-[10px] font-mono text-gray-300 flex-1 truncate">{tag}</span>
              {renaming === tag ? (
                <input value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleRename(tag); if (e.key === "Escape") setRenaming(null); }}
                  className="bg-crt-black border border-crt-gray/50 rounded text-[9px] font-mono text-gray-300 px-1 py-0.5 w-20"
                  placeholder="new name" autoFocus />
              ) : copying === tag ? (
                <input value={copyValue} onChange={(e) => setCopyValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleCopy(tag); if (e.key === "Escape") setCopying(null); }}
                  className="bg-crt-black border border-crt-gray/50 rounded text-[9px] font-mono text-gray-300 px-1 py-0.5 w-20"
                  placeholder="copy name" autoFocus />
              ) : (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleUse(tag)} className="text-[8px] font-mono text-crt-green hover:text-crt-green/80" title="Switch to this tag">USE</button>
                  <button onClick={() => { setRenaming(tag); setRenameValue(tag); }} className="text-[8px] font-mono text-crt-amber hover:text-crt-amber/80" title="Rename">REN</button>
                  <button onClick={() => { setCopying(tag); setCopyValue(`${tag}-copy`); }} className="text-[8px] font-mono text-crt-cyan hover:text-crt-cyan/80" title="Copy">CPY</button>
                  <button onClick={() => handleDelete(tag)} className="text-[8px] font-mono text-crt-red hover:text-crt-red/80" title="Delete">DEL</button>
                </div>
              )}
            </div>
          ))}
          {tagList.length === 0 && (
            <div className="px-3 py-2 text-[9px] font-mono text-crt-gray-text text-center">No tags found</div>
          )}
        </div>
      )}

      <div className="px-3 py-2 border-t border-crt-gray/30 flex items-center gap-1">
        <input value={newTagName} onChange={(e) => setNewTagName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
          className="flex-1 bg-crt-black border border-crt-gray/50 rounded text-[9px] font-mono text-gray-300 px-1.5 py-0.5"
          placeholder="New tag name..." />
        <button onClick={handleCreate} disabled={busy || !newTagName.trim()}
          className="text-[8px] font-mono px-1.5 py-0.5 rounded border border-crt-green/30 text-crt-green hover:bg-crt-green/10 disabled:opacity-30">
          CREATE
        </button>
      </div>
    </div>
  );
}
