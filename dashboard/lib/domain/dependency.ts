export interface EnrichedFields {
  blockedBy: number[];
  dependents: number[];
  isIndependent: boolean;
  depth: number;
}

export function computeDependencyMetadata<
  T extends { id: number; status: string; dependencies: number[] },
>(tasks: T[]): (T & EnrichedFields)[] {
  const taskMap = new Map<number, T>();
  for (const t of tasks) taskMap.set(t.id, t);

  const dependents = new Map<number, number[]>();
  for (const t of tasks) {
    for (const dep of t.dependencies) {
      if (!dependents.has(dep)) dependents.set(dep, []);
      dependents.get(dep)!.push(t.id);
    }
  }

  const depthCache = new Map<number, number>();
  function getDepth(id: number, visited: Set<number>): number {
    if (depthCache.has(id)) return depthCache.get(id)!;
    if (visited.has(id)) return 0;
    visited.add(id);
    const task = taskMap.get(id);
    if (!task || task.dependencies.length === 0) {
      depthCache.set(id, 0);
      return 0;
    }
    const d =
      1 + Math.max(...task.dependencies.map((dep) => getDepth(dep, visited)));
    depthCache.set(id, d);
    return d;
  }

  return tasks.map((t) => ({
    ...t,
    blockedBy: t.dependencies.filter((dep) => {
      const depTask = taskMap.get(dep);
      return (
        depTask && depTask.status !== "done" && depTask.status !== "verified"
      );
    }),
    dependents: dependents.get(t.id) || [],
    isIndependent: t.dependencies.length === 0,
    depth: getDepth(t.id, new Set()),
  }));
}

// --- Pure dependency mutation/validation functions ---

interface DepTask { id: number; dependencies?: number[] }

export function addDependencyPure(tasks: DepTask[], taskId: number, depId: number): string | null {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return `Task #${taskId} not found`;
  if (!tasks.some(t => t.id === depId)) return `Dependency #${depId} not found`;
  if (!task.dependencies) task.dependencies = [];
  if (!task.dependencies.includes(depId)) task.dependencies.push(depId);
  return null;
}

export function removeDependencyPure(tasks: DepTask[], taskId: number, depId: number): string | null {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return `Task #${taskId} not found`;
  task.dependencies = (task.dependencies || []).filter(d => d !== depId);
  return null;
}

export function validateDependencies(tasks: DepTask[]): { valid: boolean; issues: string[] } {
  const ids = new Set(tasks.map(t => t.id));
  const issues: string[] = [];
  for (const t of tasks) {
    for (const dep of t.dependencies || []) {
      if (!ids.has(dep)) issues.push(`Task #${t.id} depends on non-existent #${dep}`);
      if (dep === t.id) issues.push(`Task #${t.id} depends on itself`);
    }
  }
  // Cycle detection (DFS)
  const visited = new Set<number>();
  const inStack = new Set<number>();
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  function dfs(id: number, path: number[]) {
    if (inStack.has(id)) { issues.push(`Cycle detected: ${[...path, id].join(" → ")}`); return; }
    if (visited.has(id)) return;
    visited.add(id); inStack.add(id);
    for (const dep of taskMap.get(id)?.dependencies || []) dfs(dep, [...path, id]);
    inStack.delete(id);
  }
  for (const t of tasks) if (!visited.has(t.id)) dfs(t.id, []);
  return { valid: issues.length === 0, issues };
}

export function fixDependenciesPure(tasks: DepTask[]): number {
  const ids = new Set(tasks.map(t => t.id));
  let fixed = 0;
  for (const t of tasks) {
    if (!t.dependencies) continue;
    const before = t.dependencies.length;
    t.dependencies = t.dependencies.filter(d => ids.has(d) && d !== t.id);
    fixed += before - t.dependencies.length;
  }
  return fixed;
}

export function enrichAllProjects<
  T extends { id: number; status: string; dependencies: number[] },
>(
  data: Record<string, { tasks: T[]; metadata: Record<string, unknown> }>
): Record<
  string,
  { tasks: (T & EnrichedFields)[]; metadata: Record<string, unknown> }
> {
  const result: Record<
    string,
    { tasks: (T & EnrichedFields)[]; metadata: Record<string, unknown> }
  > = {};
  for (const [name, project] of Object.entries(data)) {
    if (project?.tasks) {
      result[name] = {
        ...project,
        tasks: computeDependencyMetadata(project.tasks),
      };
    }
  }
  return result;
}
