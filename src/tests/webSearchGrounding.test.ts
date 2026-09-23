/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import {
  isSearchEligibleArchetype,
  performWebSearch,
  SEARCH_TIMEOUT_MS,
} from "../modules/agent/tools/webSearch";
import { WebSearch } from "../components/assistant-ui/web-search";

describe("Task C: Web Search Grounding & Archetype Gating", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.clearAllMocks();
  });

  describe("1. Server-Side Archetype Gating", () => {
    it("allows search for public fact archetypes (contrarian, framework, comparison)", () => {
      expect(isSearchEligibleArchetype("contrarian")).toBe(true);
      expect(isSearchEligibleArchetype("framework")).toBe(true);
      expect(isSearchEligibleArchetype("comparison")).toBe(true);
    });

    it("gates out personal experience and company-specific archetypes (teardown, breakdown, hiring)", () => {
      expect(isSearchEligibleArchetype("teardown")).toBe(false);
      expect(isSearchEligibleArchetype("breakdown")).toBe(false);
      expect(isSearchEligibleArchetype("hiring")).toBe(false);
    });

    it("handles null, undefined, or empty archetypes safely", () => {
      expect(isSearchEligibleArchetype(null)).toBe(false);
      expect(isSearchEligibleArchetype(undefined)).toBe(false);
      expect(isSearchEligibleArchetype("")).toBe(false);
    });
  });

  describe("2. Backend Search Tool & Fallback Execution", () => {
    it("returns empty results for empty or whitespace query without network call", async () => {
      const mockFetch = jest.fn();
      globalThis.fetch = mockFetch;

      const res = await performWebSearch("   ");
      expect(res).toEqual({ results: [] });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("formats Tavily search results into { results: [{ title, domain }] } with cleaned domains", async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            { title: "Kafka Event Decoupling", url: "https://www.confluent.io/blog/decoupling" },
            { title: "Distributed Consensus in 2026", url: "https://martinfowler.com/articles/consensus.html" },
          ],
        }),
      });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const res = await performWebSearch("Kafka architecture 2026", { apiKey: "test-tavily-key" });
      expect(res.results).toHaveLength(2);
      expect(res.results[0]).toEqual({
        title: "Kafka Event Decoupling",
        domain: "confluent.io",
      });
      expect(res.results[1]).toEqual({
        title: "Distributed Consensus in 2026",
        domain: "martinfowler.com",
      });
    });

    it("handles network failure or API non-200 by proceeding without search results", async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const res = await performWebSearch("Kafka benchmarks", { apiKey: "test-tavily-key" });
      expect(res).toEqual({ results: [] });
    });

    it("has 5-8s timeout fallback budget (configured to 6000ms)", () => {
      expect(SEARCH_TIMEOUT_MS).toBeGreaterThanOrEqual(5000);
      expect(SEARCH_TIMEOUT_MS).toBeLessThanOrEqual(8000);
    });

    it("handles timeout abort gracefully without throwing or blocking", async () => {
      const mockFetch = jest.fn().mockImplementation(() => {
        const error = new Error("The operation was aborted");
        error.name = "AbortError";
        return Promise.reject(error);
      });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const res = await performWebSearch("Postgres latency", { apiKey: "test-tavily-key" });
      expect(res).toEqual({ results: [] });
    });
  });

  describe("3. Official assistant-ui WebSearch Component", () => {
    it("renders query pill, searching shimmer, and does not crash with empty or partial query", () => {
      render(
        <WebSearch
          query=""
          results={[]}
          visibleResults={0}
          searching={true}
          cycle={0}
        />
      );

      expect(screen.getByText("Searching web…")).toBeInTheDocument();
      expect(screen.getByText("Searching…")).toBeInTheDocument();
    });

    it("renders source count and clamps visibleResults safely past the end", () => {
      const results = [
        { title: "Kafka Event Sourcing", domain: "confluent.io" },
        { title: "Microservice Resilience", domain: "martinfowler.com" },
      ];

      render(
        <WebSearch
          query="Kafka patterns"
          results={results}
          visibleResults={99} // Exceeds array length, must clamp to 2
          searching={false}
          cycle={1}
        />
      );

      expect(screen.getByText("Kafka patterns")).toBeInTheDocument();
      expect(screen.getByText("Read 2 sources")).toBeInTheDocument();
      expect(screen.getByText("Kafka Event Sourcing")).toBeInTheDocument();
      expect(screen.getByText("Microservice Resilience")).toBeInTheDocument();
      expect(screen.getByText("confluent.io")).toBeInTheDocument();
      expect(screen.getByText("martinfowler.com")).toBeInTheDocument();
    });

    it("handles negative or NaN visibleResults safely without crashing", () => {
      const results = [
        { title: "Kafka Event Sourcing", domain: "confluent.io" },
      ];

      render(
        <WebSearch
          query="Kafka patterns"
          results={results}
          visibleResults={NaN}
          searching={false}
          cycle={0}
        />
      );

      expect(screen.getByText("Read 1 source")).toBeInTheDocument();
      expect(screen.queryByText("Kafka Event Sourcing")).not.toBeInTheDocument();
    });
  });
});
