import type { Subtask } from "./types";

export const PRIORITY_CLASS: Record<string, string> = {
  high: "priority-high",
  medium: "priority-medium",
  low: "priority-low",
};

export const PRIORITY_LABEL: Record<string, { text: string; class: string }> = {
  high: { text: "HIGH", class: "text-crt-red" },
  medium: { text: "MED", class: "text-crt-amber" },
  low: { text: "LOW", class: "text-crt-blue" },
};

export const SUBTASK_STATUS_FLOW: Record<string, string> = {
  pending: "in-progress",
  "in-progress": "done",
  done: "verified",
  verified: "pending",
};

export const SUBTASK_STATUS_ICON: Record<string, string> = {
  pending: "\u25cb",
  "in-progress": "\u25ce",
  done: "\u25c9",
  verified: "\u2714",
};

export const SUBTASK_STATUS_CLASS: Record<string, string> = {
  pending: "text-crt-gray-text",
  "in-progress": "glow-green",
  done: "glow-cyan",
  verified: "glow-blue",
};

export function countDone(subtasks: Subtask[]): { done: number; total: number } {
  let done = 0, total = 0;
  for (const s of subtasks) {
    total++;
    if (s.status === "done" || s.status === "verified") done++;
    if (s.subtasks?.length) {
      const child = countDone(s.subtasks);
      done += child.done;
      total += child.total;
    }
  }
  return { done, total };
}
