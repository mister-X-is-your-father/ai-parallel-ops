import { NextResponse } from "next/server";
import { Result } from "neverthrow";
import type { AppError } from "../services/task-master-service";

export function resultToResponse<T>(result: Result<T, AppError>) {
  return result.match(
    (data) => NextResponse.json({ success: true, result: data }),
    (error) => NextResponse.json({ error: error.message }, { status: error.code === "NOT_IMPLEMENTED" ? 501 : 500 }),
  );
}
