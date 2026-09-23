import { defineToolkit } from "@assistant-ui/react";
import { WebSearch, type WebSearchResult } from "./web-search";

export const toolkit = defineToolkit({
  web_search: {
    type: "backend",
    render: ({ args, result, status }) => {
      const searchArgs = (args as { query?: string } | undefined) ?? {};
      const searchResult = result as { results?: WebSearchResult[] } | undefined;
      const resultsList = searchResult?.results ?? [];

      return (
        <WebSearch
          query={searchArgs.query ?? ""}
          results={resultsList}
          visibleResults={resultsList.length}
          searching={status?.type === "running"}
          cycle={0}
        />
      );
    },
  },
});

export default toolkit;
