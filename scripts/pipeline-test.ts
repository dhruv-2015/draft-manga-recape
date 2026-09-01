import { startRun } from "../src/lib/runs/runPipeline.ts";

async function main() {
  try {
    const runId = await startRun({
      projectId: "C:/Users/chada/Videos/Manga Recap Studio/_pipeline-test::1",
      folder: "C:/Users/chada/Videos/Manga Recap Studio/_pipeline-test",
      part: 1,
    });
    console.log("started run", runId);
  } catch (e) {
    console.error("fatal", e);
    process.exit(1);
  }
}

main();
