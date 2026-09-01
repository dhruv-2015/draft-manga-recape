import type { GenerationRun, GenerationJob, GenerationEvent } from "../domain/types.ts";
import { runs } from "./runStore.ts";
import { canSchedule, warnThreshold } from "./costControls.ts";

export type RetryMode = "job" | "failed" | "stage" | "from_stage";

export function approveRun(runId: string, artifactVersion: string) {
  const state = runs.get(runId);
  if (!state) return;
  runs.updateRun(runId, { approvalState: "approved", approvalArtifactVersion: artifactVersion });
  runs.addEvent({ _id: crypto.randomUUID(), runId, type: "progress", detail: { approval: "approved", artifactVersion }, createdAt: new Date().toISOString() });
}

export function rejectRun(runId: string) {
  const state = runs.get(runId);
  if (!state) return;
  runs.updateRun(runId, { approvalState: "rejected" });
  runs.addEvent({ _id: crypto.randomUUID(), runId, type: "progress", detail: { approval: "rejected" }, createdAt: new Date().toISOString() });
}

export function ensureApproved(run: GenerationRun, artifactVersion: string): boolean {
  if (run.approvalState === "not_required") return true;
  return run.approvalState === "approved" && run.approvalArtifactVersion === artifactVersion;
}

export function applyRetry(runId: string, mode: RetryMode, stage?: string) {
  const state = runs.get(runId);
  if (!state) return;
  const jobs = state.jobs;
  for (const j of jobs) {
    const inScope = mode === "failed" ? j.status === "failed"
      : mode === "stage" ? j.type === stage
      : mode === "from_stage" ? j.type === stage || j.status === "pending" || j.status === "failed"
      : j._id === stage;
    if (!inScope) continue;
    runs.updateJob(j._id, { status: "pending", attempt: j.attempt + 1, error: undefined });
    runs.addEvent({ _id: crypto.randomUUID(), runId, jobId: j._id, type: "retrying", detail: { mode, stage }, createdAt: new Date().toISOString() });
  }
}

export function checkBudgetBeforeSchedule(run: GenerationRun, job: GenerationJob): boolean {
  const check = canSchedule(run, job);
  if (!check.allowed) {
    runs.updateRun(run._id, { status: "paused" });
    runs.addEvent({ _id: crypto.randomUUID(), runId: run._id, jobId: job._id, type: "budget_blocked", detail: { remainingCents: check.remainingCents, reason: check.reason }, createdAt: new Date().toISOString() });
    return false;
  }
  if (warnThreshold(run)) {
    runs.addEvent({ _id: crypto.randomUUID(), runId: run._id, jobId: job._id, type: "progress", detail: { warning: "cost_warning_threshold_reached" }, createdAt: new Date().toISOString() });
  }
  return true;
}
