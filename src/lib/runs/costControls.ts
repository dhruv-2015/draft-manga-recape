import type { GenerationRun, GenerationJob } from "../domain/types.ts";
import { runs } from "./runStore.ts";

export type BudgetCheck = { allowed: boolean; reason?: string; remainingCents: number };

export function canSchedule(run: GenerationRun, job: GenerationJob, jobActualCostCents?: number): BudgetCheck {
  const spent = run.costActualCents ?? 0;
  const hard = run.costHardLimitCents ?? Number.POSITIVE_INFINITY;
  const est = job.estimatedCostCents ?? 0;
  const actual = jobActualCostCents ?? 0;
  const remaining = hard - spent;
  if (actual > 0) {
    if (spent + actual > hard) return { allowed: false, reason: "budget_blocked", remainingCents: Math.max(0, remaining) };
  } else if (est > 0) {
    if (spent + est > hard) return { allowed: false, reason: "budget_blocked", remainingCents: Math.max(0, remaining) };
  }
  return { allowed: true, remainingCents: Math.max(0, remaining) };
}

export function warnThreshold(run: GenerationRun): boolean {
  const spent = run.costActualCents ?? 0;
  const threshold = run.costWarningThresholdCents ?? Number.POSITIVE_INFINITY;
  return spent >= threshold;
}
