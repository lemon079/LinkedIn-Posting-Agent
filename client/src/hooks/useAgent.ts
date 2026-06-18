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
  const [activeTab, setActiveTab] = useState<"preview" | "edit">("preview");
  const [status, setStatus] = useState({ gen: false, pub: false, err: null as string | null });

  useEffect(() => {
    fetchTopics().then(setTopics).catch((e) => console.error("Load topics err:", e));
  }, []);

  const handleGenerate = async () => {
    setStatus({ gen: true, pub: false, err: null });
    setDraftText(null);
    setPostUrl(null);
    try {
      const topic = selectedTopic || customTopic;
      const data = await generateDraft(topic, context, dryRun);
      setDraftText(data.draft);
      setThreadId(data.threadId);
      setActiveTab("edit");
    } catch (err: unknown) {
      setStatus(p => ({ ...p, err: err instanceof Error ? err.message : "Unknown error" }));
    } finally {
      setStatus(p => ({ ...p, gen: false }));
    }
  };

  const handlePublish = async () => {
    if (!threadId || !draftText) return;
    setStatus({ gen: false, pub: true, err: null });
    try {
      const data = await publishPost(threadId, draftText, dryRun);
      setPostUrl(data.postUrl);
      setDraftText(null);
      setThreadId(null);
    } catch (err: unknown) {
      setStatus(p => ({ ...p, err: err instanceof Error ? err.message : "Unknown error" }));
    } finally {
      setStatus(p => ({ ...p, pub: false }));
    }
  };

  return {
    topics, selectedTopic, customTopic, context, dryRun, draftText, threadId, postUrl, activeTab,
    isGenerating: status.gen, isPublishing: status.pub, error: status.err,
    setSelectedTopic, setCustomTopic, setContext, setDryRun, setDraftText, setActiveTab,
    handleGenerate, handlePublish,
  };
}
