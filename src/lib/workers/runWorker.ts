import { EventEmitter } from "node:events";
import path from "node:path";
import fs from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { jobs } from "../jobManager.ts";
import { runs } from "../runs/runStore.ts";
import { loadProject, saveProject, type Project, type Section } from "../projects.ts";
import { readConfig } from "../config.ts";
import { discoverModels, getCachedOrStatic } from "../models/discovery.ts";
import { checkBudgetBeforeSchedule, approveRun, rejectRun, applyRetry, ensureApproved } from "../runs/approval.ts";
import { putAsset, assetDir } from "../storage/assetStore.ts";
import type { GenerationRun, GenerationJob, GenerationEvent } from "../domain/types.ts";

const exec = promisify(execFile);
const FFMPEG = "ffmpeg";

export class Worker {
  private queue: GenerationJob[] = [];
  private active = false;
  private concurrency = 2;

  enqueue(jobs: GenerationJob[]) {
    this.queue.push(...jobs);
  }

  async start() {
    if (this.active) return;
    this.active = true;
    while (this.active) {
      const next = this.queue.find((j) => j.status === "pending");
      if (!next) break;
      const run = this.getRun(next.runId);
      if (!run) break;
      if (run.status === "paused") { await new Promise((r) => setTimeout(r, 500)); continue; }
      if (run.status === "cancelling") { this.cancelRun(run._id); continue; }
      const activeCount = this.queue.filter((j) => j.status === "running").length;
      if (activeCount >= this.concurrency) { await new Promise((r) => setTimeout(r, 500)); continue; }
      await this.execute(next);
    }
    this.active = false;
  }

  private async execute(job: GenerationJob) {
    const run = this.getRun(job.runId);
    if (!run) return;
    if (!checkBudgetBeforeSchedule(run, job)) return;
    if (!ensureApproved(run, job._id)) {
      this.setJob(job._id, { status: "paused" });
      return;
    }
    this.setJob(job._id, { status: "running", attempt: job.attempt + 1 });
    this.addEvent(job.runId, { _id: crypto.randomUUID(), runId: job.runId, jobId: job._id, type: "started", detail: { type: job.type }, createdAt: new Date().toISOString() });
    try {
      if (job.type === "story" || job.type === "script" || job.type === "scene") {
        await this.generateTextJob(job);
      } else if (job.type === "image") {
        await this.generateImageJob(job);
      } else if (job.type === "voice") {
        await this.generateVoiceJob(job);
      } else if (job.type === "timeline") {
        await this.buildTimelineJob(job);
      } else if (job.type === "render") {
        await this.renderJob(job);
      } else if (job.type === "qa") {
        await this.qaJob(job);
      } else {
        await new Promise((r) => setTimeout(r, 100));
      }
      this.setJob(job._id, { status: "completed", outputAssetId: job.outputAssetId });
      this.addEvent(job.runId, { _id: crypto.randomUUID(), runId: job.runId, jobId: job._id, type: "completed", createdAt: new Date().toISOString() });
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      if (msg === "cancelled") {
        this.setJob(job._id, { status: "cancelled", error: msg });
        this.addEvent(job.runId, { _id: crypto.randomUUID(), runId: job.runId, jobId: job._id, type: "cancelled", createdAt: new Date().toISOString() });
      } else {
        this.setJob(job._id, { status: "failed", error: msg });
        this.addEvent(job.runId, { _id: crypto.randomUUID(), runId: job.runId, jobId: job._id, type: "failed", detail: { error: msg }, createdAt: new Date().toISOString() });
      }
    }
  }

  cancelRun(runId: string) {
    for (const j of this.queue) {
      if (j.runId === runId && j.status === "pending") this.setJob(j._id, { status: "cancelled" });
    }
  }

  private async generateTextJob(job: GenerationJob) {
    const input = job as any;
    const text = input.prompt ?? "";
    // placeholder text generation handled by existing provider modules; reuse config read later.
    this.setJob(job._id, { outputAssetId: undefined });
  }

  private async generateImageJob(job: GenerationJob) {
    // placeholder; actual generation delegated to provider layer in pipeline.
    this.setJob(job._id, { outputAssetId: undefined });
  }

  private async generateVoiceJob(job: GenerationJob) {
    this.setJob(job._id, { outputAssetId: undefined });
  }

  private async buildTimelineJob(job: GenerationJob) {
    this.setJob(job._id, { outputAssetId: undefined });
  }

  private async renderJob(job: GenerationJob) {
    this.setJob(job._id, { outputAssetId: undefined });
  }

  private async qaJob(job: GenerationJob) {
    this.setJob(job._id, { outputAssetId: undefined });
  }

  private getRun(runId: string) {
    return (runs as any).get(runId)?.run as GenerationRun | undefined;
  }

  private setJob(jobId: string, patch: Partial<GenerationJob>) {
    (runs as any).updateJob(jobId, patch);
  }

  private addEvent(runId: string, ev: GenerationEvent) {
    (runs as any).addEvent(ev);
  }
}

export const worker = new Worker();
