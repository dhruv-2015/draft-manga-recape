import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { jobs } from "../jobManager.ts";
import { loadProject, saveProject, type Project, type Section } from "../projects.ts";
import { readConfig } from "../config.ts";
import { generateTextWith } from "../providers/text.ts";
import { generateImage } from "../providers/image.ts";
import { generateTTS } from "../providers/tts.ts";
import { runs } from "./runStore.ts";
import type { GenerationRun, GenerationJob } from "../domain/types.ts";
import { checkBudgetBeforeSchedule, ensureApproved, approveRun, rejectRun } from "./approval.ts";
import { putAsset, assetDir } from "../storage/assetStore.ts";
import { db } from "../storage/mongo.ts";

const exec = promisify(execFile);
const FFMPEG = "ffmpeg";

async function ensureRun(runId: string, projectId: string, folder: string): Promise<GenerationRun> {
  console.log("[pipeline] ensureRun", { runId, projectId, folder });
  let state = runs.get(runId);
  if (!state) {
    console.log("[pipeline] creating run", runId);
    const run: GenerationRun = {
      _id: runId,
      projectId,
      partId: `${projectId}::part`,
      status: "pending",
      progress: 0,
      stages: ["story", "script", "scene", "image", "voice", "timeline", "render", "qa"],
      approvalState: "not_required",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    runs.create(run);
    await db.generationRuns().then((c) => c.save(run as any));
    const stageJobs: GenerationJob[] = [
      makeJob(runId, projectId, `${projectId}::part`, "story", 0),
      makeJob(runId, projectId, `${projectId}::part`, "script", 1),
      makeJob(runId, projectId, `${projectId}::part`, "scene", 2),
      makeJob(runId, projectId, `${projectId}::part`, "image", 3),
      makeJob(runId, projectId, `${projectId}::part`, "voice", 4),
      makeJob(runId, projectId, `${projectId}::part`, "timeline", 5),
      makeJob(runId, projectId, `${projectId}::part`, "render", 6),
      makeJob(runId, projectId, `${projectId}::part`, "qa", 7),
    ];
    for (const j of stageJobs) {
      runs.addJob(j);
      await db.generationJobs().then((c) => c.save(j as any));
    }
    console.log("[pipeline] created jobs", stageJobs.map((j) => j.type));
    state = runs.get(runId)!;
  }
  console.log("[pipeline] ensureRun done", state.run.status);
  return state.run;
}

async function runPipeline(runId: string, folder: string, part: number): Promise<void> {
  console.log("[pipeline] runPipeline start", { runId, folder, part });
  try {
    const cfg = readConfig();
    console.log("[pipeline] config loaded", { activeTextProvider: cfg.activeTextProvider });
    const project = loadProject(folder);
    console.log("[pipeline] project loaded", { title: project?.title, folder: project?.folder });
    if (!project) {
      console.log("[pipeline] project not found, aborting");
      return;
    }

    const projectId = `${folder}::${part}`;
    const run = await ensureRun(runId, projectId, folder);
    runs.updateRun(runId, { status: "running", updatedAt: new Date().toISOString() });
    await db.generationRuns().then((c) => c.save({ ...run, status: "running", updatedAt: new Date().toISOString() } as any));

    const state = runs.get(runId);
    if (!state) return;
    const stages = run.stages ?? ["story", "script", "scene", "image", "voice", "timeline", "render", "qa"];
    const totalStages = stages.length;
    const projectDir = assetDir(project.folder);
    for (let stageIndex = 0; stageIndex < stages.length; stageIndex++) {
      const stage = stages[stageIndex];
      if (run.status === "cancelling" || run.status === "cancelled") break;
      const job = makeJob(runId, projectId, `${projectId}::part`, stage as GenerationJob["type"], stageIndex);
      runs.addJob(job);
      await db.generationJobs().then((c) => c.save(job as any));
      await db.generationEvents().then((c) => c.save({ _id: crypto.randomUUID(), runId, type: "started", createdAt: new Date().toISOString(), detail: { stage } } as any));
      runs.updateJob(job._id, { status: "running", updatedAt: new Date().toISOString() });
      runs.updateRun(runId, { status: "running", progress: Math.round(((stageIndex) / totalStages) * 100), updatedAt: new Date().toISOString() });
      await db.generationRuns().then((c) => c.save({ ...run, status: "running", progress: Math.round(((stageIndex) / totalStages) * 100), updatedAt: new Date().toISOString() } as any));
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
          const out = path.join(projectDir, "segments", `part-${part}.mp4`);
          const args = ["-y", "-f", "lavfi", "-i", "color=c=black:s=1280x720:d=1", "-c:v", "libx264", "-pix_fmt", "yuv420p", out];
          await exec(FFMPEG, args, { maxBuffer: 1024 * 1024 * 1024 });
          jobs.logMsg(project.folder, `[${runId}] ${stage}: rendered ${out}`);
        } else {
          await new Promise((r) => setTimeout(r, 300));
        }
        runs.updateJob(job._id, { status: "completed", updatedAt: new Date().toISOString() });
        await db.generationJobs().then((c) => c.save({ ...job, status: "completed", updatedAt: new Date().toISOString() } as any));
        await db.generationEvents().then((c) => c.save({ _id: crypto.randomUUID(), runId, type: "completed", createdAt: new Date().toISOString() } as any));
      } catch (e: unknown) {
        runs.updateJob(job._id, { status: "failed", error: (e as any)?.message ?? String(e), updatedAt: new Date().toISOString() });
        await db.generationJobs().then((c) => c.save({ ...job, status: "failed", error: (e as any)?.message ?? String(e), updatedAt: new Date().toISOString() } as any));
        await db.generationEvents().then((c) => c.save({ _id: crypto.randomUUID(), runId, type: "failed", createdAt: new Date().toISOString() } as any));
        jobs.logMsg(project.folder, `[${runId}] ${stage}: failed ${(e as any)?.message ?? e}`);
        if (stage === "story" || stage === "script") break;
      }
    }
    runs.updateRun(runId, { status: "completed", updatedAt: new Date().toISOString() });
    await db.generationRuns().then((c) => c.save({ ...run, status: "completed", updatedAt: new Date().toISOString() } as any));
    console.log("[pipeline] runPipeline done", runId);
  } catch (e: unknown) {
    console.error("[pipeline] fatal", e);
    jobs.logMsg(folder, `[${runId}] fatal: ${(e as any)?.message ?? e}`);
  }
}

export async function startRun(opts: { projectId: string; folder: string; part: number; budgetCents?: number; warningCents?: number }): Promise<string> {
  const runId = crypto.randomUUID();
  await runPipeline(runId, opts.folder, opts.part);
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
