import { Annotation } from "@langchain/langgraph";

export const AgentState = Annotation.Root({
  topic: Annotation<string>(),
  domain: Annotation<string | null>({
    reducer: (x, y) => y,
    default: () => null,
  }),
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
  reasoningSteps: Annotation<Array<{ title: string; output: string }>>({
    reducer: (x, y) => (x || []).concat(y || []),
    default: () => [],
  }),
  planOutput: Annotation<string>({
    reducer: (x, y) => y,
    default: () => "",
  }),
  researchOutput: Annotation<string>({
    reducer: (x, y) => y,
    default: () => "",
  }),
  draftOutput: Annotation<string>({
    reducer: (x, y) => y,
    default: () => "",
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
  mediaFiles: Annotation<Array<{ name: string; type: string; storagePath?: string; readUrl?: string; base64?: string; }> | null>({
    reducer: (x, y) => y,
    default: () => null,
  }),
});

export type State = typeof AgentState.State;
