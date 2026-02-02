import { describe, it, expect } from "vitest";
import {
  computeDependencyMetadata,
  enrichAllProjects,
} from "../../lib/domain/dependency";

function task(id: number, deps: number[] = [], status = "pending") {
  return { id, status, dependencies: deps };
}

describe("computeDependencyMetadata", () => {
  it("independent tasks have depth 0", () => {
    const result = computeDependencyMetadata([task(1), task(2)]);
    expect(result[0].depth).toBe(0);
    expect(result[0].isIndependent).toBe(true);
    expect(result[0].blockedBy).toEqual([]);
  });

  it("linear chain computes correct depth", () => {
    const result = computeDependencyMetadata([
      task(1),
      task(2, [1]),
      task(3, [2]),
    ]);
    expect(result[0].depth).toBe(0);
    expect(result[1].depth).toBe(1);
    expect(result[2].depth).toBe(2);
  });

  it("blockedBy only includes non-done dependencies", () => {
    const result = computeDependencyMetadata([
      task(1, [], "done"),
      task(2, [], "pending"),
      task(3, [1, 2]),
    ]);
    expect(result[2].blockedBy).toEqual([2]);
  });

  it("dependents are computed correctly", () => {
    const result = computeDependencyMetadata([
      task(1),
      task(2, [1]),
      task(3, [1]),
    ]);
    expect(result[0].dependents).toEqual([2, 3]);
  });

  it("handles circular dependencies without crashing", () => {
    const result = computeDependencyMetadata([
      task(1, [2]),
      task(2, [1]),
    ]);
    expect(result).toHaveLength(2);
  });

  it("handles empty array", () => {
    expect(computeDependencyMetadata([])).toEqual([]);
  });
});

describe("enrichAllProjects", () => {
  it("enriches multiple projects", () => {
    const data = {
      projA: { tasks: [task(1)], metadata: {} },
      projB: { tasks: [task(2), task(3, [2])], metadata: { x: 1 } },
    };
    const result = enrichAllProjects(data);
    expect(result.projA.tasks[0].depth).toBe(0);
    expect(result.projB.tasks[1].depth).toBe(1);
    expect(result.projB.metadata).toEqual({ x: 1 });
  });

  it("handles empty projects", () => {
    expect(enrichAllProjects({})).toEqual({});
  });
});
