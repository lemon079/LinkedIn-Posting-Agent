import { useState, useEffect } from "react";
import { fetchTopics, generateDraft, publishPost, generateImage } from "../lib/api.js";

export function useAgent() {
  const [topics, setTopics] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [context, setContext] = useState("");
  const [dryRun, setDryRun] = useState(true);
  const [draftText, setDraftText] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [postUrl, setPostUrl] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"preview" | "edit">("preview");
  const [status, setStatus] = useState({ gen: false, pub: false, img: false, err: null as string | null });

  // Self-hosted configurations
  const [provider, setProvider] = useState(() => localStorage.getItem("llm_provider") || "gemini");
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("llm_api_key") || "");
  const [liToken, setLiToken] = useState(() => localStorage.getItem("li_token") || "");
  const [liUrn, setLiUrn] = useState(() => localStorage.getItem("li_urn") || "");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    fetchTopics().then(setTopics).catch((e) => console.error("Load topics err:", e));
  }, []);

  useEffect(() => {
    localStorage.setItem("llm_provider", provider);
    localStorage.setItem("llm_api_key", apiKey);
    localStorage.setItem("li_token", liToken);
    localStorage.setItem("li_urn", liUrn);
  }, [provider, apiKey, liToken, liUrn]);

  const customKeys = { provider, apiKey, liToken, liUrn };

  const handleGenerate = async () => {
    setStatus({ gen: true, pub: false, img: false, err: null });
    setDraftText(null); setPostUrl(null); setImageUrl(null);
    try {
      const topic = selectedTopic || customTopic;
      const data = await generateDraft(topic, context, dryRun, customKeys);
      setDraftText(data.draft); setThreadId(data.threadId); setActiveTab("edit");
    } catch (err: unknown) {
      setStatus(p => ({ ...p, err: err instanceof Error ? err.message : "Unknown error" }));
    } finally {
      setStatus(p => ({ ...p, gen: false }));
    }
  };

  const handlePublish = async () => {
    if (!threadId || !draftText) return;
    setStatus({ gen: false, pub: true, img: false, err: null });
    try {
      const data = await publishPost(threadId, draftText, dryRun, customKeys);
      setPostUrl(data.postUrl); setDraftText(null); setThreadId(null);
    } catch (err: unknown) {
      setStatus(p => ({ ...p, err: err instanceof Error ? err.message : "Unknown error" }));
    } finally {
      setStatus(p => ({ ...p, pub: false }));
    }
  };

  const handleGenerateImage = async () => {
    if (!draftText) return;
    setStatus(p => ({ ...p, img: true, err: null }));
    try {
      const data = await generateImage(draftText, customKeys);
      setImageUrl(data.imageUrl);
    } catch (err: unknown) {
      setStatus(p => ({ ...p, err: err instanceof Error ? err.message : "Image generation failed" }));
    } finally {
      setStatus(p => ({ ...p, img: false }));
    }
  };

  return {
    topics, selectedTopic, customTopic, context, dryRun, draftText, threadId, postUrl, activeTab, imageUrl,
    isGenerating: status.gen, isPublishing: status.pub, isGeneratingImage: status.img, error: status.err,
    provider, apiKey, liToken, liUrn, isSettingsOpen,
    setSelectedTopic, setCustomTopic, setContext, setDryRun, setDraftText, setActiveTab, setImageUrl,
    setProvider, setApiKey, setLiToken, setLiUrn, setIsSettingsOpen,
    handleGenerate, handlePublish, handleGenerateImage,
  };
}
