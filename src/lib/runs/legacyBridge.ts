import { jobs } from "../jobManager.ts";

export function legacyJobToRunJob(projectId: string) {
  const j = jobs.get(projectId);
  if (!j) return null;
  return {
    projectId,
    stage: j.stage,
    progress: j.progress,
    detail: j.detail,
    log: j.log,
    running: j.running,
    cancelRequested: j.cancelRequested,
    error: j.error,
  };
}
