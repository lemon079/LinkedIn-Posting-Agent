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

// Mock Supabase to prevent real client initialization
jest.mock("../lib/supabase", () => ({
  supabase: null,
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

describe("Frontend Dashboard UI", () => {
  const mockDefaultState = {
    customTopic: "",
    context: "",
    draftText: null,
    streamingText: null,
    postUrl: null,
    isGenerating: false,
    isPublishing: false,
    error: null,
    activeTab: "preview",
    provider: "gemini",
    apiKey: "",
    modelName: "gemini-2.5-flash",
    ollamaBaseUrl: "http://localhost:11434",
    liToken: "",
    liUrn: "",
    isSettingsOpen: false,
    user: null,
    isTauri: false,
    reasoningSteps: [],
    selectedFiles: [],
    isUploading: false,
    setCustomTopic: jest.fn(),
    setContext: jest.fn(),
    setDraftText: jest.fn(),
    setActiveTab: jest.fn(),
    handleGenerate: jest.fn(),
    handlePublish: jest.fn(),
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
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders the default empty page state correctly", () => {
    (useAgent as jest.Mock).mockReturnValue(mockDefaultState);

    render(<Home />);

    // Verify Title
    expect(screen.getByText("Praxis")).toBeInTheDocument();

    // Verify empty placeholder text
    expect(
      screen.getByText("Configure parameters and generate a post draft.")
    ).toBeInTheDocument();

    // Verify Settings button is enabled
    const settingsButton = screen.getByRole("button", {
    expect(screen.getByText(/Praxis/i)).toBeInTheDocument();
    expect(screen.getByText(/Technical Topic/i)).toBeInTheDocument();
    expect(screen.getByText(/Draft Post/i)).toBeInTheDocument();
  });

  test("renders draft text and publish button when draft exists", () => {
    (useAgent as jest.Mock).mockReturnValue({
      ...mockDefaultState,
      draftText: "My awesome tech post draft!",
      activeTab: "edit",
      threadId: "test-thread-123",
    });

    render(<Home />);

    const textarea = screen.getByDisplayValue("My awesome tech post draft!");
    expect(textarea).toBeInTheDocument();

    // Verify publish button is visible
    expect(
      screen.getByRole("button", { name: /Publish/i })
    ).toBeInTheDocument();
  });

  test("renders Ollama provider option in settings", () => {
    (useAgent as jest.Mock).mockReturnValue({
      ...mockDefaultState,
      isSettingsOpen: true,
    });

    render(<Home />);

    const ollamaOptions = screen.getAllByRole("option", { name: /Ollama/i });
    expect(ollamaOptions.length).toBeGreaterThanOrEqual(1);

    const googleOptions = screen.getAllByRole("option", { name: /Google/i });
    expect(googleOptions.length).toBeGreaterThanOrEqual(1);
  });
});
