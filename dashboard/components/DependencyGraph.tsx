"use client";

import { useMemo, useCallback } from "react";
import {
  ReactFlow,
  type Node,
  type Edge,
  Position,
  MarkerType,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { Task } from "@/lib/domain/types";

interface DependencyGraphProps {
  tasks: Task[];
}

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  pending: { bg: "#1a1500", border: "#d97706", text: "#fbbf24" },
  "in-progress": { bg: "#001a00", border: "#00ff41", text: "#00ff41" },
  done: { bg: "#001a1a", border: "#00ffcc", text: "#00ffcc" },
  blocked: { bg: "#1a0000", border: "#ff0040", text: "#ff0040" },
};

function getNodeColor(task: Task) {
  const blockedBy = (task as { blockedBy?: number[] }).blockedBy;
  if (blockedBy && blockedBy.length > 0 && task.status !== "done") {
    return STATUS_COLORS.blocked;
  }
  return STATUS_COLORS[task.status] || STATUS_COLORS.pending;
}

export default function DependencyGraph({ tasks }: DependencyGraphProps) {
  // Find critical path (longest chain)
  const criticalPathIds = useMemo(() => {
    const taskMap = new Map(tasks.map((t) => [t.id, t]));
    const memo = new Map<number, number[]>();

    function longestPath(id: number, visited: Set<number>): number[] {
      if (memo.has(id)) return memo.get(id)!;
      if (visited.has(id)) return [id];
      visited.add(id);
      const task = taskMap.get(id);
      if (!task || task.dependencies.length === 0) {
        memo.set(id, [id]);
        return [id];
      }
      let best: number[] = [];
      for (const dep of task.dependencies) {
        const path = longestPath(dep, visited);
        if (path.length > best.length) best = path;
      }
      const result = [...best, id];
      memo.set(id, result);
      return result;
    }

    let longest: number[] = [];
    for (const t of tasks) {
      const path = longestPath(t.id, new Set());
      if (path.length > longest.length) longest = path;
    }
    return new Set(longest);
  }, [tasks]);

  const { initialNodes, initialEdges } = useMemo(() => {
    // Group by depth for layout
    const depthGroups = new Map<number, Task[]>();
    for (const t of tasks) {
      const d = t.depth ?? 0;
      if (!depthGroups.has(d)) depthGroups.set(d, []);
      depthGroups.get(d)!.push(t);
    }

    const nodes: Node[] = [];
    const xGap = 220;
    const yGap = 80;

    for (const [depth, group] of depthGroups) {
      group.forEach((task, i) => {
        const color = getNodeColor(task);
        const isCritical = criticalPathIds.has(task.id);
        nodes.push({
          id: String(task.id),
          position: { x: depth * xGap + 20, y: i * yGap + 20 },
          data: {
            label: `#${task.id} ${task.title.length > 25 ? task.title.slice(0, 25) + "…" : task.title}`,
          },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          style: {
            background: color.bg,
            border: `1px solid ${color.border}`,
            color: color.text,
            fontSize: "10px",
            fontFamily: "monospace",
            padding: "6px 10px",
            borderRadius: "4px",
            minWidth: "160px",
            boxShadow: isCritical ? `0 0 8px ${color.border}` : "none",
          },
        });
      });
    }

    const edges: Edge[] = [];
    for (const task of tasks) {
      for (const dep of task.dependencies) {
        const isCriticalEdge = criticalPathIds.has(task.id) && criticalPathIds.has(dep);
        edges.push({
          id: `${dep}-${task.id}`,
          source: String(dep),
          target: String(task.id),
          markerEnd: { type: MarkerType.ArrowClosed, color: isCriticalEdge ? "#ff0040" : "#555" },
          style: {
            stroke: isCriticalEdge ? "#ff0040" : "#444",
            strokeWidth: isCriticalEdge ? 2 : 1,
          },
          animated: isCriticalEdge,
        });
      }
    }

    return { initialNodes: nodes, initialEdges: edges };
  }, [tasks, criticalPathIds]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div className="h-[300px] bg-crt-black/50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        proOptions={{ hideAttribution: true }}
        style={{ background: "transparent" }}
        nodesDraggable={true}
        nodesConnectable={false}
        minZoom={0.3}
        maxZoom={2}
      />
    </div>
  );
}
