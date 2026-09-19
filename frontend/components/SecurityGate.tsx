'use client';

import React, { useState, useEffect } from 'react';
import { Lock, ShieldCheck, KeyRound, Sparkles, AlertCircle } from 'lucide-react';

const DEFAULT_PIN = '2026';

export function SecurityGate({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check session authentication status
    const authStatus = sessionStorage.getItem('sunfi_authenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    const savedPin = localStorage.getItem('sunfi_access_pin') || DEFAULT_PIN;

    if (pinInput.trim() === savedPin) {
      sessionStorage.setItem('sunfi_authenticated', 'true');
      setIsAuthenticated(true);
      setErrorMsg('');
      setPinInput('');
    } else {
      setErrorMsg('Incorrect Passcode PIN. Access Denied!');
      setPinInput('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7FAF9] flex items-center justify-center">
        <div className="h-10 w-10 border-4 border-[#05392E] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F7FAF9] flex items-center justify-center p-4 relative overflow-hidden">
        {/* Ambient Radial Gradient Background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[radial-gradient(circle_at_center,rgba(37,211,102,0.15)_0%,transparent_70%)] blur-3xl pointer-events-none" />
        
        <div className="w-full max-w-md card-3d rounded-3xl p-8 border border-[#05392E]/15 bg-white/95 backdrop-blur shadow-2xl relative z-10 text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-3xl bg-[#05392E] border border-[#03241D] flex items-center justify-center text-white shadow-lg animate-float-subtle">
            <Lock className="h-8 w-8 text-[#25D366]" />
          </div>

          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8F5E9] text-xs font-extrabold text-[#05392E] mb-2 border border-[#05392E]/20">
              <ShieldCheck className="h-3.5 w-3.5 text-[#25D366]" />
              <span>PROTECTED ACCESS</span>
            </div>
            <h1 className="text-2xl font-extrabold text-[#111B21]">SUNFI Intelligence</h1>
            <p className="text-xs font-semibold text-[#667781] mt-1">
              Enter your security Passcode PIN to access private WhatsApp conversations and AI settings.
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="relative">
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#667781]" />
              <input
                type="password"
                placeholder="Enter Access PIN (Default: 2026)"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                maxLength={10}
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-[#E5EAEA] bg-[#F7FAF9] text-center text-lg font-bold tracking-widest text-[#111B21] focus:outline-none focus:border-[#05392E] transition shadow-inner font-digits"
              />
            </div>

            {errorMsg && (
              <div className="flex items-center justify-center gap-1.5 text-xs font-extrabold text-[#D32F2F]">
                <AlertCircle className="h-4 w-4" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn-3d-bright w-full py-3.5 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 shadow-lg"
            >
              <Sparkles className="h-4 w-4 text-[#111B21]" />
              <span>Unlock Command Center</span>
            </button>
          </form>

          <p className="text-[11px] font-semibold text-[#667781] pt-2 border-t border-[#E5EAEA]">
            🔒 All conversations, contacts, and AI keys are encrypted.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
