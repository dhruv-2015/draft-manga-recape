import path from "node:path";
import { EventEmitter } from "node:events";

export type JobStage =
  | "idle" | "title" | "script" | "characters" | "scene-planning"
  | "character-images" | "images" | "audio" | "segments" | "final" | "done" | "error";

export type JobState = {
  projectId: string;
  folder: string;
  part: number;
  stage: JobStage;
  progress: number;
  detail: string;
  log: string[];
  cancelRequested: boolean;
  running: boolean;
  error?: string;
  startedAt: number;
};

class JobManager extends EventEmitter {
  jobs = new Map<string, JobState>();
  controllers = new Map<string, AbortController>();

  start(projectId: string, folder: string, part: number) {
    this.jobs.set(projectId, {
      projectId, folder, part,
      stage: "idle", progress: 0, detail: "queued",
      log: [], cancelRequested: false, running: false, startedAt: Date.now(),
    });
  }

  get(projectId: string): JobState | undefined {
    return this.jobs.get(projectId);
  }

  update(projectId: string, patch: Partial<JobState>) {
    const j = this.jobs.get(projectId);
    if (!j) return;
    Object.assign(j, patch);
    this.emit("update", { ...j });
  }

  logMsg(projectId: string, msg: string) {
    const j = this.jobs.get(projectId);
    if (!j) return;
    const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
    j.log.push(line);
    if (j.log.length > 400) j.log.shift();
    this.emit("update", { ...j });
  }

  requestCancel(projectId: string): boolean {
    const j = this.jobs.get(projectId);
    if (!j || !j.running) return false;
    j.cancelRequested = true;
    this.controllers.get(projectId)?.abort();
    this.logMsg(projectId, "Cancel requested…");
    this.emit("update", { ...j });
    return true;
  }

  controller(projectId: string): AbortController {
    let c = this.controllers.get(projectId);
    if (!c) {
      c = new AbortController();
      this.controllers.set(projectId, c);
    }
    return c;
  }

  cleanup(projectId: string) {
    this.controllers.delete(projectId);
  }
}

export const jobs = new JobManager();
