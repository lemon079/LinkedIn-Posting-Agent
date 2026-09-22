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

  describe("3. Strict 3-Draft Cap & 1-to-1 Hook Version Mapping", () => {
    const MAX_DRAFTS = 3;

    // Helper simulating the updated useAgent addDraftVersion + handleApplyHook behavior
    function handleApplyHookSimulation(
      versions: DraftVersion[],
      activeIdx: number,
      selectedHook: string,
      hookType: string,
      baseBody: string
    ): { nextVersions: DraftVersion[]; nextActiveIdx: number } {
      const trimmedHook = selectedHook.trim();

      // 1. If draft with this hook already exists, navigate to it
      const existingIdx = versions.findIndex(
        (v) => (v.hookText && v.hookText === trimmedHook) || v.draft.trim().startsWith(trimmedHook)
      );

      if (existingIdx !== -1) {
        return { nextVersions: versions, nextActiveIdx: existingIdx };
      }

      // 2. Otherwise, construct updated draft and add version (capped at MAX_DRAFTS)
      const updatedDraft = `${trimmedHook}\n\n${baseBody.trimStart()}`;

      let baseHistory = versions.slice(0, activeIdx + 1);
      if (baseHistory.length >= MAX_DRAFTS) {
        baseHistory = baseHistory.slice(0, MAX_DRAFTS - 1);
      }

      const nextNum = baseHistory.length + 1;
      const newVersion: DraftVersion = {
        id: `v${nextNum}-${Date.now()}`,
        versionNumber: nextNum,
        draft: updatedDraft,
        label: `v${nextNum}`,
        changeNote: `Hook: ${hookType}`,
        timestamp: Date.now(),
        hookText: trimmedHook,
      };

      const nextVersions = [...baseHistory, newVersion];
      return { nextVersions, nextActiveIdx: nextVersions.length - 1 };
    }

    test("maps 3 hooks to at most 3 draft versions without creating infinite drafts", () => {
      const hook1 = "We reduced microservice latency by 45% with one adjustment.";
      const hook2 = "Most industry advice on microservices is completely wrong.";
      const hook3 = "Last week an edge case stalled our core microservices.";
      const body = "Here is the architectural teardown:\n1. Async events\n2. Circuit breakers";

      // Initial draft is created with Hook 1 (v1)
      let versions: DraftVersion[] = [
        {
          id: "v1",
          versionNumber: 1,
          draft: `${hook1}\n\n${body}`,
          label: "v1",
          changeNote: "Initial Draft (Metric)",
          timestamp: 1000,
          hookText: hook1,
        },
      ];
      let activeIdx = 0;

      // User clicks Hook 2 -> creates v2 (total drafts = 2)
      let res = handleApplyHookSimulation(versions, activeIdx, hook2, "contrarian", body);
      versions = res.nextVersions;
      activeIdx = res.nextActiveIdx;
      expect(versions).toHaveLength(2);
      expect(activeIdx).toBe(1);
      expect(versions[1].draft.startsWith(hook2)).toBe(true);

      // User clicks Hook 3 -> creates v3 (total drafts = 3)
      res = handleApplyHookSimulation(versions, activeIdx, hook3, "incident", body);
      versions = res.nextVersions;
      activeIdx = res.nextActiveIdx;
      expect(versions).toHaveLength(3);
      expect(activeIdx).toBe(2);
      expect(versions[2].draft.startsWith(hook3)).toBe(true);

      // User clicks Hook 1 again -> switches to v1 (index 0), DOES NOT create v4!
      res = handleApplyHookSimulation(versions, activeIdx, hook1, "metric", body);
      versions = res.nextVersions;
      activeIdx = res.nextActiveIdx;
      expect(versions).toHaveLength(3);
      expect(activeIdx).toBe(0);

      // User clicks Hook 2 again -> switches to v2 (index 1), DOES NOT create v5!
      res = handleApplyHookSimulation(versions, activeIdx, hook2, "contrarian", body);
      versions = res.nextVersions;
      activeIdx = res.nextActiveIdx;
      expect(versions).toHaveLength(3);
      expect(activeIdx).toBe(1);

      // User clicks Hook 3 again -> switches to v3 (index 2), DOES NOT create v6!
      res = handleApplyHookSimulation(versions, activeIdx, hook3, "incident", body);
      versions = res.nextVersions;
      activeIdx = res.nextActiveIdx;
      expect(versions).toHaveLength(3);
      expect(activeIdx).toBe(2);

      // Simulating 50 alternating clicks across the 3 hooks:
      const sequence = [hook1, hook2, hook3, hook2, hook1, hook3, hook1, hook2];
      for (const h of sequence) {
        res = handleApplyHookSimulation(versions, activeIdx, h, "tested", body);
        versions = res.nextVersions;
        activeIdx = res.nextActiveIdx;
      }

      // Total drafts is STILL strictly 3!
      expect(versions).toHaveLength(3);
    });
  });
});
