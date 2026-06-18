import { useState, useEffect } from "react";
import { fetchTopics, generateDraft, publishPost } from "../lib/api.js";

export function useAgent() {
  const [topics, setTopics] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [context, setContext] = useState("");
  const [dryRun, setDryRun] = useState(true);
  const [draftText, setDraftText] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [postUrl, setPostUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"preview" | "edit">("preview");

  useEffect(() => {
    fetchTopics()
      .then(setTopics)
      .catch((err) => console.error("Error loading topics:", err));
  }, []);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setDraftText(null);
    setPostUrl(null);
    try {
      const topic = selectedTopic || customTopic;
      const data = await generateDraft(topic, context);
      setDraftText(data.draft);
      setThreadId(data.threadId);
      setActiveTab("edit");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!threadId || !draftText) return;
    setIsPublishing(true);
    setError(null);
    try {
      const data = await publishPost(threadId, draftText, dryRun);
      setPostUrl(data.postUrl);
      setDraftText(null);
      setThreadId(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsPublishing(false);
    }
  };

  return {
    topics,
    selectedTopic,
    customTopic,
    context,
    dryRun,
    draftText,
    threadId,
    postUrl,
    isGenerating,
    isPublishing,
    error,
    activeTab,
    setSelectedTopic,
    setCustomTopic,
    setContext,
    setDryRun,
    setDraftText,
    setActiveTab,
    handleGenerate,
    handlePublish,
  };
}
