/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock Assistant UI and markdown dependencies for Jest CommonJS
jest.mock("@assistant-ui/react", () => ({
  AssistantRuntimeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useLocalRuntime: jest.fn().mockReturnValue({}),
}));

jest.mock("@assistant-ui/react-markdown", () => ({
  MarkdownTextPrimitive: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@assistant-ui/react-markdown/styles/dot.css", () => ({}));
jest.mock("remark-gfm", () => () => {});
jest.mock("react-markdown", () => {
  return function MockReactMarkdown({ children }: { children: string }) {
    return <>{children}</>;
  };
});

import { ErrorState } from "@/components/assistant-ui/error-state";
import { AssistantThread } from "@/components/assistant-ui/thread";

describe("assistant-ui ErrorState Component", () => {
  test("renders role='alert' with title, detail, and Retry button when retrying is false", () => {
    const handleRetry = jest.fn();
    render(
      <ErrorState
        title="Something went wrong"
        detail="Rate limit exceeded. Please try again shortly."
        retrying={false}
        onRetry={handleRetry}
      />
    );

    const alertElement = screen.getByRole("alert");
    expect(alertElement).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Rate limit exceeded. Please try again shortly.")).toBeInTheDocument();

    const retryButton = screen.getByRole("button", { name: /Retry/i });
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  test("renders role='status' with retrying indicator and no retry button when retrying is true", () => {
    const handleRetry = jest.fn();
    render(
      <ErrorState
        title="Something went wrong"
        detail="Connection timed out."
        retrying={true}
        onRetry={handleRetry}
      />
    );

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    const statusElement = screen.getByRole("status");
    expect(statusElement).toBeInTheDocument();
    expect(screen.getByText(/Retrying/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Retry/i })).not.toBeInTheDocument();
  });

  test("supports keyboard accessibility on Retry button", () => {
    const handleRetry = jest.fn();
    render(
      <ErrorState
        title="Generation Failed"
        detail="The model was unavailable."
        retrying={false}
        onRetry={handleRetry}
      />
    );

    const retryButton = screen.getByRole("button", { name: /Retry/i });
    retryButton.focus();
    expect(retryButton).toHaveFocus();

    fireEvent.click(retryButton);
    expect(handleRetry).toHaveBeenCalled();
  });
});

describe("AssistantThread ErrorState Integration", () => {
  const baseProps = {
    draftText: null,
    streamingText: null,
    isGenerating: false,
    isPublishing: false,
    selectedFiles: [],
    setSelectedFiles: jest.fn(),
    isUploading: false,
    onUploadFile: jest.fn(),
    onChange: jest.fn(),
    onPublish: jest.fn(),
    onStreamingComplete: jest.fn(),
  };

  test("renders ErrorState inside thread when error prop is present", () => {
    const handleRetry = jest.fn();
    render(
      <AssistantThread
        {...baseProps}
        error="OpenAI rate limit exceeded. Please check quota."
        onRetry={handleRetry}
      />
    );

    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(screen.getByText("OpenAI Rate Limit Reached")).toBeInTheDocument();
    expect(screen.getByText(/The OpenAI API is currently receiving too many requests/i)).toBeInTheDocument();

    const retryButton = screen.getByRole("button", { name: /Retry/i });
    fireEvent.click(retryButton);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  test("prevents duplicate retry triggers while retrying", () => {
    const handleRetry = jest.fn();
    const { rerender } = render(
      <AssistantThread
        {...baseProps}
        error="Server error occurred"
        onRetry={handleRetry}
      />
    );

    const retryButton = screen.getByRole("button", { name: /Retry/i });
    fireEvent.click(retryButton);
    expect(handleRetry).toHaveBeenCalledTimes(1);

    // Simulate agent starting generation upon retry
    rerender(
      <AssistantThread
        {...baseProps}
        isGenerating={true}
        error={null}
        onRetry={handleRetry}
      />
    );

    // Now in retrying mode
    const errorStateElement = document.querySelector('[data-slot="error-state"][role="status"]');
    expect(errorStateElement).toBeInTheDocument();
    expect(screen.getByText(/Retrying/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Retry/i })).not.toBeInTheDocument();
  });
});
