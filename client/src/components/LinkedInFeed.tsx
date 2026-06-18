import React from "react";

interface LinkedInFeedProps {
  draftText: string | null;
}

export const LinkedInFeed: React.FC<LinkedInFeedProps> = ({ draftText }) => {
  if (!draftText) return null;

  return (
    <div className="linkedin-mockup">
      <div className="linkedin-header">
        <div className="linkedin-avatar">LA</div>
        <div className="linkedin-info">
          <h4>LinkedIn Agent</h4>
          <p>Autonomous AI Technical Content Strategist</p>
          <p>1h • 🌐</p>
        </div>
      </div>
      <div className="linkedin-content">{draftText}</div>
      <div className="linkedin-actions">
        <button className="linkedin-action-btn" type="button">
          👍 Like
        </button>
        <button className="linkedin-action-btn" type="button">
          💬 Comment
        </button>
        <button className="linkedin-action-btn" type="button">
          🔁 Repost
        </button>
        <button className="linkedin-action-btn" type="button">
          ✉️ Send
        </button>
      </div>
    </div>
  );
};
