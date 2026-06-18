import cron from "node-cron";
import { agent } from "./graph/index.js";
import { config } from "./config/env.js";
import { getTopic, askQuestion } from "./core/utils.js";

export const runAgent = async (isScheduled: boolean): Promise<void> => {
  const topic = getTopic();

  console.log(`Starting agent run for topic/genre: ${topic}`);
  try {
    const threadConfig = { configurable: { thread_id: Date.now().toString() } };
    const initialState = {
      topic,
      context: config.CONTEXT,
      postContent: null,
      postUrl: null,
      retries: 0,
      error: null,
    };

    // Run the graph until the interruptBefore breakpoint
    await agent.invoke(initialState, threadConfig);

    const state = await agent.getState(threadConfig);
    const nextNode = state.next?.[0];
    const generatedDraft = state.values.postContent;

    if (nextNode === "publishPost") {
      console.log("\n=================================");
      console.log("📝 GENERATED DRAFT POST:");
      console.log("=================================\n");
      console.log(generatedDraft);
      console.log("\n=================================");

      if (isScheduled) {
        console.log("Running in scheduled mode. Automatically approving post.");
        const finalResult = await agent.invoke(null, threadConfig);
        if (finalResult.error) console.error(`Agent failed: ${finalResult.error}`);
        else console.log(`Agent succeeded. Post URL: ${finalResult.postUrl}`);
      } else {
        const answer = await askQuestion("Approve this post for publishing? (y/n): ");
        if (answer.toLowerCase().startsWith('y')) {
          console.log("Publishing post...");
          const finalResult = await agent.invoke(null, threadConfig);
          if (finalResult.error) console.error(`Agent failed: ${finalResult.error}`);
          else console.log(`Agent succeeded. Post URL: ${finalResult.postUrl}`);
        } else {
          console.log("Post rejected. Exiting.");
        }
      }
    } else if (state.values.error) {
      console.error(`Agent failed during drafting: ${state.values.error}`);
    } else {
      console.error(`Agent stopped unexpectedly. Next node: ${nextNode}`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error(`Agent execution error: ${msg}`);
  }
};

const args = process.argv.slice(2);
if (args.includes("--schedule")) {
  console.log("Starting node-cron scheduler (runs daily at 9:00 AM)...");
  cron.schedule("0 9 * * *", () => { runAgent(true).catch(console.error); });
} else {
  console.log("Running agent interactively...");
  runAgent(false).catch(console.error);
}
