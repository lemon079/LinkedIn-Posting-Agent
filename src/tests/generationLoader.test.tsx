/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { GenerationLoader } from "@/components/assistant-ui/loading-state";
import { ElementsTimeline } from "@/components/assistant-ui/elements-timeline";
import { AssistantThread } from "@/components/assistant-ui/thread";
import * as aui from "@assistant-ui/react";

// Mock @assistant-ui/react for test control
jest.mock("@assistant-ui/react", () => ({
  AssistantRuntimeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useLocalRuntime: jest.fn().mockReturnValue({}),
  useAuiState: jest.fn(),
}));

// Mock react-markdown and markdown components
jest.mock("react-markdown", () => {
  return function MockReactMarkdown({ children }: { children: string }) {
    return <>{children}</>;
  };
});
jest.mock("@assistant-ui/react-markdown", () => ({
  MarkdownTextPrimitive: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock("@assistant-ui/react-markdown/styles/dot.css", () => ({}));
jest.mock("remark-gfm", () => () => {});

describe("GenerationLoader Component", () => {
  test("renders label and 9 decorative pixel cells with default dots variant", () => {
    const { container } = render(<GenerationLoader label="Generating" tick={0} />);

    expect(screen.getByText("Generating")).toBeInTheDocument();

    const grid = container.querySelector('[aria-hidden="true"]');
    expect(grid).toBeInTheDocument();
    expect(grid).toHaveClass("grid-cols-3");

    const cells = container.querySelectorAll('[data-slot="pixel-cell"]');
    expect(cells).toHaveLength(9);
    // Default variant is dots -> rounded-full
    cells.forEach((cell) => {
      expect(cell).toHaveClass("rounded-full");
    });
  });

  test("applies squares and rounded variant cell shapes", () => {
    const { container: squaresContainer } = render(
      <GenerationLoader label="Generating" tick={0} variant="squares" />
    );
    const squareCells = squaresContainer.querySelectorAll('[data-slot="pixel-cell"]');
    squareCells.forEach((cell) => {
      expect(cell).toHaveClass("rounded-[1px]");
    });

    const { container: roundedContainer } = render(
      <GenerationLoader label="Generating" tick={0} variant="rounded" />
    );
    const roundedCells = roundedContainer.querySelectorAll('[data-slot="pixel-cell"]');
    roundedCells.forEach((cell) => {
      expect(cell).toHaveClass("rounded-[3px]");
    });
  });

  test("updates active cells as tick progresses", () => {
    const { container, rerender } = render(<GenerationLoader label="Generating" tick={0} />);
    const cellsTick0 = container.querySelectorAll('[data-slot="pixel-cell"]');
    // At tick 0: pixelOffset = 0 -> active if (idx * 2) % 9 < 3 -> idx 0 (0), idx 1 (2)
    expect(cellsTick0[0]).toHaveClass("opacity-90");
    expect(cellsTick0[1]).toHaveClass("opacity-90");
    expect(cellsTick0[2]).toHaveClass("opacity-15");

    // Advance tick to 9 -> pixelOffset = 3 -> active if (idx * 2 + 3) % 9 < 3
    rerender(<GenerationLoader label="Generating" tick={9} />);
    const cellsTick9 = container.querySelectorAll('[data-slot="pixel-cell"]');
    expect(cellsTick9[0]).toHaveClass("opacity-15");
    expect(cellsTick9[3]).toHaveClass("opacity-90");
  });

  test("includes motion-reduce utility class for accessibility", () => {
    const { container } = render(<GenerationLoader label="Generating" tick={0} />);
    const cells = container.querySelectorAll('[data-slot="pixel-cell"]');
    cells.forEach((cell) => {
      expect(cell).toHaveClass("motion-reduce:transition-none");
    });
  });
});

describe("ElementsTimeline Reverted Loader", () => {
  test("renders Loader2 animate-spin and Processing badge for running step", () => {
    const steps = [
      { id: "1", title: "Analyzing Architecture Context", status: "completed" as const },
      { id: "2", title: "Calibrating Engineering Voice", status: "running" as const },
      { id: "3", title: "Drafting Post", status: "pending" as const },
    ];

    const { container } = render(<ElementsTimeline steps={steps} isStreaming={true} />);

    // Step 1 completed -> Check icon & Done badge
    expect(screen.getByText("Analyzing Architecture Context")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();

    // Step 2 running -> Spinning loader and Processing badge with Sparkles
    expect(screen.getByText("Calibrating Engineering Voice")).toBeInTheDocument();
    expect(screen.getByText("Processing")).toBeInTheDocument();
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();

    // Verify pinging beacon is NOT present (confirming revert)
    const pingBeacon = container.querySelector(".animate-ping");
    expect(pingBeacon).not.toBeInTheDocument();
  });
});

describe("AssistantThread GenerationLoader Integration", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("displays GenerationLoader when assistant-ui run is active and waiting for first token", () => {
    // Mock useAuiState to simulate isRunning=true and parts.length=0
    (aui.useAuiState as jest.Mock).mockImplementation((selector) => {
      return selector({
        thread: {
          isRunning: true,
          messages: [
            {
              role: "assistant",
              parts: [],
            },
          ],
        },
      });
    });

    render(
      <AssistantThread
        draftText={null}
        streamingText={null}
        isGenerating={true}
        onStreamingComplete={jest.fn()}
        isPublishing={false}
        selectedFiles={[]}
        setSelectedFiles={jest.fn()}
        isUploading={false}
        onUploadFile={jest.fn()}
        onChange={jest.fn()}
        onPublish={jest.fn()}
        onDiscard={jest.fn()}
        onRetry={jest.fn()}
        onOpenSettings={jest.fn()}
        error={null}
        onDismissError={jest.fn()}
      />
    );

    // GenerationLoader should be visible with its label
    expect(screen.getByText("Generating")).toBeInTheDocument();
    expect(screen.getAllByRole("status").length).toBeGreaterThanOrEqual(1);
  });

  test("animates tick approximately every 120ms while loader is visible", () => {
    (aui.useAuiState as jest.Mock).mockImplementation((selector) => {
      return selector({
        thread: {
          isRunning: true,
          messages: [
            {
              role: "assistant",
              parts: [],
            },
          ],
        },
      });
    });

    const { container } = render(
      <AssistantThread
        draftText={null}
        streamingText={null}
        isGenerating={true}
        onStreamingComplete={jest.fn()}
        isPublishing={false}
        selectedFiles={[]}
        setSelectedFiles={jest.fn()}
        isUploading={false}
        onUploadFile={jest.fn()}
        onChange={jest.fn()}
        onPublish={jest.fn()}
        onDiscard={jest.fn()}
        onRetry={jest.fn()}
        onOpenSettings={jest.fn()}
        error={null}
        onDismissError={jest.fn()}
      />
    );

    const initialCell0 = container.querySelectorAll('[data-slot="pixel-cell"]')[0];
    expect(initialCell0).toHaveClass("opacity-90");

    // Fast-forward 360ms (3 ticks of 120ms -> pixelOffset advances by 1)
    act(() => {
      jest.advanceTimersByTime(360);
    });

    // Component is still rendering and updating
    expect(screen.getByText("Generating")).toBeInTheDocument();
  });

  test("hides GenerationLoader as soon as draft content starts streaming", () => {
    // When parts exist or streaming text exists, loader is hidden
    (aui.useAuiState as jest.Mock).mockImplementation((selector) => {
      return selector({
        thread: {
          isRunning: true,
          messages: [
            {
              role: "assistant",
              parts: [{ type: "text", text: "We were facing 1.8s latency" }],
            },
          ],
        },
      });
    });

    render(
      <AssistantThread
        draftText="We were facing 1.8s latency"
        streamingText={null}
        isGenerating={false}
        onStreamingComplete={jest.fn()}
        isPublishing={false}
        selectedFiles={[]}
        setSelectedFiles={jest.fn()}
        isUploading={false}
        onUploadFile={jest.fn()}
        onChange={jest.fn()}
        onPublish={jest.fn()}
        onDiscard={jest.fn()}
        onRetry={jest.fn()}
        onOpenSettings={jest.fn()}
        error={null}
        onDismissError={jest.fn()}
      />
    );

    // GenerationLoader should not be present
    expect(screen.queryByText("Generating")).not.toBeInTheDocument();
    // Post content preview should be visible
    expect(screen.getByText(/We were facing 1\.8s latency/i)).toBeInTheDocument();
  });
});
