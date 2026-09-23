import { defineToolkit } from "@assistant-ui/react";
import { WebSearch, type WebSearchResult } from "./web-search";

export const toolkit = defineToolkit({
  web_search: {
    type: "backend",
    render: ({ args, result, status }) => {
      const searchArgs = (args as { query?: string; skippedReason?: string } | undefined) ?? {};
      const searchResult = result as { results?: WebSearchResult[]; skippedReason?: string } | undefined;
      const resultsList = searchResult?.results ?? [];
      const skippedReason = searchResult?.skippedReason ?? searchArgs?.skippedReason;

      return (
        <WebSearch
          query={searchArgs.query ?? (skippedReason ? "Web search skipped" : "")}
          results={resultsList}
          visibleResults={resultsList.length}
          searching={status?.type === "running"}
          skippedReason={skippedReason}
          cycle={0}
        />
      );
    },
  },
});

export default toolkit;
