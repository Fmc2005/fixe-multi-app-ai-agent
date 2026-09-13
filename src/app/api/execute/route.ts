import { NextResponse } from "next/server";

import { ExecuteRequestSchema } from "@/agent/schemas";
import { executeApprovedActions } from "@/agent/orchestrator";

export const runtime = "nodejs";

/**
 * Executes only the approved action IDs from a previously generated plan.
 * Idempotent per action via `operationId` — see src/reliability/idempotency.ts.
 * Never call this to generate a plan; it performs real writes.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = ExecuteRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const result = await executeApprovedActions(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
