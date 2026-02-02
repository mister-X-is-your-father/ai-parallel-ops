import type { Task } from "./types";

// --- Status classification (OCP: add entries, don't modify logic) ---

const STATUS_MAP: Record<string, string> = {
  paused: "in-progress",
  blocked: "waiting",
  review: "done",
  deferred: "deferred",
  cancelled: "deferred",
};

export function classifyTask(t: Task): string {
  const isDoneOrVerified = t.status === "done" || t.status === "verified";
  if ((t.blockedBy?.length ?? 0) > 0 && !isDoneOrVerified) return "waiting";
  return STATUS_MAP[t.status] ?? t.status;
}

// --- Filters (OCP: add entries to FILTER_FNS) ---

const FILTER_FNS: Record<string, (t: Task) => boolean> = {
  all: () => true,
  independent: (t) => !!t.isIndependent,
  dependent: (t) => !t.isIndependent,
  waiting: (t) => (t.blockedBy?.length ?? 0) > 0,
};

export function applyFilter(tasks: Task[], filter: string): Task[] {
  const fn = FILTER_FNS[filter];
  return fn ? tasks.filter(fn) : tasks;
}
