import { db } from "../src/lib/storage/mongo.ts";
import type { GenerationRun, GenerationJob, GenerationEvent } from "../src/lib/domain/types";

export type RunRecord = GenerationRun;
export type JobRecord = GenerationJob;
export type EventRecord = GenerationEvent;

export async function listRuns(projectId?: string): Promise<RunRecord[]> {
  const runs = await db.generationRuns();
  return projectId ? runs.list(projectId) : runs.list();
}

export async function getRun(runId: string): Promise<RunRecord | undefined> {
  const runs = await db.generationRuns();
  const all = await runs.list();
  return all.find((r: any) => r._id === runId);
}

export async function saveRun(run: RunRecord): Promise<RunRecord> {
  const runs = await db.generationRuns();
  await runs.save(run as any);
  return run;
}

export async function listJobs(runId: string): Promise<JobRecord[]> {
  const jobs = await db.generationJobs();
  return jobs.list(runId);
}

export async function saveJob(job: JobRecord): Promise<JobRecord> {
  const jobs = await db.generationJobs();
  await jobs.save(job as any);
  return job;
}

export async function addEvent(ev: EventRecord): Promise<EventRecord> {
  const events = await db.generationEvents();
  await events.save(ev as any);
  return ev;
}

export async function listEvents(runId: string): Promise<EventRecord[]> {
  const events = await db.generationEvents();
  return events.list(runId);
}

export async function updateRunStatus(runId: string, patch: Partial<RunRecord>) {
  const run = await getRun(runId);
  if (!run) return;
  await saveRun({ ...run, ...patch, updatedAt: new Date().toISOString() } as RunRecord);
}

export async function approveRun(runId: string, artifactVersion: string) {
  await updateRunStatus(runId, { approvalState: "approved", approvalArtifactVersion: artifactVersion });
}

export async function rejectRun(runId: string) {
  await updateRunStatus(runId, { approvalState: "rejected" });
}
