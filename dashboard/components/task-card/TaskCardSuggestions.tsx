"use client";

import { createTask } from "@/lib/actions/tasks";

interface TaskCardSuggestionsProps {
  suggestions: { title: string; description: string }[];
  project: string;
  onRemove: (index: number) => void;
}

export default function TaskCardSuggestions({ suggestions, project, onRemove }: TaskCardSuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="mb-2 border border-crt-amber/20 rounded bg-crt-black/30 px-2 py-1.5">
      <div className="text-[8px] font-mono text-crt-amber tracking-wider mb-1">SUGGESTED FOLLOW-UP TASKS</div>
      {suggestions.map((s, i) => (
        <div key={i} className="flex items-start gap-1.5 py-1 border-b border-crt-gray/15 last:border-0">
          <div className="flex-1">
            <div className="text-[10px] font-mono text-gray-200">{s.title}</div>
            <div className="text-[9px] font-mono text-crt-gray-text">{s.description}</div>
          </div>
          <button
            onClick={async () => {
              await createTask({ action: "create", project, title: s.title, description: s.description, priority: "medium" });
              onRemove(i);
            }}
            className="text-[8px] font-mono px-1.5 py-0.5 rounded border border-crt-green/30 text-crt-green hover:bg-crt-green/10 shrink-0"
          >ADD</button>
        </div>
      ))}
    </div>
  );
}
