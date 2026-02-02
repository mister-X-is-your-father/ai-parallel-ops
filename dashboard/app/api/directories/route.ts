export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { readdirSync, statSync } from "fs";
import { join, basename } from "path";
import { homedir } from "os";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q") || "";
  const home = homedir();

  // Resolve the query path
  let searchDir: string;
  let prefix: string;

  if (query === "" || query === "/") {
    searchDir = home;
    prefix = home;
  } else {
    // Replace ~ with home
    const resolved = query.startsWith("~")
      ? join(home, query.slice(1))
      : query;

    // If query ends with /, list contents of that directory
    // Otherwise, list parent directory filtered by basename
    if (query.endsWith("/")) {
      searchDir = resolved;
      prefix = resolved;
    } else {
      searchDir = join(resolved, "..");
      prefix = searchDir;
    }
  }

  try {
    const entries = readdirSync(searchDir, { withFileTypes: true });
    const dirs = entries
      .filter((e) => e.isDirectory() && !e.name.startsWith("."))
      .map((e) => join(prefix, e.name))
      .filter((fullPath) => {
        // Filter by typed text
        const resolved = query.startsWith("~")
          ? join(home, query.slice(1))
          : query;
        if (query.endsWith("/")) return true;
        return fullPath.toLowerCase().includes(resolved.toLowerCase()) ||
          basename(fullPath).toLowerCase().includes(basename(resolved).toLowerCase());
      })
      .sort()
      .slice(0, 50);

    return NextResponse.json({ dirs, home });
  } catch {
    return NextResponse.json({ dirs: [], home });
  }
}
