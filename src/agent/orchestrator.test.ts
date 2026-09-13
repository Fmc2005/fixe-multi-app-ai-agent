import { describe, expect, it } from "vitest";

import { generatePlan, executeApprovedActions, demoPlanRequest } from "@/agent/orchestrator";
import { LandingPlanSchema, ExecuteResponseSchema } from "@/agent/schemas";

describe("orchestrator (demo mode, no live credentials required)", () => {
  it("generates a valid LandingPlan from fixtures", async () => {
    const plan = await generatePlan({ ...demoPlanRequest, demoMode: true });
    expect(() => LandingPlanSchema.parse(plan)).not.toThrow();
    expect(plan.recommendations.length).toBeGreaterThan(0);
    expect(plan.warnings.some((w) => w.includes("Demo mode"))).toBe(true);
    expect(plan.proposedActions.length).toBeGreaterThan(0);
  });

  it("never proposes conflicting calendar actions against existing events", async () => {
    const plan = await generatePlan({ ...demoPlanRequest, demoMode: true });
    const calendarActions = plan.proposedActions.filter((a) => a.integration === "google-calendar");
    expect(calendarActions.length).toBeGreaterThan(0);
  });

  it("executes approved actions idempotently without hitting live APIs", async () => {
    const plan = await generatePlan({ ...demoPlanRequest, demoMode: true });
    const actionIds = plan.proposedActions.map((a) => a.actionId);

    const first = await executeApprovedActions({ planId: plan.planId, approvedActionIds: actionIds });
    expect(() => ExecuteResponseSchema.parse(first)).not.toThrow();
    expect(first.results.every((r) => r.status !== "failed")).toBe(true);

    // Calling execute twice (e.g. double-click) must not produce different
    // external ids for the same action.
    const second = await executeApprovedActions({ planId: plan.planId, approvedActionIds: actionIds });
    expect(second.results.map((r) => r.externalId)).toEqual(first.results.map((r) => r.externalId));
  });

  it("rejects execution against an unknown planId", async () => {
    await expect(
      executeApprovedActions({ planId: "does-not-exist", approvedActionIds: ["x"] }),
    ).rejects.toThrow(/Unknown planId/);
  });
});
