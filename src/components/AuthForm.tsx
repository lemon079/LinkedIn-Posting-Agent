import React, { useState } from "react";
import { Button } from "./ui/button";
import { Loader2 } from "lucide-react";

interface AuthFormProps {
  onSuccess?: () => void;
}

export const AuthForm: React.FC<AuthFormProps> = () => {
  const [loading, setLoading] = useState(false);

  const handleLinkedInLogin = () => {
    setLoading(true);
    window.location.href = `/api/auth/linkedin?state=login`;
  };

  return (
    <div className="space-y-4 py-2 animate-fade-in-up">
      <div className="text-center space-y-1">
        <h4 className="text-base font-bold text-slate-800">
          Sign In to Dashboard
        </h4>
        <p className="text-xs text-slate-500">
          Sign in with your LinkedIn account to sync your settings securely.
        </p>
      </div>

      <Button
        onClick={handleLinkedInLogin}
        disabled={loading}
        className="w-full bg-[#0a66c2] hover:bg-[#004182] active:bg-[#004182] text-white font-semibold py-5 rounded-xl flex items-center justify-center gap-2 shadow-sm duration-200 cursor-pointer text-sm"
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <>
            <svg className="size-4 shrink-0 fill-current" viewBox="0 0 24 24">
              <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
            </svg>
            Sign In with LinkedIn
          </>
        )}
      </Button>
    </div>
  );
};
