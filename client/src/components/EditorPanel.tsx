import React from "react";

interface EditorPanelProps {
  draftText: string;
  isPublishing: boolean;
  onChange: (value: string) => void;
  onPublish: () => void;
}

export const EditorPanel: React.FC<EditorPanelProps> = ({
  draftText,
  isPublishing,
  onChange,
  onPublish,
}) => {
  const charCount = draftText.length;
  const isOverLimit = charCount > 3000;
  const isNearLimit = charCount > 2800;

  let counterClass = "char-counter";
  if (isOverLimit) counterClass += " error";
  else if (isNearLimit) counterClass += " warning";

  return (
    <div className="form-group" style={{ marginTop: "1rem" }}>
      <label className="form-label" htmlFor="draft-editor">
        Edit Copy
      </label>
      <textarea
        id="draft-editor"
        className="form-textarea"
        style={{ minHeight: "220px" }}
        value={draftText}
        onChange={(e) => onChange(e.target.value)}
        disabled={isPublishing}
      />
      <div className={counterClass}>
        {charCount} / 3000 characters
      </div>
      <button
        className="btn"
        style={{ marginTop: "1rem" }}
        type="button"
        onClick={onPublish}
        disabled={isPublishing || isOverLimit || charCount === 0}
      >
        {isPublishing ? "Publishing..." : "🚀 Publish to LinkedIn"}
      </button>
    </div>
  );
};
