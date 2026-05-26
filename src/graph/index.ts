import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import { AgentState } from "../core/state.js";
import type { State } from "../core/state.js";
import { generatePost } from "./nodes/generatePost.js";
import { validatePost } from "./nodes/validatePost.js";
import { publishPost } from "./nodes/publishPost.js";

const routeValidation = (state: State) => {
  if (state.error) return END;
  if (state.postContent && state.postContent.length > 0 && state.postContent.length <= 3000) {
    return "publish";
  }
  return "retry";
};

const builder = new StateGraph(AgentState)
  .addNode("generatePost", generatePost)
  .addNode("validatePost", validatePost)
  .addNode("publishPost", publishPost)
  .addEdge(START, "generatePost")
  .addEdge("generatePost", "validatePost")
  .addConditionalEdges("validatePost", routeValidation, {
    publish: "publishPost",
    retry: "generatePost",
    [END]: END,
  })
  .addEdge("publishPost", END);

export const agent = builder.compile({ 
  checkpointer: new MemorySaver(), 
  interruptBefore: ["publishPost"] 
});
