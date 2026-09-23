/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Home from "../app/page";
import { useAgent } from "../hooks/useAgent";
import { AssistantComposer } from "../components/assistant-ui/composer";
import "@testing-library/jest-dom";

// Mock the hook that manages the agent state
jest.mock("../hooks/useAgent");

// Mock Assistant UI runtime and primitives for Jest CommonJS environment
jest.mock("@assistant-ui/react", () => ({
  AssistantRuntimeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useLocalRuntime: jest.fn().mockReturnValue({}),
  AuiConfig: jest.fn().mockImplementation((x) => x),
  Tools: jest.fn().mockImplementation((x) => x),
  defineToolkit: jest.fn().mockImplementation((x) => x),
  externalTool: jest.fn().mockImplementation(() => () => {}),
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
    initDraftVersions: jest.fn(),
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

  test("renders rate limit error with Retry button when error occurs", () => {
    (useAgent as jest.Mock).mockReturnValue({
      ...mockDefaultState,
      error: "429 RESOURCE_EXHAUSTED: Google Gemini rate limit reached",
    });

    render(<Home />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Google Gemini Usage Quota Exceeded")).toBeInTheDocument();
    expect(screen.getByText(/Your Google Gemini API account has reached its billing or usage quota limit/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Retry/i })
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

  test("SettingsDialog displays loader on Apply Settings and closes modal only after settings are saved", async () => {
    let resolveSave: () => void = () => {};
    const handleSaveSettings = jest.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        })
    );
    const setIsSettingsOpen = jest.fn();

    (useAgent as jest.Mock).mockReturnValue({
      ...mockDefaultState,
      isAuthenticated: true,
      isSettingsOpen: true,
      setIsSettingsOpen,
      handleSaveSettings,
    });

    render(<Home />);

    const applyButton = screen.getByRole("button", { name: /Apply Settings/i });
    expect(applyButton).toBeInTheDocument();

    // Click Apply Settings
    fireEvent.click(applyButton);

    // Button should now be disabled and show loading state
    expect(handleSaveSettings).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /Saving\.\.\./i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Saving\.\.\./i })).toBeDisabled();

    // Modal has NOT closed yet
    expect(setIsSettingsOpen).not.toHaveBeenCalled();

    // Resolve the async save
    resolveSave();

    // After save completes, modal is closed
    await waitFor(() => {
      expect(setIsSettingsOpen).toHaveBeenCalledWith(false);
    });
  });

  test("SettingsDialog keeps modal open and does not close if saving fails", async () => {
    const handleSaveSettings = jest.fn().mockRejectedValue(new Error("Database connection failed"));
    const setIsSettingsOpen = jest.fn();

    (useAgent as jest.Mock).mockReturnValue({
      ...mockDefaultState,
      isAuthenticated: true,
      isSettingsOpen: true,
      setIsSettingsOpen,
      handleSaveSettings,
    });

    render(<Home />);

    const applyButton = screen.getByRole("button", { name: /Apply Settings/i });
    fireEvent.click(applyButton);

    await waitFor(() => {
      // Button resets after error
      expect(screen.getByRole("button", { name: /Apply Settings/i })).toBeInTheDocument();
    });

    // Modal should NOT have been closed
    expect(setIsSettingsOpen).not.toHaveBeenCalled();
  });

  test("resets AI draft workspace and displays success banner upon successful post publishing", () => {
    const handleNewPost = jest.fn();

    (useAgent as jest.Mock).mockReturnValue({
      ...mockDefaultState,
      isAuthenticated: true,
      postUrl: "https://www.linkedin.com/feed/update/urn:li:activity:7123456789",
      draftText: null, // Reset after successful publishing
      handleNewPost,
    });

    render(<Home />);

    // Success banner is displayed with the live post link and New Post button
    expect(
      screen.getByText("Post successfully published to LinkedIn!")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Your post is now live and public on your feed.")
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View Post/i })).toHaveAttribute(
      "href",
      "https://www.linkedin.com/feed/update/urn:li:activity:7123456789"
    );

    // AI draft workspace is reset to the empty prompt state
    expect(
      screen.getByText("Configure parameters and generate a post draft.")
    ).toBeInTheDocument();

    // Clicking New Post calls handleNewPost
    const newPostButton = screen.getByRole("button", { name: /New Post/i });
    fireEvent.click(newPostButton);
    expect(handleNewPost).toHaveBeenCalledTimes(1);
  });
});

describe("AssistantComposer Archetype-Aware Context Fields", () => {
  const baseComposerProps = {
    customTopic: "Software Engineering",
    context: "",
    domain: "engineering",
    tone: "conversational",
    isGenerating: false,
    setCustomTopic: jest.fn(),
    setContext: jest.fn(),
    setDomain: jest.fn(),
    setArchetype: jest.fn(),
    setTone: jest.fn(),
    onGenerate: jest.fn(),
  };

  test("renders hiring-specific labels and placeholders when archetype is 'hiring'", () => {
    const setContext = jest.fn();
    render(
      <AssistantComposer
        {...baseComposerProps}
        archetype="hiring"
        setContext={setContext}
      />
    );

    // Expand the additional context accordion
    const toggleButton = screen.getByRole("button", { name: /Additional Context & Story Details/i });
    fireEvent.click(toggleButton);

    expect(screen.getByText("Role & what they'll actually work on")).toBeInTheDocument();
    expect(screen.getByText("What makes this role/team different")).toBeInTheDocument();

    const field1 = screen.getByPlaceholderText("e.g. real day-to-day responsibilities, not a generic job description");
    const field2 = screen.getByPlaceholderText("culture, stage, problem space — NOT compensation, to avoid inviting fabricated salary/perks");

    expect(field1).toBeInTheDocument();
    expect(field2).toBeInTheDocument();

    // Type into fields and verify auto-sync formatting
    fireEvent.change(field1, { target: { value: "Build distributed pipelines" } });
    fireEvent.change(field2, { target: { value: "Early stage high autonomy" } });

    expect(setContext).toHaveBeenLastCalledWith(
      "Role:\nBuild distributed pipelines\n\nWhat makes it different:\nEarly stage high autonomy"
    );
  });

  test("defaults to Teardown-style labels and placeholders when archetype is 'auto'", () => {
    const setContext = jest.fn();
    render(
      <AssistantComposer
        {...baseComposerProps}
        archetype="auto"
        setContext={setContext}
      />
    );

    // Expand accordion
    const toggleButton = screen.getByRole("button", { name: /Additional Context & Story Details/i });
    fireEvent.click(toggleButton);

    expect(screen.getByText("What happened?")).toBeInTheDocument();
    expect(screen.getByText("Takeaway")).toBeInTheDocument();

    const field1 = screen.getByPlaceholderText("What happened? (e.g. Migrated databases with zero downtime, lost a major lead...)");
    const field2 = screen.getByPlaceholderText("What did you take away or want your audience to learn?");

    expect(field1).toBeInTheDocument();
    expect(field2).toBeInTheDocument();

    // Type into fields and verify auto-sync formatting
    fireEvent.change(field1, { target: { value: "Database outage occurred" } });
    fireEvent.change(field2, { target: { value: "Always set query timeouts" } });

    expect(setContext).toHaveBeenLastCalledWith(
      "What happened?\nDatabase outage occurred\n\nTakeaway:\nAlways set query timeouts"
    );
  });
});



