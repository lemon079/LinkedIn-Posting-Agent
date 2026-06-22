import React, { useState } from "react";
import { supabase } from "../lib/supabase.js";
import { Button } from "./ui/button.js";
import { Label } from "./ui/label.js";
import { Mail, Lock, Loader2, LogIn, UserPlus } from "lucide-react";

interface AuthFormProps {
  onSuccess: () => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!supabase) {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl">
        Supabase is not configured on the client. Login features are unavailable.
      </div>
    );
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onSuccess();
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setSuccessMsg("Registration successful! Check your email for confirmation.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An authentication error occurred.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 py-2 animate-fade-in-up">
      <div className="text-center space-y-1">
        <h4 className="text-base font-bold text-slate-800">
          {isLogin ? "Sign In to Agent Portal" : "Create Developer Account"}
        </h4>
        <p className="text-xs text-slate-500">
          {isLogin ? "Access and sync your settings securely across devices" : "Register with your email to configure custom settings"}
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-800 rounded-xl font-medium">
          ⚠️ {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 rounded-xl font-medium">
          ✓ {successMsg}
        </div>
      )}

      <form onSubmit={handleAuth} className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-700">Email Address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3.5 size-4 text-slate-400" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@domain.com"
              className="w-full bg-card border border-border text-slate-900 pl-10 pr-4 py-3 rounded-xl focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 outline-none transition placeholder-slate-400 text-base md:text-sm"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-700">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3.5 size-4 text-slate-400" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-card border border-border text-slate-900 pl-10 pr-4 py-3 rounded-xl focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 outline-none transition placeholder-slate-400 text-base md:text-sm"
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-blue hover:bg-brand-blue-hover text-white font-semibold py-5 rounded-xl flex items-center justify-center gap-2 shadow-sm duration-200"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : isLogin ? (
            <><LogIn className="size-4" /> Sign In</>
          ) : (
            <><UserPlus className="size-4" /> Sign Up</>
          )}
        </Button>
      </form>

      <div className="text-center pt-2">
        <button
          type="button"
          onClick={() => {
            setIsLogin(!isLogin);
            setErrorMsg(null);
            setSuccessMsg(null);
          }}
          className="text-xs text-brand-blue hover:underline font-semibold cursor-pointer"
        >
          {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
        </button>
      </div>
    </div>
  );
};
