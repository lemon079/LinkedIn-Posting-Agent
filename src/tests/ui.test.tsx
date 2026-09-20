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
    archetype: "auto",
    tone: "conversational",
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
    isHydrating: false,
    isAuthenticated: true,
    reasoningSteps: [],
    selectedFiles: [],
    isUploading: false,
    setCustomTopic: jest.fn(),
    setContext: jest.fn(),
    setDomain: jest.fn(),
    setArchetype: jest.fn(),
    setTone: jest.fn(),
    setDraftText: jest.fn(),
    setStreamingText: jest.fn(),
    setActiveTab: jest.fn(),
    handleGenerate: jest.fn(),
    handlePublish: jest.fn(),
    handleNewPost: jest.fn(),
    handleDismissError: jest.fn(),
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
    alternativeHooks: [],
    handleApplyHook: jest.fn(),
    draftVersions: [],
    activeVersionIndex: 0,
    handleUndo: jest.fn(),
    handleRedo: jest.fn(),
    handleSelectVersion: jest.fn(),
    addDraftVersion: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders the default empty page state correctly", () => {
    (useAgent as jest.Mock).mockReturnValue(mockDefaultState);

    render(<Home />);

    expect(screen.getAllByText("Praxis")[0]).toBeInTheDocument();
    expect(
      screen.getByText("Configure parameters and generate a post draft.")
    ).toBeInTheDocument();
  });

  test("renders LinkedIn authentication gate overlay when unauthenticated and prevents settings from opening", () => {
    (useAgent as jest.Mock).mockReturnValue({
      ...mockDefaultState,
      isAuthenticated: false,
      isHydrating: false,
      isSettingsOpen: true,
    });

    render(<Home />);

    expect(screen.getByText(/Connect with LinkedIn to Start Creating/i)).toBeInTheDocument();
    expect(screen.getByText(/Sign in with LinkedIn to Unlock/i)).toBeInTheDocument();
    // Header should NOT show Configure Credentials in guest mode
    expect(screen.queryByText("Configure Credentials")).not.toBeInTheDocument();
    // Settings dialog/drawer should NOT be rendered open in guest mode
    expect(screen.queryByText("Account & AI Settings")).not.toBeInTheDocument();
    expect(screen.queryByText("Apply Settings")).not.toBeInTheDocument();
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

  test("renders HookLab and allows previewing alternative hooks", () => {
    const handleApplyHook = jest.fn();
    (useAgent as jest.Mock).mockReturnValue({
      ...mockDefaultState,
      draftText: "Initial hook text\n\nRest of the body text",
      activeTab: "edit",
      threadId: "test-thread-123",
      alternativeHooks: [
        {
          type: "contrarian",
          hook: "Stop writing boilerplate microservices.",
          rationale: "Challenges common practice",
        },
      ],
      handleApplyHook,
    });

    render(<Home />);

    expect(screen.getByText("Hook Lab: Alternative Openings")).toBeInTheDocument();
    expect(screen.getByText("Contrarian Challenge")).toBeInTheDocument();
    expect(screen.getByText(/Stop writing boilerplate microservices\./i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Apply to Draft/i })).toBeInTheDocument();
  });

  test("renders rate limit warning with settings action button when error occurs", () => {
    (useAgent as jest.Mock).mockReturnValue({
      ...mockDefaultState,
      error: "429 RESOURCE_EXHAUSTED: Google Gemini rate limit reached",
    });

    render(<Home />);

    expect(screen.getAllByText(/Google Gemini/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Usage Quota Exceeded/i)[0]).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Change Model \/ Settings/i })
    ).toBeInTheDocument();
  });

  test("renders post archetype and tone selectors in generation controls", () => {
    (useAgent as jest.Mock).mockReturnValue(mockDefaultState);

    render(<Home />);

    expect(screen.getByText("Post Archetype")).toBeInTheDocument();
    expect(screen.getByText("Tone & Voice")).toBeInTheDocument();
  });

  test("renders version history dropdown and undo/redo buttons when multiple versions exist", () => {
    const handleUndo = jest.fn();
    const handleRedo = jest.fn();
    const handleSelectVersion = jest.fn();

    (useAgent as jest.Mock).mockReturnValue({
      ...mockDefaultState,
      draftText: "Draft v2 text",
      activeTab: "edit",
      threadId: "test-thread-123",
      draftVersions: [
        {
          id: "v1-123",
          versionNumber: 1,
          draft: "Initial draft content",
          label: "v1",
          changeNote: "Initial Draft",
          timestamp: 1000,
        },
        {
          id: "v2-456",
          versionNumber: 2,
          draft: "Draft v2 text",
          label: "v2",
          changeNote: "Made punchier",
          timestamp: 2000,
        },
      ],
      activeVersionIndex: 1,
      handleUndo,
      handleRedo,
      handleSelectVersion,
    });

    render(<Home />);

    const selectEl = screen.getByLabelText("Draft version history");
    expect(selectEl).toBeInTheDocument();
    expect(screen.getByText(/v1 · Initial Draft/i)).toBeInTheDocument();
    expect(screen.getByText(/v2 · Made punchier/i)).toBeInTheDocument();

    const undoButton = screen.getByRole("button", { name: "Undo edit" });
    expect(undoButton).toBeInTheDocument();
    expect(undoButton).not.toBeDisabled();
    undoButton.click();
    expect(handleUndo).toHaveBeenCalled();
  });
  });
});


