import fs from "node:fs";
import path from "node:path";
import type { GenerationRun, GenerationJob, GenerationEvent } from "../domain/types.ts";

export type RunState = {
  run: GenerationRun;
  jobs: GenerationJob[];
  events: GenerationEvent[];
};

type MemoryRun = {
  run: GenerationRun;
  jobs: Map<string, GenerationJob>;
  events: GenerationEvent[];
  controller?: AbortController;
};

class RunStore {
  private runs = new Map<string, MemoryRun>();

  create(run: GenerationRun) {
    this.runs.set(run._id, { run, jobs: new Map(), events: [] });
  }

  get(runId: string): RunState | undefined {
    const r = this.runs.get(runId);
    if (!r) return undefined;
    return { run: r.run, jobs: Array.from(r.jobs.values()), events: r.events };
  }

  updateRun(runId: string, patch: Partial<GenerationRun>) {
    const r = this.runs.get(runId);
    if (!r) return;
    r.run = { ...r.run, ...patch };
  }

  addJob(job: GenerationJob) {
    const r = this.runs.get(job.runId);
    if (!r) return;
    r.jobs.set(job._id, job);
  }

  updateJob(jobId: string, patch: Partial<GenerationJob>) {
    for (const r of this.runs.values()) {
      const j = r.jobs.get(jobId);
      if (!j) continue;
      r.jobs.set(jobId, { ...j, ...patch });
      return;
    }
  }

  addEvent(ev: GenerationEvent) {
    const r = this.runs.get(ev.runId);
    if (!r) return;
    r.events.push(ev);
    if (r.events.length > 1000) r.events.shift();
  }

  listJobs(runId: string): GenerationJob[] {
    const r = this.runs.get(runId);
    return r ? Array.from(r.jobs.values()) : [];
  }

  listEvents(runId: string): GenerationEvent[] {
    const r = this.runs.get(runId);
    return r ? r.events : [];
  }

  controller(runId: string): AbortController | undefined {
    return this.runs.get(runId)?.controller;
  }

  setController(runId: string, c: AbortController) {
    const r = this.runs.get(runId);
    if (r) r.controller = c;
  }
}

export const runs = new RunStore();
