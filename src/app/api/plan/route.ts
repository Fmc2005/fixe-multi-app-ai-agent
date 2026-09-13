import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { PlanRequestSchema } from "@/agent/schemas";
import { generatePlan } from "@/agent/orchestrator";

export const runtime = "nodejs";

/**
 * Returns a validated LandingPlan. Never performs external writes — see
 * CLAUDE.md "Reliability rules": "Never execute a write during plan
 * generation."
 */
export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = PlanRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const plan = await generatePlan(parsed.data);
    return NextResponse.json(plan);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Plan failed validation", issues: error.issues },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
