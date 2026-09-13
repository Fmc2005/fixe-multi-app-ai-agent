import { describe, expect, it, vi } from "vitest";

import { idempotencyStore } from "@/reliability/idempotency";
import type { ActionResult } from "@/agent/schemas";

function result(overrides: Partial<ActionResult> = {}): ActionResult {
  return {
    actionId: "a1",
    integration: "zinc",
    status: "success",
    externalId: "ext-1",
    retryable: false,
    ...overrides,
  };
}

describe("idempotencyStore", () => {
  it("runs perform() exactly once for concurrent calls with the same operationId", async () => {
    const perform = vi.fn().mockResolvedValue(result());
    const key = `concurrent-${Math.random()}`;
    const [a, b] = await Promise.all([
      idempotencyStore.getOrCreate(key, perform),
      idempotencyStore.getOrCreate(key, perform),
    ]);
    expect(perform).toHaveBeenCalledTimes(1);
    expect(a).toEqual(b);
  });

  it("returns the cached result on a later call instead of re-running perform()", async () => {
    const perform = vi.fn().mockResolvedValue(result({ externalId: "ext-2" }));
    const key = `cached-${Math.random()}`;
    await idempotencyStore.getOrCreate(key, perform);
    const second = await idempotencyStore.getOrCreate(key, perform);
    expect(perform).toHaveBeenCalledTimes(1);
    expect(second.externalId).toBe("ext-2");
  });

  it("does not cache a failed result, so a later call can retry the write", async () => {
    const key = `retry-${Math.random()}`;
    const failing = vi.fn().mockResolvedValue(result({ status: "failed" }));
    const first = await idempotencyStore.getOrCreate(key, failing);
    expect(first.status).toBe("failed");

    const succeeding = vi.fn().mockResolvedValue(result({ status: "success" }));
    const second = await idempotencyStore.getOrCreate(key, succeeding);
    expect(succeeding).toHaveBeenCalledTimes(1);
    expect(second.status).toBe("success");
  });
});
