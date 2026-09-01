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
import { runs } from "#/lib/runs/runStore";
import type { GenerationRun, GenerationJob } from "#/lib/domain/types";
import { checkBudgetBeforeSchedule, ensureApproved, approveRun, rejectRun } from "#/lib/runs/approval";
import { putAsset, assetDir } from "#/lib/storage/assetStore";

const exec = promisify(execFile);
const FFMPEG = "ffmpeg";

async function runPipeline(runId: string, folder: string, part: number): Promise<void> {
  const cfg = readConfig();
  const state = runs.get(runId);
  if (!state) return;
  const run = state.run as GenerationRun;
  const project = loadProject(folder) as Project | null;
  if (!project) return;

  const stages = run.stages ?? ["story", "script", "scene", "image", "voice", "timeline", "render", "qa"];
  const projectDir = assetDir(project.folder);
  for (const stage of stages) {
    if (run.status === "cancelling" || run.status === "cancelled") break;
    const job = makeJob(runId, project.folder, `${project.folder}::part`, stage as GenerationJob["type"], stages.indexOf(stage));
    runs.addJob(job);
    runs.updateJob(job._id, { status: "running", updatedAt: new Date().toISOString() });
    jobs.logMsg(project.folder, `[${runId}] ${stage}: started`);
    try {
      if (stage === "story" || stage === "script") {
        const text = await generateTextWith({ providerId: cfg.activeTextProvider ?? Object.keys(cfg.textProviders ?? {})[0], prompt: `Generate a manga recap script for part ${part} of ${project.title}` });
        jobs.logMsg(project.folder, `[${runId}] ${stage}: text generated`);
      } else if (stage === "image") {
        const outPath = path.join(projectDir, `work`, `scene-${Date.now()}.png`);
        await generateImage({ prompt: `Manga recap scene ${part}`, outPath });
        jobs.logMsg(project.folder, `[${runId}] ${stage}: image generated`);
      } else if (stage === "voice") {
        const mp3 = path.join(projectDir, "audio", `voice-${Date.now()}.mp3`);
        await generateTTS({ text: "Hello world", mp3Path: mp3, voice: cfg.ttsVoice, rate: cfg.ttsRate });
        jobs.logMsg(project.folder, `[${runId}] ${stage}: tts generated`);
      } else if (stage === "render") {
        const out = path.join(projectDir, `segments`, `part-${part}.mp4`);
        const args = ["-y", "-f", "lavfi", "-i", "color=c=black:s=1280x720:d=1", "-c:v", "libx264", "-pix_fmt", "yuv420p", out];
        await exec(FFMPEG, args, { maxBuffer: 1024 * 1024 * 1024 });
        jobs.logMsg(project.folder, `[${runId}] ${stage}: rendered ${out}`);
      } else {
        await new Promise((r) => setTimeout(r, 300));
      }
      runs.updateJob(job._id, { status: "completed", updatedAt: new Date().toISOString() });
    } catch (e: unknown) {
      runs.updateJob(job._id, { status: "failed", error: (e as any)?.message ?? String(e), updatedAt: new Date().toISOString() });
      jobs.logMsg(project.folder, `[${runId}] ${stage}: failed ${(e as any)?.message ?? e}`);
      if (stage === "story" || stage === "script") break;
    }
  }
  runs.updateRun(runId, { status: "completed", updatedAt: new Date().toISOString() });
}

export async function startRun(opts: { projectId: string; folder: string; part: number; budgetCents?: number; warningCents?: number }): Promise<string> {
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

  runPipeline(runId, opts.folder, opts.part).catch((e: unknown) => jobs.logMsg(opts.projectId, `fatal: ${(e as any)?.message ?? e}`));
  return runId;
}

export function getRunState(runId: string) {
  const state = runs.get(runId);
  if (!state) return null;
  return { ...state, jobs: state.jobs, events: state.events };
}

export function approveRunAndContinue(runId: string, artifactVersion: string): void {
  approveRun(runId, artifactVersion);
}

export function rejectRunAndStop(runId: string): void {
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
