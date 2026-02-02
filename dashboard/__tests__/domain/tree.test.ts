import { describe, it, expect } from "vitest";
import {
  findSubtaskRecursive,
  findSubtaskParent,
  maxSubtaskId,
  allSubtasksDone,
} from "../../lib/domain/tree";
import type { Subtask } from "../../lib/domain/types";

const nested: Subtask[] = [
  { id: 1, title: "A", status: "done" },
  {
    id: 2,
    title: "B",
    status: "done",
    subtasks: [
      { id: 3, title: "B1", status: "done" },
      {
        id: 4,
        title: "B2",
        status: "done",
        subtasks: [{ id: 5, title: "B2a", status: "pending" }],
      },
    ],
  },
];

describe("findSubtaskRecursive", () => {
  it("finds root-level subtask", () => {
    expect(findSubtaskRecursive(nested, 1)?.title).toBe("A");
  });
  it("finds deeply nested subtask", () => {
    expect(findSubtaskRecursive(nested, 5)?.title).toBe("B2a");
  });
  it("returns null when not found", () => {
    expect(findSubtaskRecursive(nested, 99)).toBeNull();
  });
  it("returns null for empty tree", () => {
    expect(findSubtaskRecursive([], 1)).toBeNull();
  });
});

describe("findSubtaskParent", () => {
  it("finds root-level parent array", () => {
    const result = findSubtaskParent(nested, 1);
    expect(result).not.toBeNull();
    expect(result!.idx).toBe(0);
    expect(result!.arr).toBe(nested);
  });
  it("finds nested parent array", () => {
    const result = findSubtaskParent(nested, 5);
    expect(result).not.toBeNull();
    expect(result!.idx).toBe(0);
    expect(result!.arr[0].title).toBe("B2a");
  });
  it("returns null when not found", () => {
    expect(findSubtaskParent(nested, 99)).toBeNull();
  });
});

describe("maxSubtaskId", () => {
  it("returns max across nested structure", () => {
    expect(maxSubtaskId(nested)).toBe(5);
  });
  it("returns 0 for empty tree", () => {
    expect(maxSubtaskId([])).toBe(0);
  });
});

describe("allSubtasksDone", () => {
  it("returns false when any pending", () => {
    expect(allSubtasksDone(nested)).toBe(false);
  });
  it("returns true when all done", () => {
    const all: Subtask[] = [
      { id: 1, title: "A", status: "done" },
      { id: 2, title: "B", status: "verified" },
    ];
    expect(allSubtasksDone(all)).toBe(true);
  });
  it("returns true for empty array", () => {
    expect(allSubtasksDone([])).toBe(true);
  });
});
