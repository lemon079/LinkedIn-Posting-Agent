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

describe("Frontend Dashboard UI", () => {
  const mockDefaultState = {
    topics: ["Tech Trends", "TypeScript tips"],
    selectedTopic: "",
    customTopic: "",
    context: "",
    draftText: null,
    postUrl: null,
    isGenerating: false,
    isPublishing: false,
    error: null,
    activeTab: "preview",
    provider: "gemini",
    apiKey: "",
    modelName: "gemini-2.5-flash",
    ollamaBaseUrl: "http://localhost:11434",
    tavilyKey: "",
    liToken: "",
    liUrn: "",
    isSettingsOpen: false,
    user: null,
    setSelectedTopic: jest.fn(),
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
    setTavilyKey: jest.fn(),
    setIsSettingsOpen: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders the default empty page state correctly", () => {
    (useAgent as jest.Mock).mockReturnValue(mockDefaultState);

    render(<Home />);

    // Verify Title
    expect(screen.getByText("LinkedIn")).toBeInTheDocument();
    expect(screen.getByText("Posting Agent")).toBeInTheDocument();

    // Verify empty placeholder text
    expect(
      screen.getByText("Configure parameters and generate a post draft.")
    ).toBeInTheDocument();

    // Verify Settings button is enabled
    const settingsButton = screen.getByRole("button", {
      name: /Configure Credentials/i,
    });
    expect(settingsButton).toBeInTheDocument();
    expect(settingsButton).not.toBeDisabled();
  });

  test("displays loading view and disables settings button during generation", () => {
    (useAgent as jest.Mock).mockReturnValue({
      ...mockDefaultState,
      isGenerating: true,
    });

    render(<Home />);

    // Verify loading status message
    expect(
      screen.getByText("Ghostwriter is researching & drafting post...")
    ).toBeInTheDocument();

    // Verify the Settings button is disabled
    const settingsButton = screen.getByRole("button", {
      name: /Configure Credentials/i,
    });
    expect(settingsButton).toBeDisabled();
  });

  test("displays error banner when API fails", () => {
    (useAgent as jest.Mock).mockReturnValue({
      ...mockDefaultState,
      error: "Invalid API Key. Please check your credentials.",
    });

    render(<Home />);

    // Verify the error text is visible
    expect(
      screen.getByText(/⚠️ Invalid API Key. Please check your credentials./i)
    ).toBeInTheDocument();
  });

  test("displays generated draft content and action buttons", () => {
    (useAgent as jest.Mock).mockReturnValue({
      ...mockDefaultState,
      draftText: "My awesome tech post draft!",
      activeTab: "edit",
    });

    render(<Home />);

    // Verify draft tab buttons are shown
    expect(screen.getByRole("button", { name: /Interactive Editor/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /LinkedIn Mockup/i })).toBeInTheDocument();

    // Verify draft text is rendered in the editor text area
    const textarea = screen.getByDisplayValue("My awesome tech post draft!");
    expect(textarea).toBeInTheDocument();

    // Verify publish button is visible
    expect(
      screen.getByRole("button", { name: /Approve & Publish Post/i })
    ).toBeInTheDocument();
  });
});
