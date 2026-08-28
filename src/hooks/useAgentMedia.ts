import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { getApiBaseUrl } from "@/lib/api/config";
import { cleanErrorMessage } from "@/lib/utils";
import type { MediaFileMetadata } from "@/modules/media/types";
import type { ErrorWithResponsePayload } from "@/types";

export function useAgentMedia(token: string | null) {
  const [selectedFiles, setSelectedFiles] = useState<MediaFileMetadata[]>([]);
  const [uploadingCount, setUploadingCount] = useState(0);
  const isUploading = uploadingCount > 0;
  const isHydrated = useRef(false);

  // Hydrate files from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    queueMicrotask(() => {
      const savedFiles = localStorage.getItem("praxis_selected_files");
      if (savedFiles) {
        try {
          setSelectedFiles(JSON.parse(savedFiles));
        } catch {}
      }
      isHydrated.current = true;
    });
  }, []);

  // Save selected files changes to localStorage
  useEffect(() => {
    if (typeof window === "undefined" || !isHydrated.current) return;
    if (selectedFiles.length > 0) {
      localStorage.setItem("praxis_selected_files", JSON.stringify(selectedFiles));
    } else {
      localStorage.removeItem("praxis_selected_files");
    }
  }, [selectedFiles]);

  const handleUploadFile = async (
    file: File,
    onError?: (msg: string) => void
  ) => {
    setUploadingCount((prev) => prev + 1);

    try {
      const isImage = file.type.startsWith("image/");
      const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");

      if (!isImage && !isPdf) {
        throw new Error("Unsupported file type. Only images and PDF documents are supported.");
      }

      if (file.size > 20 * 1024 * 1024) {
        throw new Error("File size exceeds 20MB limit.");
      }

      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const signRes = await axios.get(
        `${getApiBaseUrl()}/api/media/upload/sign?filename=${encodeURIComponent(file.name)}&mimeType=${encodeURIComponent(file.type)}`,
        { headers }
      );

      const signData = signRes.data;

      if (signData.localMode) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
        });
        reader.readAsDataURL(file);
        const base64 = await base64Promise;

        setSelectedFiles((prev) => [
          ...prev,
          {
            name: file.name,
            type: file.type,
            base64,
          },
        ]);
        return;
      }

      if (signData.error || !signData.uploadUrl) {
        throw new Error(signData.error || "Failed to generate signed upload URL");
      }

      try {
        await axios.put(signData.uploadUrl, file, {
          headers: {
            "Content-Type": file.type,
          },
        });
      } catch (err: unknown) {
        const axiosError = err as ErrorWithResponsePayload;
        const errText = axiosError.response?.data
          ? String(axiosError.response.data)
          : axiosError.message;
        throw new Error(`Failed to upload file to storage: ${errText}`);
      }

      setSelectedFiles((prev) => [
        ...prev,
        {
          name: file.name,
          type: file.type,
          storagePath: signData.storagePath,
          readUrl: signData.readUrl,
        },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown upload error";
      if (onError) onError(cleanErrorMessage(msg));
    } finally {
      setUploadingCount((prev) => Math.max(0, prev - 1));
    }
  };

  const clearFiles = () => {
    setSelectedFiles([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem("praxis_selected_files");
    }
  };

  return {
    selectedFiles,
    setSelectedFiles,
    isUploading,
    handleUploadFile,
    clearFiles,
  };
}
