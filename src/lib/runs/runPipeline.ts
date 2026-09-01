import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { jobs } from "#/lib/jobManager";
import { loadProject, saveProject, type Project, type Section } from "#/lib/projects";
import { readConfig } from "#/lib/config";
import { generateTextWith } from "#/lib/providers/text";
import { generateImage } from "#/lib/providers/image";
import { generateTTS } from "#/lib/providers/tts";
import { runs, type GenerationRun, type GenerationJob } from "#/lib/runs/runStore";
import { checkBudgetBeforeSchedule, ensureApproved, approveRun, rejectRun } from "#/lib/runs/approval";
import { putAsset, assetDir } from "#/lib/storage/assetStore";

const exec = promisify(execFile);
const FFMPEG = "ffmpeg";

export async function startRun(opts: { projectId: string; folder: string; part: number; budgetCents?: number; warningCents?: number }) {
  const project = loadProject(opts.folder);
  if (!project) throw new Error("project not found");

  const runId = crypto.randomUUID();
  const run: GenerationRun = {
    _id: runId,
    projectId: opts.projectId,
    partId: `${opts.projectId}::part`,
    status: "pending",
    progress: 0,
    stages: ["title", "script", "characters", "scene-planning", "images", "audio", "segments", "final", "qa"],
    costEstimatedCents: opts.budgetCents,
    costWarningThresholdCents: opts.warningCents,
    costHardLimitCents: opts.budgetCents,
    approvalState: "not_required",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  runs.create(run);

  const stageJobs: GenerationJob[] = [
    makeJob(runId, opts.projectId, `${opts.projectId}::part`, "story", 0),
    makeJob(runId, opts.projectId, `${opts.projectId}::part`, "script", 1),
    makeJob(runId, opts.projectId, `${opts.projectId}::part`, "scene", 2),
    makeJob(runId, opts.projectId, `${opts.projectId}::part`, "image", 3),
    makeJob(runId, opts.projectId, `${opts.projectId}::part`, "voice", 4),
    makeJob(runId, opts.projectId, `${opts.projectId}::part`, "timeline", 5),
    makeJob(runId, opts.projectId, `${opts.projectId}::part`, "render", 6),
    makeJob(runId, opts.projectId, `${opts.projectId}::part`, "qa", 7),
  ];
  for (const j of stageJobs) runs.addJob(j);

  runPipeline(runId, opts.folder, opts.part).catch((e) => jobs.logMsg(opts.projectId, `fatal: ${e?.message ?? e}`));
  return runId;
}

export function getRunState(runId: string) {
  const state = runs.get(runId);
  if (!state) return null;
  return { ...state, jobs: state.jobs, events: state.events };
}

export function approveRunAndContinue(runId: string, artifactVersion: string) {
  approveRun(runId, artifactVersion);
}

export function rejectRunAndStop(runId: string) {
  rejectRun(runId);
}

function makeJob(runId: string, projectId: string, partId: string, type: GenerationJob["type"], order: number): GenerationJob {
  return {
    _id: crypto.randomUUID(),
    runId,
    projectId,
    partId,
    type,
    status: "pending",
    attempt: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
