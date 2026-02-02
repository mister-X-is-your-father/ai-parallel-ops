import type { Subtask } from "./types";

export function findSubtaskRecursive(
  subtasks: Subtask[],
  id: number
): Subtask | null {
  for (const s of subtasks) {
    if (s.id === id) return s;
    if (s.subtasks) {
      const found = findSubtaskRecursive(s.subtasks, id);
      if (found) return found;
    }
  }
  return null;
}

export function findSubtaskParent(
  subtasks: Subtask[],
  id: number
): { arr: Subtask[]; idx: number } | null {
  for (let i = 0; i < subtasks.length; i++) {
    if (subtasks[i].id === id) return { arr: subtasks, idx: i };
    if (subtasks[i].subtasks) {
      const found = findSubtaskParent(subtasks[i].subtasks!, id);
      if (found) return found;
    }
  }
  return null;
}

export function maxSubtaskId(subtasks: Subtask[]): number {
  let max = 0;
  for (const s of subtasks) {
    if (s.id > max) max = s.id;
    if (s.subtasks) {
      const childMax = maxSubtaskId(s.subtasks);
      if (childMax > max) max = childMax;
    }
  }
  return max;
}

export function allSubtasksDone(subtasks: Subtask[]): boolean {
  return subtasks.every((s) => {
    const selfDone = s.status === "done" || s.status === "verified";
    if (s.subtasks && s.subtasks.length > 0)
      return selfDone && allSubtasksDone(s.subtasks);
    return selfDone;
  });
}
