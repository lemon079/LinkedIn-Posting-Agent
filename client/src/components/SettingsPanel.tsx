import React from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface SettingsPanelProps {
  isOpen: boolean; onClose: () => void;
  provider: string; setProvider: (val: string) => void;
  apiKey: string; setApiKey: (val: string) => void;
  liToken: string; setLiToken: (val: string) => void;
  liUrn: string; setLiUrn: (val: string) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen, onClose, provider, setProvider, apiKey, setApiKey, liToken, setLiToken, liUrn, setLiUrn,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm animate-fade-in-up">
      <div className="w-full max-w-md bg-card border-l border-border h-full p-6 flex flex-col justify-between shadow-2xl">
        <div className="space-y-5">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="font-bold text-slate-800 text-base">Self-Hosted Configuration</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer">×</button>
          </div>
          <div className="space-y-4 text-xs">
            <div className="space-y-1">
              <Label className="font-semibold text-slate-600">LLM Provider</Label>
              <select value={provider} onChange={(e) => setProvider(e.target.value)} className="w-full bg-card border border-border text-slate-800 p-2.5 rounded-lg outline-none focus:border-brand-blue">
                <option value="gemini">Google Gemini (Default)</option>
                <option value="openai">OpenAI GPT-4o</option>
                <option value="anthropic">Anthropic Claude</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="font-semibold text-slate-600">Model API Key</Label>
              <input type="password" placeholder="sk-..." value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="w-full bg-card border border-border text-slate-900 p-2.5 rounded-lg outline-none focus:border-brand-blue" />
            </div>
            <div className="space-y-1 border-t border-border pt-3">
              <Label className="font-semibold text-slate-600">LinkedIn Access Token</Label>
              <input type="password" placeholder="AQW..." value={liToken} onChange={(e) => setLiToken(e.target.value)} className="w-full bg-card border border-border text-slate-900 p-2.5 rounded-lg outline-none focus:border-brand-blue" />
            </div>
            <div className="space-y-1">
              <Label className="font-semibold text-slate-600">LinkedIn Person URN</Label>
              <input type="text" placeholder="urn:li:person:..." value={liUrn} onChange={(e) => setLiUrn(e.target.value)} className="w-full bg-card border border-border text-slate-900 p-2.5 rounded-lg outline-none focus:border-brand-blue" />
            </div>
          </div>
        </div>
        <Button onClick={onClose} className="w-full bg-brand-blue hover:bg-brand-blue-hover text-white py-4 rounded-lg font-semibold transition duration-200 shadow-sm cursor-pointer">
          Save and Apply Settings
        </Button>
      </div>
    </div>
  );
};
