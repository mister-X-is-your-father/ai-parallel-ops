export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { execSync } from "child_process";

export async function GET() {
  try {
    const output = execSync(
      'tmux list-panes -a -F "#{session_name}:#{window_index}.#{pane_index} #{pane_current_command} #{pane_width}x#{pane_height}"',
      { encoding: "utf-8" }
    );
    const panes = output
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [target, command, size] = line.split(" ");
        return { target, command, size };
      });
    return NextResponse.json(panes);
  } catch {
    return NextResponse.json([]);
  }
}
