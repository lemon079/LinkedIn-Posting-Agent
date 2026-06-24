import { Annotation } from "@langchain/langgraph";

export const AgentState = Annotation.Root({
  topic: Annotation<string>(),
  context: Annotation<string>({
    reducer: (x, y) => y,
    default: () => "",
  }),
  postContent: Annotation<string | null>({
    reducer: (x, y) => y,
    default: () => null,
  }),
  postUrl: Annotation<string | null>({
    reducer: (x, y) => y,
    default: () => null,
  }),
  retries: Annotation<number>({
    reducer: (x, y) => y,
    default: () => 0,
  }),
  error: Annotation<string | null>({
    reducer: (x, y) => y,
    default: () => null,
  }),

  linkedinToken: Annotation<string | null>({
    reducer: (x, y) => y,
    default: () => null,
  }),
  linkedinUrn: Annotation<string | null>({
    reducer: (x, y) => y,
    default: () => null,
  }),
  llmProvider: Annotation<string | null>({
    reducer: (x, y) => y,
    default: () => null,
  }),
  llmApiKey: Annotation<string | null>({
    reducer: (x, y) => y,
    default: () => null,
  }),
  llmModel: Annotation<string | null>({
    reducer: (x, y) => y,
    default: () => null,
  }),
  ollamaBaseUrl: Annotation<string | null>({
    reducer: (x, y) => y,
    default: () => null,
  }),
  tavilyApiKey: Annotation<string | null>({
    reducer: (x, y) => y,
    default: () => null,
  }),
});

export type State = typeof AgentState.State;
