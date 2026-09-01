import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data", "db");
const RUNS_FILE = path.join(DATA_DIR, "generationRuns.json");
const JOBS_FILE = path.join(DATA_DIR, "generationJobs.json");
const EVENTS_FILE = path.join(DATA_DIR, "generationEvents.json");

function ensure(): void { fs.mkdirSync(DATA_DIR, { recursive: true }); }
function readJson<T>(file: string, fallback: T[]): T[] { try { return JSON.parse(fs.readFileSync(file, "utf-8")); } catch { ensure(); return fallback; } }
function writeJson<T>(file: string, data: T[]): void { ensure(); fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8"); }

export type RunRecord = {
  _id: string;
  projectId: string;
  partId: string;
  status: "pending" | "running" | "paused" | "cancelling" | "cancelled" | "failed" | "completed";
  progress: number;
  stages: string[];
  startedAt?: string;
  finishedAt?: string;
  costEstimatedCents?: number;
  costWarningThresholdCents?: number;
  costHardLimitCents?: number;
  costActualCents?: number;
  approvalState: "not_required" | "pending" | "approved" | "rejected";
  approvalArtifactVersion?: string;
  createdAt: string;
  updatedAt: string;
};

export type JobRecord = {
  _id: string;
  runId: string;
  projectId: string;
  partId: string;
  type: "story" | "script" | "scene" | "shot" | "image" | "voice" | "timeline" | "render" | "qa";
  status: "pending" | "running" | "paused" | "cancelling" | "cancelled" | "failed" | "completed";
  inputHash?: string;
  outputAssetId?: string;
  provider?: string;
  model?: string;
  estimatedCostCents?: number;
  actualCostCents?: number;
  attempt: number;
  retryOfJobId?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

export type EventRecord = {
  _id: string;
  runId: string;
  jobId?: string;
  level: "info" | "warn" | "error";
  message: string;
  createdAt: string;
};

export function listRuns(projectId?: string): RunRecord[] {
  const all = readJson<RunRecord>(RUNS_FILE, []);
  return projectId ? all.filter((r) => r.projectId === projectId) : all;
}

export function getRun(runId: string): RunRecord | undefined {
  return listRuns().find((r) => r._id === runId);
}

export function saveRun(run: RunRecord): RunRecord {
  const all = listRuns();
  const i = all.findIndex((x) => x._id === run._id);
  if (i >= 0) all[i] = run; else all.push(run);
  writeJson<RunRecord>(RUNS_FILE, all);
  return run;
}

export function listJobs(runId: string): JobRecord[] {
  return readJson<JobRecord>(JOBS_FILE, []).filter((j) => j.runId === runId);
}

export function saveJob(job: JobRecord): JobRecord {
  const all = readJson<JobRecord>(JOBS_FILE, []);
  const i = all.findIndex((x) => x._id === job._id);
  if (i >= 0) all[i] = job; else all.push(job);
  writeJson<JobRecord>(JOBS_FILE, all);
  return job;
}

export function addEvent(ev: EventRecord): EventRecord {
  const all = readJson<EventRecord>(EVENTS_FILE, []);
  all.push(ev);
  if (all.length > 1000) all.splice(0, all.length - 1000);
  writeJson<EventRecord>(EVENTS_FILE, all);
  return ev;
}

export function listEvents(runId: string): EventRecord[] {
  return readJson<EventRecord>(EVENTS_FILE, []).filter((e) => e.runId === runId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function updateRunStatus(runId: string, patch: Partial<RunRecord>) {
  const run = getRun(runId);
  if (!run) return;
  saveRun({ ...run, ...patch, updatedAt: new Date().toISOString() });
}

export function approveRun(runId: string, artifactVersion: string) {
  updateRunStatus(runId, { approvalState: "approved", approvalArtifactVersion: artifactVersion });
}

export function rejectRun(runId: string) {
  updateRunStatus(runId, { approvalState: "rejected" });
}
