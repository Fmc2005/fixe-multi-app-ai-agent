import { describe, expect, it, vi } from "vitest";

import { withRetry, TimeoutError } from "@/reliability/retry";

describe("withRetry", () => {
  it("returns the result on first success without retrying", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withRetry(fn, { operation: "test" });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries exactly once by default after a failure, then succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce("recovered");
    const result = await withRetry(fn, { operation: "test", backoffMs: 1 });
    expect(result).toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("throws after exhausting retries", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("always fails"));
    await expect(withRetry(fn, { operation: "test", backoffMs: 1 })).rejects.toThrow(
      "always fails",
    );
    expect(fn).toHaveBeenCalledTimes(2); // 1 attempt + 1 retry
  });

  it("aborts and reports a TimeoutError when the operation exceeds timeoutMs", async () => {
    const fn = vi.fn(
      (signal: AbortSignal) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(new Error("aborted by caller")));
        }),
    );
    await expect(
      withRetry(fn, { operation: "slow", timeoutMs: 10, retries: 0 }),
    ).rejects.toBeInstanceOf(TimeoutError);
  });
});
