import type { DraftVersion } from "@/types";

describe("Phase 9: Draft Version Chain & Hook Lab History Resilience", () => {
  // Helper simulating the core hook swap boundary logic in useAgent.ts
  function applyHookToDraft(current: string, newHook: string): string {
    const doubleBreakIdx = current.indexOf("\n\n");
    let rest = "";
    if (doubleBreakIdx !== -1) {
      rest = current.slice(doubleBreakIdx + 2);
    } else {
      const singleBreakIdx = current.indexOf("\n");
      if (singleBreakIdx !== -1) {
        rest = current.slice(singleBreakIdx + 1);
      }
    }
    return rest ? `${newHook.trim()}\n\n${rest.trimStart()}` : newHook.trim();
  }

  // Helper simulating the linear history truncation version reducer in useAgent.ts
  function addDraftVersionReducer(
    prev: DraftVersion[],
    activeVersionIndex: number,
    text: string,
    changeNote?: string
  ): { nextVersions: DraftVersion[]; nextActiveIndex: number } {
    const validIndex =
      activeVersionIndex >= 0 && activeVersionIndex < prev.length
        ? activeVersionIndex
        : prev.length - 1;
    const baseHistory = prev.slice(0, validIndex + 1);

    if (baseHistory.length > 0 && baseHistory[baseHistory.length - 1].draft.trim() === text.trim()) {
      return { nextVersions: prev, nextActiveIndex: validIndex };
    }

    const nextVersionNumber = baseHistory.length + 1;
    const newVersion: DraftVersion = {
      id: `v${nextVersionNumber}-${Date.now()}`,
      versionNumber: nextVersionNumber,
      draft: text,
      label: `v${nextVersionNumber}`,
      changeNote: changeNote || (nextVersionNumber === 1 ? "Initial Draft" : "Refined Draft"),
      timestamp: Date.now(),
    };

    const nextVersions = [...baseHistory, newVersion];
    return { nextVersions, nextActiveIndex: nextVersions.length - 1 };
  }

  describe("1. Hook Scope Replacement Integrity", () => {
    test("replaces strictly the opening hook lines before first double-newline and preserves rest of draft body", () => {
      const originalDraft = `Most microservices architectures are just distributed monoliths in disguise.

Here are the 3 architectural rules we enforced after our 2024 outage:
1. Zero cross-service synchronous transactions
2. Event-driven eventual consistency with dead-letter queues
3. Strict 100ms circuit breakers on all external RPCs

The result? Our 99.99% uptime target was hit for 4 consecutive quarters.

#SoftwareEngineering #Architecture #SystemDesign`;

      const newHook = `We reduced system outages by 87% after ditching synchronous microservices.`;

      const updatedDraft = applyHookToDraft(originalDraft, newHook);

      // Verify the new opening hook is applied
      expect(updatedDraft.startsWith(newHook)).toBe(true);

      // Verify the body after the first double-newline is 100% byte-for-byte identical
      const expectedRest = originalDraft.slice(originalDraft.indexOf("\n\n") + 2);
      expect(updatedDraft).toBe(`${newHook}\n\n${expectedRest}`);

      // Verify specific body invariants
      expect(updatedDraft).toContain("Here are the 3 architectural rules we enforced");
      expect(updatedDraft).toContain("3. Strict 100ms circuit breakers on all external RPCs");
      expect(updatedDraft).toContain("#SoftwareEngineering #Architecture #SystemDesign");
    });

    test("handles drafts with only single linebreaks gracefully", () => {
      const singleLineDraft = "First line hook\nSecond line explanation\nThird line conclusion";
      const newHook = "Brand new punchy hook";

      const updated = applyHookToDraft(singleLineDraft, newHook);
      expect(updated).toBe("Brand new punchy hook\n\nSecond line explanation\nThird line conclusion");
    });

    test("handles single-line drafts with no linebreaks cleanly without orphan breaks", () => {
      const oneLiner = "Old standalone hook line.";
      const newHook = "New punchy single line.";

      const updated = applyHookToDraft(oneLiner, newHook);
      expect(updated).toBe("New punchy single line.");
    });
  });

  describe("2. Linear History Truncation (Branching vs Forward Discard)", () => {
    test("applying a hook on the latest version appends sequentially", () => {
      const v1: DraftVersion = {
        id: "v1",
        versionNumber: 1,
        draft: "Initial draft hook.\n\nBody text.",
        label: "v1",
        changeNote: "Initial Draft",
        timestamp: 1000,
      };

      const history = [v1];
      const activeIdx = 0;

      const { nextVersions, nextActiveIndex } = addDraftVersionReducer(
        history,
        activeIdx,
        "Second draft hook.\n\nBody text.",
        "Swapped Hook via Hook Lab"
      );

      expect(nextVersions).toHaveLength(2);
      expect(nextVersions[1].versionNumber).toBe(2);
      expect(nextVersions[1].changeNote).toBe("Swapped Hook via Hook Lab");
      expect(nextActiveIndex).toBe(1);
    });

    test("navigating back to v2 from v4 and applying a hook discards forward history (v3, v4) and branches cleanly", () => {
      const v1: DraftVersion = {
        id: "v1",
        versionNumber: 1,
        draft: "v1 text",
        label: "v1",
        changeNote: "Initial Draft",
        timestamp: 1000,
      };
      const v2: DraftVersion = {
        id: "v2",
        versionNumber: 2,
        draft: "v2 text with initial refinement",
        label: "v2",
        changeNote: "Refined Draft",
        timestamp: 2000,
      };
      const v3: DraftVersion = {
        id: "v3",
        versionNumber: 3,
        draft: "v3 text with hook A",
        label: "v3",
        changeNote: "Swapped Hook via Hook Lab",
        timestamp: 3000,
      };
      const v4: DraftVersion = {
        id: "v4",
        versionNumber: 4,
        draft: "v4 text with tone change",
        label: "v4",
        changeNote: "Changed tone",
        timestamp: 4000,
      };

      const history = [v1, v2, v3, v4];

      // User steps back via Undo to v2 (activeVersionIndex = 1)
      const userActiveIndex = 1;

      // User now applies a different hook on v2's text
      const newV2HookedText = "v2 text with contrarian hook";
      const { nextVersions, nextActiveIndex } = addDraftVersionReducer(
        history,
        userActiveIndex,
        newV2HookedText,
        "Swapped Hook via Hook Lab"
      );

      // Expected: v3 and v4 are truncated, new version is versionNumber 3, length is 3
      expect(nextVersions).toHaveLength(3);
      expect(nextVersions[0].id).toBe("v1");
      expect(nextVersions[1].id).toBe("v2");
      expect(nextVersions[2].versionNumber).toBe(3);
      expect(nextVersions[2].draft).toBe(newV2HookedText);
      expect(nextVersions[2].changeNote).toBe("Swapped Hook via Hook Lab");

      // Active index moves to the newly appended branch tip
      expect(nextActiveIndex).toBe(2);

      // An undo from here would step directly back to v2 (index 1)
      const previousVersion = nextVersions[nextActiveIndex - 1];
      expect(previousVersion.id).toBe("v2");
      expect(previousVersion.draft).toBe("v2 text with initial refinement");
    });

    test("does not add duplicate version if text is identical to current branch tip", () => {
      const v1: DraftVersion = {
        id: "v1",
        versionNumber: 1,
        draft: "Identical post text",
        label: "v1",
        changeNote: "Initial Draft",
        timestamp: 1000,
      };

      const { nextVersions, nextActiveIndex } = addDraftVersionReducer(
        [v1],
        0,
        "  Identical post text  \n",
        "Redundant edit"
      );

      expect(nextVersions).toHaveLength(1);
      expect(nextActiveIndex).toBe(0);
    });
  });
});
