import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import { AgentState } from "../core/state";
import type { State } from "../core/state";
import { generateDraft, reviewAndRefine } from "./nodes/generatePost";
import { validatePost } from "./nodes/validatePost";
import { publishPost } from "./nodes/publishPost";
import { runGuardrails } from "./nodes/guardrail";

const routeValidation = (state: State) => {
  if (state.error) return END;
  if (state.postContent && state.postContent.length > 0 && state.postContent.length <= 3000) {
    return "publish";
  }
  return "retry";
};

const routeGuardrails = (state: State) => {
  if (state.error) return END;
  return "validatePost";
};

const builder = new StateGraph(AgentState)
  .addNode("generateDraft", generateDraft)
  .addNode("reviewAndRefine", reviewAndRefine)
  .addNode("runGuardrails", runGuardrails)
  .addNode("validatePost", validatePost)
  .addNode("publishPost", publishPost)
  
  .addEdge(START, "generateDraft")
  .addEdge("generateDraft", "reviewAndRefine")
  .addEdge("reviewAndRefine", "runGuardrails")
  .addConditionalEdges("runGuardrails", routeGuardrails, {
    validatePost: "validatePost",
    [END]: END,
  })
  .addConditionalEdges("validatePost", routeValidation, {
    publish: "publishPost",
    retry: "reviewAndRefine",
    [END]: END,
  })
  .addConditionalEdges("publishPost", (state: State) => {
    if (state.error) return END;
    return END;
  });

export const agent = builder.compile({ 
  checkpointer: new MemorySaver(), 
  interruptBefore: ["publishPost"] 
});

