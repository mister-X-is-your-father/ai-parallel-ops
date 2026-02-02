import { WebSocketServer, WebSocket } from "ws";
import { watch } from "chokidar";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const TASKMASTER_BASE = process.env.TASKMASTER_BASE || join(process.cwd(), "..", ".taskmaster");
const WS_PORT = Number(process.env.WS_PORT) || 5571;
const PROJECTS_FILE = join(TASKMASTER_BASE, "projects.json");
const HUB_TASKS = join(TASKMASTER_BASE, "tasks", "tasks.json");

const HUB_BASE = join(process.cwd(), "..");

function getProjectPaths(): Record<string, string> {
  const result: Record<string, string> = {};

  // Hub task tags → hub base dir
  try {
    const hub = JSON.parse(readFileSync(HUB_TASKS, "utf-8"));
    for (const key of Object.keys(hub)) {
      result[key] = HUB_BASE;
    }
  } catch {}

  // Registered projects
  try {
    if (existsSync(PROJECTS_FILE)) {
      Object.assign(result, JSON.parse(readFileSync(PROJECTS_FILE, "utf-8")));
    }
  } catch {}

  return result;
}

function getAllTaskFiles(): string[] {
  const files = [HUB_TASKS];
  const projects = getProjectPaths();
  for (const dir of Object.values(projects)) {
    const f = join(dir, ".taskmaster", "tasks", "tasks.json");
    if (existsSync(f)) files.push(f);
  }
  return [...new Set(files)];
}

function readAllTasks(): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  // Read hub tasks
  try {
    const hub = JSON.parse(readFileSync(HUB_TASKS, "utf-8"));
    Object.assign(result, hub);
  } catch {}

  // Read each project
  const projects = getProjectPaths();
  for (const [name, dir] of Object.entries(projects)) {
    try {
      const f = join(dir, ".taskmaster", "tasks", "tasks.json");
      const data = JSON.parse(readFileSync(f, "utf-8"));
      if (data.default) {
        result[name] = data.default;
      } else if (data.tasks) {
        result[name] = { tasks: data.tasks, metadata: data.metadata || {} };
      } else {
        const keys = Object.keys(data);
        if (keys.length === 1 && (data[keys[0]] as Record<string, unknown>)?.tasks) {
          result[name] = data[keys[0]];
        }
      }
    } catch {}
  }

  return result;
}

const wss = new WebSocketServer({ port: WS_PORT, host: "0.0.0.0" });

function broadcast(data: unknown) {
  const msg = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

// Watch all task files
let watcher: ReturnType<typeof watch> | null = null;
let debounce: NodeJS.Timeout | null = null;

function setupWatcher() {
  if (watcher) watcher.close();

  const files = getAllTaskFiles();
  files.push(PROJECTS_FILE);

  watcher = watch(files.filter(existsSync), {
    persistent: true,
    ignoreInitial: true,
    usePolling: true,
    interval: 500,
  });

  watcher.on("change", () => {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => {
      broadcast({ type: "tasks-update", data: readAllTasks() });
    }, 200);
  });
}

setupWatcher();

// Re-setup watcher when projects change
watch(PROJECTS_FILE, {
  persistent: true,
  ignoreInitial: true,
  usePolling: true,
  interval: 2000,
}).on("change", () => {
  setTimeout(setupWatcher, 500);
});

wss.on("connection", (ws) => {
  // Send initial data
  ws.send(JSON.stringify({ type: "tasks-update", data: readAllTasks() }));
  ws.send(
    JSON.stringify({ type: "projects-update", data: getProjectPaths() })
  );
});

console.log(`[WS] Task Ops WebSocket server on port ${WS_PORT}`);
