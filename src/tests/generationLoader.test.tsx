/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { GenerationLoader, MatrixLoader } from "@/components/assistant-ui/loading-state";
import { ElementsTimeline } from "@/components/assistant-ui/elements-timeline";
import { AssistantThread } from "@/components/assistant-ui/thread";

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

describe("MatrixLoader and GenerationLoader Components", () => {
  test("renders label and 9 decorative pixel cells with default dots variant", () => {
    const { container } = render(<GenerationLoader label="Generating" tick={0} />);

    expect(screen.getByText("Generating")).toBeInTheDocument();

    const matrix = container.querySelector('[data-slot="matrix-loader"]');
    expect(matrix).toBeInTheDocument();
    expect(matrix).toHaveAttribute("aria-hidden", "true");
    expect(matrix).toHaveClass("grid-cols-3");

    const cells = container.querySelectorAll('[data-slot="pixel-cell"]');
    expect(cells).toHaveLength(9);
    // Default variant is dots -> rounded-full
    cells.forEach((cell) => {
      expect(cell).toHaveClass("rounded-full");
    });
  });

  test("applies squares and rounded variant cell shapes", () => {
    const { container: squaresContainer } = render(
      <MatrixLoader tick={0} variant="squares" />
    );
    const squareCells = squaresContainer.querySelectorAll('[data-slot="pixel-cell"]');
    squareCells.forEach((cell) => {
      expect(cell).toHaveClass("rounded-[1px]");
    });

    const { container: roundedContainer } = render(
      <MatrixLoader tick={0} variant="rounded" />
    );
    const roundedCells = roundedContainer.querySelectorAll('[data-slot="pixel-cell"]');
    roundedCells.forEach((cell) => {
      expect(cell).toHaveClass("rounded-[3px]");
    });
  });

  test("updates active cells as tick progresses", () => {
    const { container, rerender } = render(<MatrixLoader tick={0} />);
    const cellsTick0 = container.querySelectorAll('[data-slot="pixel-cell"]');
    // At tick 0: pixelOffset = 0 -> active if (idx * 2) % 9 < 3 -> idx 0 (0), idx 1 (2)
    expect(cellsTick0[0]).toHaveClass("opacity-90");
    expect(cellsTick0[1]).toHaveClass("opacity-90");
    expect(cellsTick0[2]).toHaveClass("opacity-20");

    // Advance tick to 9 -> pixelOffset = 3 -> active if (idx * 2 + 3) % 9 < 3
    rerender(<MatrixLoader tick={9} />);
    const cellsTick9 = container.querySelectorAll('[data-slot="pixel-cell"]');
    expect(cellsTick9[0]).toHaveClass("opacity-20");
    expect(cellsTick9[3]).toHaveClass("opacity-90");
  });

  test("includes motion-reduce utility class for accessibility", () => {
    const { container } = render(<MatrixLoader tick={0} />);
    const cells = container.querySelectorAll('[data-slot="pixel-cell"]');
    cells.forEach((cell) => {
      expect(cell).toHaveClass("motion-reduce:transition-none");
    });
  });
});

describe("ElementsTimeline Matrix Loader Integration", () => {
  test("renders MatrixLoader beside the node title for running steps", () => {
    const steps = [
      { id: "1", title: "Analyzing Architecture Context", status: "completed" as const },
      { id: "2", title: "Calibrating Engineering Voice", status: "running" as const },
      { id: "3", title: "Drafting Post", status: "pending" as const },
    ];

    const { container } = render(<ElementsTimeline steps={steps} isStreaming={true} />);

    // Step 1 completed -> Check icon & Done badge
    expect(screen.getByText("Analyzing Architecture Context")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();

    // Step 2 running -> MatrixLoader beside the node title, and Processing badge with Sparkles
    expect(screen.getByText("Calibrating Engineering Voice")).toBeInTheDocument();
    expect(screen.getByText("Processing")).toBeInTheDocument();

    // Verify matrix loader is present beside the node title
    const matrixLoader = container.querySelector('[data-slot="matrix-loader"]');
    expect(matrixLoader).toBeInTheDocument();
    expect(matrixLoader?.querySelectorAll('[data-slot="pixel-cell"]')).toHaveLength(9);
  });
});

describe("AssistantThread Workspace Clean State", () => {
  test("keeps post generation container clean without matrix loader in center", () => {
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

    // Main workspace container should show placeholder, NOT the matrix loader
    expect(screen.getByText("Your AI generated draft will appear here...")).toBeInTheDocument();
    expect(container.querySelector('[data-slot="generation-loader"]')).not.toBeInTheDocument();
  });

  test("renders draft preview when draft is provided", () => {
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

    expect(screen.getByText(/We were facing 1\.8s latency/i)).toBeInTheDocument();
  });
});
