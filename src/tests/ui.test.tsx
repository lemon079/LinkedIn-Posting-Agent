/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import Home from "../app/page";
import { useAgent } from "../hooks/useAgent";
import "@testing-library/jest-dom";

// Mock the hook that manages the agent state
jest.mock("../hooks/useAgent");

// Mock Assistant UI runtime and primitives for Jest CommonJS environment
jest.mock("@assistant-ui/react", () => ({
  AssistantRuntimeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useLocalRuntime: jest.fn().mockReturnValue({}),
}));

jest.mock("@assistant-ui/react-markdown", () => ({
  MarkdownTextPrimitive: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@assistant-ui/react-markdown/styles/dot.css", () => ({}));
jest.mock("remark-gfm", () => () => { });

jest.mock("../hooks/useAgentRuntime", () => ({
  useAgentRuntime: jest.fn().mockReturnValue({}),
}));

// Mock Supabase to prevent real client initialization
jest.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
    },
  },
}));

// Mock useMedia to prevent window.matchMedia errors in jsdom
jest.mock("use-media", () => ({
  useMedia: () => true, // Default wide layout (min-width: 768px)
}));

// Mock react-markdown to prevent ESM import parser errors in CommonJS Jest
jest.mock("react-markdown", () => {
  return function MockReactMarkdown({ children }: { children: string }) {
    return <>{children}</>;
  };
});

const OriginalRequest = globalThis.Request;
const OriginalResponse = globalThis.Response;
const OriginalHeaders = globalThis.Headers;

describe("Frontend Dashboard UI", () => {
  afterAll(() => {
    if (OriginalRequest) globalThis.Request = OriginalRequest;
    if (OriginalResponse) globalThis.Response = OriginalResponse;
    if (OriginalHeaders) globalThis.Headers = OriginalHeaders;
  });
  const mockDefaultState = {
    customTopic: "",
    context: "",
    domain: "auto",
    draftText: null,
    streamingText: null,
    threadId: null,
    postUrl: null,
    isGenerating: false,
    isPublishing: false,
    error: null,
    activeTab: "preview",
    provider: "gemini",
    apiKey: "",
    modelName: "gemini-3.7-flash",
    ollamaBaseUrl: "http://localhost:11434",
    liToken: "",
    liUrn: "",
    isSettingsOpen: false,
    user: null,
    reasoningSteps: [],
    selectedFiles: [],
    isUploading: false,
    setCustomTopic: jest.fn(),
    setContext: jest.fn(),
    setDomain: jest.fn(),
    setDraftText: jest.fn(),
    setStreamingText: jest.fn(),
    setActiveTab: jest.fn(),
    handleGenerate: jest.fn(),
    handlePublish: jest.fn(),
    handleNewPost: jest.fn(),
    setProvider: jest.fn(),
    setApiKey: jest.fn(),
    setModelName: jest.fn(),
    setOllamaBaseUrl: jest.fn(),
    setLiToken: jest.fn(),
    setLiUrn: jest.fn(),
    setIsSettingsOpen: jest.fn(),
    setReasoningSteps: jest.fn(),
    setSelectedFiles: jest.fn(),
    handleUploadFile: jest.fn(),
    handleClearDraft: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders the default empty page state correctly", () => {
    (useAgent as jest.Mock).mockReturnValue(mockDefaultState);

    render(<Home />);

    expect(screen.getByText("Praxis")).toBeInTheDocument();
    expect(
      screen.getByText("Configure parameters and generate a post draft.")
    ).toBeInTheDocument();
  });

  test("renders draft text and publish button when draft exists", () => {
    (useAgent as jest.Mock).mockReturnValue({
      ...mockDefaultState,
      draftText: "My awesome tech post draft!",
      activeTab: "edit",
      threadId: "test-thread-123",
    });

    render(<Home />);

    const draftElement = screen.getByText("My awesome tech post draft!");
    expect(draftElement).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /Publish/i })
    ).toBeInTheDocument();
  });
});
